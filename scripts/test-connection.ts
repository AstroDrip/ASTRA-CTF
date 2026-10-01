import 'dotenv/config';

async function testSupabase() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminSecret = process.env.ADMIN_SECRET;

  console.log('\n======================================================');
  console.log('   ASTRA // ECHO - Supabase & Environment Diagnostics');
  console.log('======================================================\n');

  console.log(`[1] Environment Variables Check:`);
  console.log(`    - SUPABASE_URL:             ${url ? '✓ Configured (' + url + ')' : '✗ Missing'}`);
  console.log(`    - SUPABASE_SERVICE_ROLE_KEY: ${key ? '✓ Configured (' + key.slice(0, 12) + '...)' : '✗ Missing'}`);
  console.log(`    - ADMIN_SECRET:              ${adminSecret ? '✓ Configured' : '⚠ Default fallback ("ASTRA_ADMIN_2026")'}`);

  if (!url || !key) {
    console.error('\n❌ ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env to test Supabase.');
    process.exit(1);
  }

  console.log('\n[2] Testing Supabase REST Connection...');
  try {
    const res = await fetch(`${url}/rest/v1/competition_settings?select=*&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      console.error(`❌ Authentication failed (${res.status}). Verify your SUPABASE_SERVICE_ROLE_KEY.`);
      process.exit(1);
    }

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 404 || errorText.includes('relation "public.competition_settings" does not exist') || errorText.includes('PGRST205')) {
        console.log(`⚠ Database connected, but the ASTRA tables were not found!`);
        console.log(`\n📋 ACTION REQUIRED:`);
        console.log(`   You must execute the SQL migration script:`);
        console.log(`   1. Open your Supabase project dashboard at: ${url.replace(/\.supabase\.co.*$/, '.supabase.com')}`);
        console.log(`   2. Navigate to "SQL Editor" -> "New Query"`);
        console.log(`   3. Copy & paste the contents of: supabase/001_astra_multiplayer.sql`);
        console.log(`   4. Click "Run"`);
        process.exit(0);
      }
      console.error(`❌ Supabase error (${res.status}):`, errorText);
      process.exit(1);
    }

    const data = await res.json();
    console.log(`✓ Connection successful! 'competition_settings' table detected.`);

    console.log('\n[3] Testing Tables & Functions:');
    
    // Check teams table
    const teamsRes = await fetch(`${url}/rest/v1/teams?select=count`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(`    - Table 'teams':             ${teamsRes.ok ? '✓ Ready' : '✗ Failed'}`);

    // Check submissions table
    const subRes = await fetch(`${url}/rest/v1/submissions?select=count`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(`    - Table 'submissions':       ${subRes.ok ? '✓ Ready' : '✗ Failed'}`);

    // Check sessions table
    const sessRes = await fetch(`${url}/rest/v1/sessions?select=count`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(`    - Table 'sessions':          ${sessRes.ok ? '✓ Ready' : '✗ Failed'}`);

    console.log('\n======================================================');
    console.log('🎉 SUCCESS: All Supabase tables and credentials are ready!');
    console.log('You can now run: npm run dev');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ Network connection error:', err.message || err);
    if (err.cause) console.error('   Cause:', err.cause);
  }
}

testSupabase();
