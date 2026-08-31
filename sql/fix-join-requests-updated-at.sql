-- Add updated_at column to organisation_join_requests table
-- This column is referenced by the approve_join_request RPC function

ALTER TABLE public.organisation_join_requests 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have updated_at = created_at
UPDATE public.organisation_join_requests 
SET updated_at = created_at 
WHERE updated_at IS NULL;
