const pool = require('./src/db');

async function migrateGameTopics() {
  try {
    console.log('Altering games table...');
    await pool.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE;
    `);

    console.log('Finding Operating Systems subject...');
    const subjectRes = await pool.query("SELECT id FROM subjects WHERE name ILIKE '%Operating System%' LIMIT 1");
    if (subjectRes.rows.length === 0) {
      console.log('Subject not found, exiting.');
      process.exit(0);
    }
    const osId = subjectRes.rows[0].id;

    // Helper to get or create topic
    const getOrCreateTopic = async (name, description) => {
      let res = await pool.query("SELECT id FROM topics WHERE subject_id = $1 AND name ILIKE $2", [osId, `%${name}%`]);
      if (res.rows.length > 0) return res.rows[0].id;
      
      console.log(`Creating topic: ${name}...`);
      res = await pool.query(
        "INSERT INTO topics (subject_id, name, description) VALUES ($1, $2, $3) RETURNING id",
        [osId, name, description]
      );
      return res.rows[0].id;
    };

    const schedulingId = await getOrCreateTopic('Scheduling', 'CPU Scheduling algorithms');
    const memoryId = await getOrCreateTopic('Memory Management', 'Memory allocation strategies');
    const deadlockId = await getOrCreateTopic('Deadlock', 'Deadlock avoidance and Banker algorithm');

    // Update games
    console.log('Mapping games to topics...');
    
    // Scheduling
    await pool.query("UPDATE games SET topic_id = $1 WHERE title IN ('FCFS Scheduler', 'SJF Scheduler', 'RR Scheduler')", [schedulingId]);
    
    // Memory Management
    await pool.query("UPDATE games SET topic_id = $1 WHERE title IN ('Memory Manager: First Fit', 'Memory Manager: Best Fit', 'Memory Manager: Worst Fit')", [memoryId]);
    
    // Deadlock
    await pool.query("UPDATE games SET topic_id = $1 WHERE title IN ('Deadlock Escape: Banker''s Algorithm')", [deadlockId]);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error migrating:', err);
    process.exit(1);
  }
}

migrateGameTopics();
