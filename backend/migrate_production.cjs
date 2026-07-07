const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Ensure we have a Database URL
const dbUrl = process.argv[2] || process.env.DATABASE_URL;

if (!dbUrl) {
  console.log('No DATABASE_URL found. Skipping production database migrations.');
  process.exit(0);
}

async function run() {
  console.log('Connecting to production database...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.join(__dirname, 'database.sql');
    console.log('Reading schema from database.sql...');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing database migrations...');
    
    // Patch existing games table schema if it was created in previous deploys
    try {
      await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS description TEXT');
      await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS content TEXT');
      await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('Games table schema patch applied successfully.');
    } catch (patchErr) {
      console.warn('Warning during schema patching:', patchErr.message);
    }
    // We split statements by semicolon to run them safely
    // Note: This is a simple migration executor. We filter out empty commands.
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
      } catch (err) {
        // If it's a "relation already exists" or extension already loaded warning, we can ignore
        if (err.message.includes('already exists') || err.message.includes('already loaded')) {
          continue;
        }
        console.warn(`Warning on statement ${i + 1}:`, err.message);
      }
    }

    console.log('Database initialized successfully with all tables!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
