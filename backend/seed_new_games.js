const pool = require('./src/db');

async function seedNewGames() {
  try {
    console.log('Finding Operating Systems subject...');
    const subjectRes = await pool.query("SELECT id FROM subjects WHERE name ILIKE '%Operating System%' LIMIT 1");
    
    if (subjectRes.rows.length === 0) {
      console.log('Operating Systems subject not found. Please create it first.');
      process.exit(1);
    }

    const osSubjectId = subjectRes.rows[0].id;
    
    const gamesToInsert = [
      {
        title: 'Memory Manager: Tetris OS Edition',
        type: 'simulation',
        subject_id: osSubjectId
      },
      {
        title: "Deadlock Escape: Banker's Algorithm",
        type: 'simulation',
        subject_id: osSubjectId
      }
    ];

    for (const game of gamesToInsert) {
      // Check if game already exists
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

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding games:', err);
    process.exit(1);
  }
}

seedNewGames();
