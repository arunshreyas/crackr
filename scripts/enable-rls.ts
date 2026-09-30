import 'dotenv/config';
import pg from 'pg';

const tables = [
  'UserProfile',
  'Question',
  'QuestionOption',
  'QuestionVector',
  'QuizSession',
  'QuizAnswer',
  'XPTransaction',
  'Achievement',
  'UserAchievement',
];

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL or DIRECT_URL is required.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('--- ENABLING ROW LEVEL SECURITY ON ALL TABLES ---');

    for (const table of tables) {
      console.log(`Securing table: "${table}"...`);
      
      // 1. Enable Row Level Security
      await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);

      // 2. Drop any legacy insecure permissive public policies if any existed
      await client.query(`DROP POLICY IF EXISTS "Allow all operations for service role" ON "${table}";`);
      await client.query(`DROP POLICY IF EXISTS "Allow all public operations" ON "${table}";`);
      await client.query(`DROP POLICY IF EXISTS "Allow public read" ON "${table}";`);
      await client.query(`DROP POLICY IF EXISTS "Allow public write" ON "${table}";`);
      await client.query(`DROP POLICY IF EXISTS "Allow anon read" ON "${table}";`);
      await client.query(`DROP POLICY IF EXISTS "Allow anon write" ON "${table}";`);

      // 3. Create explicit service_role / postgres policy
      // In Supabase / PostgreSQL, service_role or backend postgres connection can execute all operations
      await client.query(`
        CREATE POLICY "service_role_all_${table.toLowerCase()}" ON "${table}"
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
      `);

      console.log(`✓ RLS enabled and locked down for "${table}"`);
    }

    // Verify RLS status from PostgreSQL pg_tables
    const res = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (${tables.map((t) => `'${t}'`).join(', ')});
    `);

    console.log('\n--- VERIFICATION STATUS ---');
    console.table(res.rows);

    const nonSecured = res.rows.filter((r) => !r.rowsecurity);
    if (nonSecured.length > 0) {
      console.error('ERROR: Some tables do not have rowsecurity enabled:', nonSecured);
      process.exit(1);
    }

    console.log('\nSUCCESS: All tables have Row Level Security (RLS) active and secured against unauthorized client/anon access.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Failed to enable RLS:', err);
  process.exit(1);
});
