from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal

from app.database import get_db
from app.models import Fine, Payment, Profile
from app.schemas import PaymentCreate, PaymentResponse, FineWithPayments
from app.auth.dependencies import get_current_user
from app.config import get_settings
import os
import json

router = APIRouter(prefix="/api/payments", tags=["payments"])
settings = get_settings()

# Stripe integration (optional - install with: pip install stripe)
try:
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_ENABLED = bool(stripe.api_key)
except ImportError:
    STRIPE_ENABLED = False


@router.get("/fines", response_model=list[FineWithPayments])
async def get_user_fines(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all unpaid fines for the current user"""
    result = await db.execute(
        select(Fine).where(
            Fine.user_id == UUID(current_user["id"]),
            Fine.paid == False,
            Fine.waived == False
        ).order_by(Fine.created_at.desc())
    )
    fines = result.scalars().all()

    response = []
    for fine in fines:
        # Get payments for this fine
        payment_result = await db.execute(
            select(Payment).where(Payment.fine_id == fine.id)
        )
        payments = payment_result.scalars().all()

        response.append(FineWithPayments(
            id=fine.id,
            borrowing_id=fine.borrowing_id,
            user_id=fine.user_id,
            amount=float(fine.amount),
            paid=fine.paid,
            paid_at=fine.paid_at,
            payment_method=fine.payment_method,
            waived=fine.waived,
            waived_at=fine.waived_at,
            created_at=fine.created_at,
            payments=[
                PaymentResponse(
                    id=p.id,
                    fine_id=p.fine_id,
                    user_id=p.user_id,
                    amount=float(p.amount),
                    payment_method=p.payment_method,
                    status=p.status,
                    created_at=p.created_at,
                    completed_at=p.completed_at
                )
                for p in payments
            ]
        ))

    return response


@router.post("/{fine_id}/stripe-intent")
async def create_stripe_payment_intent(
    fine_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a Stripe payment intent for paying a fine"""
    if not STRIPE_ENABLED:
        raise HTTPException(status_code=400, detail="Stripe not configured")

    # Fetch fine
    result = await db.execute(select(Fine).where(Fine.id == fine_id))
    fine = result.scalar_one_or_none()

    if not fine:
        raise HTTPException(status_code=404, detail="Fine not found")

    if str(fine.user_id) != current_user["id"] and current_user["role"] == "member":
        raise HTTPException(status_code=403, detail="Not allowed")

    if fine.paid or fine.waived:
        raise HTTPException(status_code=400, detail="Fine already paid or waived")

    try:
        # Get user info
        user_result = await db.execute(
            select(Profile).where(Profile.id == fine.user_id)
        )
        user = user_result.scalar_one_or_none()

        # Create Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(float(fine.amount) * 100),  # Convert to cents
            currency="usd",
            description=f"Library fine payment for user {user.full_name}",
            metadata={
                "fine_id": str(fine_id),
                "user_id": str(fine.user_id),
            }
        )

        # Create payment record
        payment = Payment(
            fine_id=fine_id,
            user_id=fine.user_id,
            amount=fine.amount,
            payment_method="stripe",
            stripe_payment_intent=intent.id,
            status="pending"
        )
        db.add(payment)
        await db.commit()

        return {
            "client_secret": intent.client_secret,
            "payment_id": str(payment.id),
            "amount": float(fine.amount)
        }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


@router.post("/{payment_id}/confirm-stripe")
async def confirm_stripe_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Confirm a Stripe payment and mark fine as paid"""
    if not STRIPE_ENABLED:
        raise HTTPException(status_code=400, detail="Stripe not configured")

    # Fetch payment
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    try:
        # Verify payment with Stripe
        intent = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent)

        if intent.status == "succeeded":
            # Mark fine as paid
            fine_result = await db.execute(
                select(Fine).where(Fine.id == payment.fine_id)
            )
            fine = fine_result.scalar_one_or_none()

            fine.paid = True
            fine.paid_at = datetime.now(timezone.utc)
            fine.payment_method = "stripe"

            payment.status = "completed"
            payment.completed_at = datetime.now(timezone.utc)

            await db.commit()

            return {
                "status": "success",
                "message": "Fine paid successfully",
                "fine_id": str(fine.id)
            }
        else:
            return {
                "status": "pending",
                "message": f"Payment still pending: {intent.status}"
            }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


@router.post("/{fine_id}/cash-payment")
async def record_cash_payment(
    fine_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Record a cash/check payment for a fine (admin/librarian only)"""
    if current_user["role"] not in ["admin", "librarian"]:
        raise HTTPException(status_code=403, detail="Only staff can record cash payments")

    # Fetch fine
    result = await db.execute(select(Fine).where(Fine.id == fine_id))
    fine = result.scalar_one_or_none()

    if not fine:
        raise HTTPException(status_code=404, detail="Fine not found")

    if fine.paid or fine.waived:
        raise HTTPException(status_code=400, detail="Fine already paid or waived")

    # Mark fine as paid
    fine.paid = True
    fine.paid_at = datetime.now(timezone.utc)
    fine.payment_method = "cash"

    # Create payment record
    payment = Payment(
        fine_id=fine_id,
        user_id=fine.user_id,
        amount=fine.amount,
        payment_method="cash",
        status="completed",
        completed_at=datetime.now(timezone.utc)
    )
    db.add(payment)
    await db.commit()

    return {
        "status": "success",
        "message": "Cash payment recorded",
        "fine_id": str(fine_id)
    }
