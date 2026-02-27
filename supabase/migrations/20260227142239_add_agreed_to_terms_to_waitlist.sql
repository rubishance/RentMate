-- Add agreed_to_terms to waitlist table
ALTER TABLE waitlist
ADD COLUMN agreed_to_terms BOOLEAN NOT NULL DEFAULT false;
