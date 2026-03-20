import { createClient } from '@supabase/supabase-js';

// The anon key for this project
const supabaseURL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA';

const supabase = createClient(supabaseURL, supabaseKey);

async function testUpload() {
  try {
    const fileContent = 'dummy image data';
    const fileName = `test/${Date.now()}.png`;

    const { data, error } = await supabase.storage
      .from('protocol_evidence')
      .upload(fileName, fileContent, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      console.error('UPLOAD FAILED:', error);
      process.exit(1);
    } else {
      console.log('UPLOAD SUCCESS:', data);
      
      // Cleanup the test file
      await supabase.storage.from('protocol_evidence').remove([fileName]);
      console.log('Cleanup success');
    }
  } catch (err) {
    console.error('EXCEPTION:', err);
    process.exit(1);
  }
}

testUpload();
