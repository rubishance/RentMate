import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testUploads() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@rentmate.co.il',
    password: 'Test!123'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  console.log('Logged in as test user:', authData.user.id);

  const bucketsToTest = ['assets', 'property-images', 'protocol_evidence', 'contracts', 'tenant_documents'];
  
  // 1x1 transparent PNG
  const fileData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

  for (const bucket of bucketsToTest) {
    const fileName = `test_upload_${bucket}_${Date.now()}.png`;
    
    console.log(`\nTesting bucket: ${bucket}`);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        contentType: 'image/png',
        upsert: false
      });
      
    if (error) {
      console.log(`❌ Bucket ${bucket} FAILED: ${error.message}`);
    } else {
      console.log(`✅ Bucket ${bucket} SUCCESS! Path: ${data.path}`);
      
      // Cleanup
      await supabase.storage.from(bucket).remove([data.path]);
    }
  }
}

testUploads().catch(console.error);
