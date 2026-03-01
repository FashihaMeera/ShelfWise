-- Migration: Add new features (Book Renewal, Member Suspension, Payments, Email Logs)

-- 1. Add columns to profiles table for member suspension
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;

-- 2. Add columns to borrowings table for book renewal tracking
ALTER TABLE borrowings ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;
ALTER TABLE borrowings ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMP WITH TIME ZONE;

-- 3. Add columns to fines table for payment tracking
ALTER TABLE fines ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS payment_method VARCHAR;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS waived_at TIMESTAMP WITH TIME ZONE;

-- 4. Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR NOT NULL,
    recipient_name VARCHAR,
    subject VARCHAR NOT NULL,
    email_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'sent',
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    email_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- 5. Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fine_id UUID NOT NULL REFERENCES fines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR,
    stripe_payment_intent VARCHAR UNIQUE,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_fine_id ON payments(fine_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_intent);

-- 6. Create book_analytics view for analytics queries
CREATE OR REPLACE VIEW book_analytics AS
SELECT 
    b.id,
    b.title,
    b.author,
    b.genre,
    COUNT(DISTINCT br.id) as total_borrows,
    COUNT(DISTINCT CASE WHEN br.returned_at IS NOT NULL THEN br.id END) as completed_borrows,
    AVG(CASE WHEN br.returned_at IS NOT NULL THEN EXTRACT(DAY FROM br.returned_at - br.borrowed_at) END) as avg_borrow_days,
    COUNT(DISTINCT CASE WHEN DATE(br.borrowed_at) >= CURRENT_DATE - INTERVAL '30 days' THEN br.id END) as borrows_last_30_days,
    ROUND(AVG(CAST(rev.rating AS NUMERIC)), 2) as avg_rating,
    COUNT(DISTINCT rev.id) as review_count
FROM books b
LEFT JOIN borrowings br ON b.id = br.book_id
LEFT JOIN book_reviews rev ON b.id = rev.book_id
GROUP BY b.id, b.title, b.author, b.genre;

-- 7. Create member_reading_analytics view
CREATE OR REPLACE VIEW member_reading_analytics AS
SELECT 
    p.id,
    p.full_name,
    COUNT(DISTINCT b.id) as total_books_borrowed,
    COUNT(DISTINCT CASE WHEN br.returned_at IS NOT NULL THEN b.id END) as books_returned,
    COUNT(DISTINCT CASE WHEN br.returned_at IS NULL THEN b.id END) as books_currently_borrowed,
    COUNT(DISTINCT CASE WHEN DATE(br.borrowed_at) >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END) as books_borrowed_last_30_days,
    ROUND(AVG(CAST(rev.rating AS NUMERIC)), 2) as avg_books_rating,
    COUNT(DISTINCT rev.id) as books_reviewed
FROM profiles p
LEFT JOIN borrowings br ON p.id = br.user_id
LEFT JOIN books b ON br.book_id = b.id
LEFT JOIN book_reviews rev ON p.id = rev.user_id
GROUP BY p.id, p.full_name;

-- 8. Add RLS policy for suspended members (if using RLS)
-- Suspended members should have limited access
-- This is handled in the application logic

-- 9. Create trigger to auto-suspend members with persistent unpaid fines
CREATE OR REPLACE FUNCTION auto_suspend_member()
RETURNS TRIGGER AS $$
BEGIN
    -- If a member has more than 3 unpaid fines, suspend them
    IF (SELECT COUNT(*) FROM fines WHERE user_id = NEW.user_id AND paid = FALSE) > 3 THEN
        UPDATE profiles SET is_suspended = TRUE, suspension_reason = 'Multiple unpaid fines', suspended_at = NOW()
        WHERE id = NEW.user_id AND is_suspended = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_suspend_member
AFTER INSERT ON fines
FOR EACH ROW
EXECUTE FUNCTION auto_suspend_member();
