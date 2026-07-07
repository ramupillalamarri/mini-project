const pool = require('./src/db');

async function test() {
  try {
    const title = 'Test Game Type Match';
    const type = 'simulation';
    const subject_id = '5';
    const topic_id = '13';

    console.log('Testing raw database query with string values...');
    const result = await pool.query(
      'INSERT INTO games (subject_id, topic_id, title, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [subject_id || null, topic_id || null, title, type]
    );
    console.log('Inserted successfully:', result.rows[0]);
    
    // Clean up
    await pool.query('DELETE FROM games WHERE id = $1', [result.rows[0].id]);
    console.log('Cleaned up successfully.');
  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    process.exit(0);
  }
}

test();
