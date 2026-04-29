const pool = require('./src/db');

async function splitMemoryGames() {
  try {
    console.log('Finding Operating Systems subject...');
    const subjectRes = await pool.query("SELECT id FROM subjects WHERE name ILIKE '%Operating System%' LIMIT 1");
    
    if (subjectRes.rows.length === 0) {
      console.log('Operating Systems subject not found.');
      process.exit(1);
    }

    const osSubjectId = subjectRes.rows[0].id;

    // Delete the old combined game
    await pool.query("DELETE FROM games WHERE title = 'Memory Manager: Tetris OS Edition'");
    console.log('Deleted old combined memory game.');

    const gamesToInsert = [
      { title: 'Memory Manager: First Fit', type: 'simulation', subject_id: osSubjectId },
      { title: 'Memory Manager: Best Fit', type: 'simulation', subject_id: osSubjectId },
      { title: 'Memory Manager: Worst Fit', type: 'simulation', subject_id: osSubjectId }
    ];

    for (const game of gamesToInsert) {
      const existing = await pool.query('SELECT id FROM games WHERE title = $1', [game.title]);
      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO games (subject_id, title, type) VALUES ($1, $2, $3)',
          [game.subject_id, game.title, game.type]
        );
        console.log(`Inserted game: ${game.title}`);
      } else {
        console.log(`Game already exists: ${game.title}`);
      }
    }

    console.log('Split completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

splitMemoryGames();
