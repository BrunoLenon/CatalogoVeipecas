import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase URL from the environment
const supabaseUrl = 'https://icwimagyyrqvyxbfybdf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljd2ltYWd5eXJxdnl4YmZ5YmRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjE0NDYwMiwiZXhwIjoyMDU3NzIwNjAyfQ.EG1kYJvX1vI3OmctUJU-EeNrgdTp9Hwsv9of6QsXL0c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserMetadata() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '37e98de1-a8b4-40ac-a20b-14f456175122',
    { user_metadata: { role: 'master' } }
  );

  if (error) {
    console.error('Error updating user metadata:', error);
    process.exit(1);
  }

  console.log('User metadata updated successfully:', data);
  process.exit(0);
}

updateUserMetadata();