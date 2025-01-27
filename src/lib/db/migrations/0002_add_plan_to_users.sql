-- Add plan column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

-- Update existing users to have their plan match their subscription
UPDATE users 
SET plan = CASE 
    WHEN EXISTS (
        SELECT 1 
        FROM subscriptions 
        WHERE subscriptions.user_id = users.id 
        AND subscriptions.status = 'active' 
        AND subscriptions.price_id = 'price_yearly_test'
    ) THEN 'yearly'
    WHEN EXISTS (
        SELECT 1 
        FROM subscriptions 
        WHERE subscriptions.user_id = users.id 
        AND subscriptions.status = 'active' 
        AND subscriptions.price_id = 'price_monthly_test'
    ) THEN 'monthly'
    ELSE 'free'
END; 