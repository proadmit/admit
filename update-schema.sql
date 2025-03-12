-- Disable the extension temporarily
DROP EXTENSION IF EXISTS pg_stat_statements;

-- Create supplemental_essays table if it doesn't exist
CREATE TABLE IF NOT EXISTS supplemental_essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    prompt TEXT NOT NULL,
    content TEXT NOT NULL,
    word_limit INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Update timestamp columns to use timestamp with time zone
ALTER TABLE users
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE subscriptions
ALTER COLUMN cancel_at TYPE TIMESTAMP WITH TIME ZONE USING COALESCE(cancel_at, NOW()) AT TIME ZONE 'UTC',
ALTER COLUMN canceled_at TYPE TIMESTAMP WITH TIME ZONE USING COALESCE(canceled_at, NOW()) AT TIME ZONE 'UTC',
ALTER COLUMN current_period_start TYPE TIMESTAMP WITH TIME ZONE USING COALESCE(current_period_start, NOW()) AT TIME ZONE 'UTC',
ALTER COLUMN current_period_end TYPE TIMESTAMP WITH TIME ZONE USING COALESCE(current_period_end, NOW()) AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING COALESCE(created_at, NOW()) AT TIME ZONE 'UTC',
ALTER COLUMN ended_at TYPE TIMESTAMP WITH TIME ZONE USING COALESCE(ended_at, NOW()) AT TIME ZONE 'UTC',
ALTER COLUMN trial_start TYPE TIMESTAMP WITH TIME ZONE USING COALESCE(trial_start, NOW()) AT TIME ZONE 'UTC',
ALTER COLUMN trial_end TYPE TIMESTAMP WITH TIME ZONE USING COALESCE(trial_end, NOW()) AT TIME ZONE 'UTC';

-- Add stripe_subscription_id column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
    END IF;
END $$;

-- Re-enable the extension if needed
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; 