-- Drop existing tables if they exist
DROP TABLE IF EXISTS college_list CASCADE;
DROP TABLE IF EXISTS extracurricular_activities CASCADE;
DROP TABLE IF EXISTS personal_statements CASCADE;
DROP TABLE IF EXISTS recommendation_letters CASCADE;
DROP TABLE IF EXISTS supplemental_essays CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table first (as it's referenced by others)
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id text NOT NULL UNIQUE,
    name text NOT NULL,
    surname text NOT NULL,
    gender text NOT NULL,
    country text NOT NULL,
    major text NOT NULL,
    achievements text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
    id text PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    status text,
    price_id text,
    quantity integer,
    cancel_at_period_end boolean,
    cancel_at timestamp,
    canceled_at timestamp,
    current_period_start timestamp,
    current_period_end timestamp,
    created_at timestamp DEFAULT now(),
    ended_at timestamp,
    trial_start timestamp,
    trial_end timestamp
);

-- Create other tables
CREATE TABLE personal_statements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    content text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE supplemental_essays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    prompt text NOT NULL,
    content text NOT NULL,
    word_limit integer,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE recommendation_letters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    teacher_name text NOT NULL,
    teacher_email text NOT NULL,
    subject text NOT NULL,
    relationship text NOT NULL,
    status text NOT NULL,
    content text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE extracurricular_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    name text NOT NULL,
    role text NOT NULL,
    organization text NOT NULL,
    start_date timestamp NOT NULL,
    end_date timestamp,
    description text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE college_list (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id),
    college_name text,
    status text,
    deadline timestamp,
    notes text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp
); 