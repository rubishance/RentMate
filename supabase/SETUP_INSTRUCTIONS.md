# Supabase Storage Setup for Contracts

## Create Storage Bucket

Run this SQL in your Supabase SQL Editor:

```sql
-- Create contracts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true);

-- Allow authenticated users to upload contracts
CREATE POLICY "Users can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contracts');

-- Allow authenticated users to read their own contracts
CREATE POLICY "Users can read contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contracts');

-- Allow authenticated users to delete their own contracts
CREATE POLICY "Users can delete contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contracts');
```

## Set OpenAI API Key

1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Add secret: `OPENAI_API_KEY` with your OpenAI API key

## Deploy Edge Function

```bash
supabase functions deploy analyze-contract
```

## Test the Function

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-contract' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"images":["data:image/jpeg;base64,..."]}'
```
