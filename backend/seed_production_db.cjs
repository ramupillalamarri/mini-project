const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbUrl = process.argv[2] || process.env.DATABASE_URL;

if (!dbUrl) {
  console.log('No DATABASE_URL found. Skipping production database seeding.');
  process.exit(0);
}

async function run() {
  const dumpPath = path.join(__dirname, 'local_dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error('Error: local_dump.json not found.');
    process.exit(1);
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  console.log('Connecting to production database...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    // 1. Map & Seed Users
    const userIdMap = {};
    if (dump.users) {
      console.log('Seeding users...');
      for (const u of dump.users) {
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
        if (existing.rows.length > 0) {
          userIdMap[u.id] = existing.rows[0].id;
          console.log(`User already exists: ${u.email} (mapped ${u.id} -> ${existing.rows[0].id})`);
        } else {
          const insertRes = await client.query(
            'INSERT INTO users (email, google_id, username, avatar_url, phone_number, address, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [u.email, u.google_id, u.username, u.avatar_url, u.phone_number, u.address, u.role, u.created_at || new Date()]
          );
          userIdMap[u.id] = insertRes.rows[0].id;
          console.log(`Inserted user: ${u.email} (mapped ${u.id} -> ${insertRes.rows[0].id})`);
        }
      }
    }

    // 2. Map & Seed Subjects
    const subjectIdMap = {};
    if (dump.subjects) {
      console.log('\nSeeding subjects...');
      for (const sub of dump.subjects) {
        const existing = await client.query('SELECT id FROM subjects WHERE name = $1', [sub.name]);
        if (existing.rows.length > 0) {
          subjectIdMap[sub.id] = existing.rows[0].id;
          console.log(`Subject already exists: ${sub.name} (mapped ${sub.id} -> ${existing.rows[0].id})`);
        } else {
          const insertRes = await client.query(
            'INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING id',
            [sub.name, sub.description]
          );
          subjectIdMap[sub.id] = insertRes.rows[0].id;
          console.log(`Inserted subject: ${sub.name} (mapped ${sub.id} -> ${insertRes.rows[0].id})`);
        }
      }
    }

    // 3. Map & Seed Topics
    const topicIdMap = {};
    if (dump.topics) {
      console.log('\nSeeding topics...');
      for (const topic of dump.topics) {
        const targetSubId = subjectIdMap[topic.subject_id];
        if (!targetSubId) continue;

        const existing = await client.query(
          'SELECT id FROM topics WHERE subject_id = $1 AND name = $2',
          [targetSubId, topic.name]
        );

        if (existing.rows.length > 0) {
          topicIdMap[topic.id] = existing.rows[0].id;
          console.log(`Topic already exists: ${topic.name} (mapped ${topic.id} -> ${existing.rows[0].id})`);
        } else {
          const insertRes = await client.query(
            'INSERT INTO topics (subject_id, name, description) VALUES ($1, $2, $3) RETURNING id',
            [targetSubId, topic.name, topic.description]
          );
          topicIdMap[topic.id] = insertRes.rows[0].id;
          console.log(`Inserted topic: ${topic.name} (mapped ${topic.id} -> ${insertRes.rows[0].id})`);
        }
      }
    }

    // 4. Map & Seed Learning Resources
    const resourceIdMap = {};
    if (dump.resources) {
      console.log('\nSeeding learning resources...');
      for (const res of dump.resources) {
        const targetTopicId = topicIdMap[res.topic_id];
        if (!targetTopicId) continue;

        const existing = await client.query(
          'SELECT id FROM learning_resources WHERE topic_id = $1 AND title = $2',
          [targetTopicId, res.title]
        );

        if (existing.rows.length > 0) {
          resourceIdMap[res.id] = existing.rows[0].id;
          console.log(`Resource already exists: ${res.title} (mapped ${res.id} -> ${existing.rows[0].id})`);
        } else {
          const insertRes = await client.query(
            'INSERT INTO learning_resources (topic_id, title, type, url) VALUES ($1, $2, $3, $4) RETURNING id',
            [targetTopicId, res.title, res.type, res.url]
          );
          resourceIdMap[res.id] = insertRes.rows[0].id;
          console.log(`Inserted resource: ${res.title} (mapped ${res.id} -> ${insertRes.rows[0].id})`);
        }
      }
    }

    // 5. Map & Seed Games
    const gameIdMap = {};
    if (dump.games) {
      console.log('\nSeeding games...');
      for (const game of dump.games) {
        const targetSubId = subjectIdMap[game.subject_id] || null;
        const targetTopicId = topicIdMap[game.topic_id] || null;

        const existing = await client.query(
          'SELECT id FROM games WHERE title = $1',
          [game.title]
        );

        if (existing.rows.length > 0) {
          gameIdMap[game.id] = existing.rows[0].id;
          console.log(`Game already exists: ${game.title} (mapped ${game.id} -> ${existing.rows[0].id})`);
          await client.query(
            'UPDATE games SET subject_id = $1, topic_id = $2, description = $3, content = $4, created_at = $5 WHERE title = $6',
            [targetSubId, targetTopicId, game.description || null, game.content || null, game.created_at || new Date(), game.title]
          );
        } else {
          const insertRes = await client.query(
            'INSERT INTO games (subject_id, topic_id, title, type, description, content, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [targetSubId, targetTopicId, game.title, game.type, game.description || null, game.content || null, game.created_at || new Date()]
          );
          gameIdMap[game.id] = insertRes.rows[0].id;
          console.log(`Inserted game: ${game.title} (mapped ${game.id} -> ${insertRes.rows[0].id})`);
        }
      }
    }

    // 6. Seed User Game Scores
    if (dump.scores) {
      console.log('\nSeeding game scores...');
      for (const score of dump.scores) {
        const targetUserId = userIdMap[score.user_id];
        const targetGameId = gameIdMap[score.game_id];
        if (!targetUserId || !targetGameId) continue;

        const existing = await client.query(
          'SELECT id FROM user_game_scores WHERE user_id = $1 AND game_id = $2',
          [targetUserId, targetGameId]
        );

        if (existing.rows.length > 0) {
          console.log(`Score already exists for user ${score.user_id} and game ${score.game_id}`);
        } else {
          await client.query(
            'INSERT INTO user_game_scores (user_id, game_id, score, attempts, played_at) VALUES ($1, $2, $3, $4, $5)',
            [targetUserId, targetGameId, score.score, score.attempts, score.played_at || new Date()]
          );
          console.log(`Inserted score for user ${score.user_id} and game ${score.game_id}`);
        }
      }
    }

    // 7. Seed User Resource Progress
    if (dump.resourceProgress) {
      console.log('\nSeeding resource progress...');
      for (const prog of dump.resourceProgress) {
        const targetUserId = userIdMap[prog.user_id];
        const targetResourceId = resourceIdMap[prog.resource_id];
        if (!targetUserId || !targetResourceId) continue;

        const existing = await client.query(
          'SELECT 1 FROM user_resource_progress WHERE user_id = $1 AND resource_id = $2',
          [targetUserId, targetResourceId]
        );

        if (existing.rows.length > 0) {
          console.log(`Progress already exists for user ${prog.user_id} and resource ${prog.resource_id}`);
        } else {
          await client.query(
            'INSERT INTO user_resource_progress (user_id, resource_id, is_opened, time_spent_seconds, last_accessed) VALUES ($1, $2, $3, $4, $5)',
            [targetUserId, targetResourceId, prog.is_opened, prog.time_spent_seconds, prog.last_accessed || new Date()]
          );
          console.log(`Inserted progress for user ${prog.user_id} and resource ${prog.resource_id}`);
        }
      }
    }

    // 8. Seed User PDF Progress (UUIDs unchanged)
    if (dump.pdfProgress) {
      console.log('\nSeeding PDF progress...');
      for (const prog of dump.pdfProgress) {
        const targetUserId = userIdMap[prog.user_id];
        if (!targetUserId) continue;

        const existing = await client.query(
          'SELECT 1 FROM user_pdf_progress WHERE user_id = $1 AND pdf_id = $2',
          [targetUserId, prog.pdf_id]
        );

        if (existing.rows.length > 0) {
          console.log(`PDF progress already exists for user ${prog.user_id} and pdf ${prog.pdf_id}`);
        } else {
          await client.query(
            'INSERT INTO user_pdf_progress (user_id, pdf_id, is_opened, time_spent_seconds, last_accessed) VALUES ($1, $2, $3, $4, $5)',
            [targetUserId, prog.pdf_id, prog.is_opened, prog.time_spent_seconds, prog.last_accessed || new Date()]
          );
          console.log(`Inserted PDF progress for user ${prog.user_id} and pdf ${prog.pdf_id}`);
        }
      }
    }

    console.log('\nSeeding process completed successfully!');
  } catch (err) {
    console.error('Seeding process failed:', err.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
