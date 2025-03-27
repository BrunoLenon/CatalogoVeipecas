-- Add new columns to custom table
ALTER TABLE custom
ADD COLUMN IF NOT EXISTS favicon_url text CHECK (
  favicon_url IS NULL OR 
  favicon_url ~* '^https?://[^\s/$.?#].[^\s]*$'
),
ADD COLUMN IF NOT EXISTS site_title text;

-- Update existing row with default values if needed
UPDATE custom
SET 
  site_title = name,
  favicon_url = NULL
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND site_title IS NULL;