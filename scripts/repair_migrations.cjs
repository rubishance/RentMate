const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const dir = path.join(__dirname, '../supabase/migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));
files.sort();

console.log('Starting migration repair process for staging env...');

for (const file of files) {
  const version = file.substring(0, 14);
  
  // Stop when we reach the newly added WhatsApp integration migrations
  if (version >= '20260310000000') {
    console.log(`Reached new migrations (${version}). Stopping repair.`);
    break;
  }
  
  console.log(`Marking ${version} as applied...`);
  try {
    // Run the Supabase CLI repair command
    execSync(`npx supabase migration repair --status applied ${version}`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`\n❌ Failed on migration ${version}.`);
    process.exit(1);
  }
}

console.log('\n✅ Successfully repaired migration history for older migrations.');
