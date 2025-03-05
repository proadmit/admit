ALTER TABLE "subscriptions" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id";