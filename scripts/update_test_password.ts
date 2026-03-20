// Change test user password to Test!123 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function updatePassword() {
  const emailToFind = 'test@rentmate.co.il';
  
  // Try rentmate.co.il first
  let { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
  
  let targetUser = users.users.find(u => u.email === emailToFind || u.email === 'test@rentmate.io');
  
  if (!targetUser) {
    console.log('No user found matching test@rentmate.co.il or test@rentmate.io');
    process.exit(1);
  }

  console.log(`Found user ${targetUser.email} with ID ${targetUser.id}`);

  const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    { password: 'Test!123' }
  );

  if (updateError) {
    console.error('Error updating password:', updateError);
    process.exit(1);
  }

  console.log('Password updated successfully to Test!123 for user:', targetUser.email);
}

updatePassword();
