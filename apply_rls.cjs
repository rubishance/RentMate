const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.qfvrekvugdjnwhnaucmz:RentMate123!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('Connected!');
    
    const query = "CREATE POLICY \"Public Access for protocol evidence\" ON storage.objects FOR SELECT USING ( bucket_id = 'protocol_evidence' ); CREATE POLICY \"Authenticated users can upload protocol evidence\" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'protocol_evidence' AND auth.role() = 'authenticated' ); CREATE POLICY \"Authenticated users can delete protocol evidence\" ON storage.objects FOR DELETE USING ( bucket_id = 'protocol_evidence' AND auth.role() = 'authenticated' );";
    
    const res = await client.query(query);
    console.log('Query result:', res);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
