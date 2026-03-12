import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log("Checking storage bucket 'chat-archives'...");
  // List folders in the bucket (which correspond to user IDs)
  const { data: rootData, error: rootError } = await supabase.storage.from('chat-archives').list();
  
  if (rootError) {
    console.error("Error listing bucket:", rootError);
    return;
  }
  
  if (!rootData || rootData.length === 0) {
    console.log("Bucket is empty. No chat logs found yet.");
    return;
  }

  console.log(`Found ${rootData.length} entries in the root of 'chat-archives'.`);
  
  for (const item of rootData) {
    if (item.name === '.emptyFolderPlaceholder') continue;
    if (item.id === null) {
      // It's a folder (user_id)
      console.log(`\nFolder representing user: ${item.name}`);
      const { data: files, error: filesError } = await supabase.storage.from('chat-archives').list(item.name);
      if (filesError) {
        console.error(`Error listing folder ${item.name}:`, filesError);
        continue;
      }
      
      console.log(`Found ${files?.length || 0} chat sessions for user ${item.name}.`);
      for (const file of files || []) {
        console.log(`- ${file.name} (last modified: ${new Date(file.updated_at).toLocaleString()})`);
      }
    } else {
        console.log(`- File in root: ${item.name}`);
    }
  }
}

test();
