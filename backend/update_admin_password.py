import asyncio
from sqlalchemy import text
from app.database import engine

async def update_admin_password():
    new_hash = "$2b$12$kRmZ60g1pum6eF.DU8KjDeXYtJOKLCLMnu63YDvKkpxwpQkCxWnAi"
    async with engine.begin() as conn:
        result = await conn.execute(
            text("UPDATE users SET hashed_password = :hash WHERE email = :email"),
            {"hash": new_hash, "email": "admin@shelfwise.com"}
        )
        print(f"✓ Password updated successfully for admin@shelfwise.com")
        print(f"  Rows affected: {result.rowcount}")
        print(f"\nYou can now login with:")
        print(f"  Email: admin@shelfwise.com")
        print(f"  Password: admin123")

if __name__ == "__main__":
    asyncio.run(update_admin_password())
