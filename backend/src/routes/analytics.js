const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

const analyzeUnderstanding = (gameProgress, resourceProgress) => {
  return gameProgress.map(gp => {
    let level = 'Needs Improvement';
    let message = 'Requires more practice.';
    
    const score = parseInt(gp.total_score) || 0;
    const sessions = parseInt(gp.sessions_played) || 0;
    
    // Find reading stats for this game's subject
    const subjectReading = resourceProgress.find(rp => rp.subject === gp.subject_name) || { time_spent: 0 };
    const timeSpentMins = Math.floor((parseInt(subjectReading.time_spent) || 0) / 60);

    if (score >= 300 && timeSpentMins >= 2) {
      level = 'Excellent Mastery';
      message = `Great balance of reading (${timeSpentMins} mins) and practical application! Outstanding understanding.`;
    } else if (score >= 300 && timeSpentMins < 2) {
      level = 'Good Understanding';
      message = `High score, but very little reading time (${timeSpentMins} mins). Make sure you read the topics to cement the theory!`;
    } else if (score >= 100) {
      level = 'Good Understanding';
      message = `Solid grasp of concepts. You've spent ${timeSpentMins} mins reading, keep it up to achieve mastery.`;
    } else if (score > 0 && score < 100 && timeSpentMins < 2) {
      level = 'Needs Improvement';
      message = `Low score and under 2 minutes of reading. Please study the topics thoroughly before attempting the game.`;
    } else if (score > 0 && score < 100 && timeSpentMins >= 2) {
      level = 'Struggling with Application';
      message = `You spent ${timeSpentMins} mins reading but scored low. Consider asking the teacher for guidance on applying the concepts.`;
    } else if (score === 0 && sessions === 0 && timeSpentMins === 0) {
      level = 'Not Started';
      message = 'No data available. Start by reading the resources and playing the game!';
    } else if (score === 0 && sessions === 0 && timeSpentMins > 0) {
      level = 'Reading Only';
      message = `You've read for ${timeSpentMins} mins. Now try applying your knowledge by playing the game!`;
    } else if (score === 0 && sessions > 0) {
      level = 'Needs Improvement';
      message = `Failed attempts with score 0. Please study the ${gp.subject_name} resources before trying again.`;
    }

    return {
      topic: gp.title || gp.type || 'General Topic',
      score,
      timeSpentMins,
      level,
      message
    };
  });
};

router.get('/', authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  try {
    // Global Resource stats
    const resourceStats = await pool.query(
      `SELECT COUNT(*) as completed_resources, SUM(time_spent_seconds) as total_time_spent
       FROM user_resource_progress 
       WHERE user_id = $1 AND is_opened = true`,
      [user_id]
    );

    // Global Game stats
    const gameStats = await pool.query(
      `SELECT COUNT(*) as total_games_played, SUM(score) as total_score
       FROM user_game_scores
       WHERE user_id = $1`,
      [user_id]
    );

    // Detailed Resource Progress for Analysis (Grouped by Subject)
    const resourceProgress = await pool.query(
      `SELECT s.name as subject, COUNT(lr.id) as total_resources, SUM(CASE WHEN ur.is_opened = true THEN 1 ELSE 0 END) as opened_resources, SUM(COALESCE(ur.time_spent_seconds, 0)) as time_spent
       FROM subjects s
       LEFT JOIN topics t ON s.id = t.subject_id
       LEFT JOIN learning_resources lr ON t.id = lr.topic_id
       LEFT JOIN user_resource_progress ur ON lr.id = ur.resource_id AND ur.user_id = $1
       GROUP BY s.id, s.name`,
       [user_id]
    );

    // Detailed Game progress for analysis
    const gameProgress = await pool.query(
      `SELECT g.title, g.type, s.name as subject_name, SUM(ug.score) as total_score, COUNT(ug.id) as sessions_played
       FROM games g
       JOIN subjects s ON g.subject_id = s.id
       LEFT JOIN user_game_scores ug ON g.id = ug.game_id AND ug.user_id = $1
       GROUP BY g.id, g.title, g.type, s.name`,
       [user_id]
    );

    // Recent activity trends (last 7 days of game scores)
    const trends = await pool.query(
      `SELECT DATE(played_at) as date, SUM(score) as daily_score
       FROM user_game_scores
       WHERE user_id = $1 AND played_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(played_at)
       ORDER BY date ASC`,
       [user_id]
    );

    const understanding_analysis = analyzeUnderstanding(gameProgress.rows, resourceProgress.rows);

    res.json({
      pdfs: { 
        completed_pdfs: resourceStats.rows[0].completed_resources, 
        total_time_spent: resourceStats.rows[0].total_time_spent 
      }, // map back to pdfs key to prevent frontend crash for now
      games: gameStats.rows[0],
      game_progress: gameProgress.rows,
      resource_progress: resourceProgress.rows,
      understanding_analysis,
      trends: trends.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all students for teacher view
router.get('/students', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, email, avatar_url FROM users WHERE role = 'student' ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific student's progress clustered by subject
router.get('/students/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  const student_id = req.params.id;
  try {
    // Basic user info
    const userQuery = await pool.query("SELECT username, email FROM users WHERE id = $1", [student_id]);
    if (userQuery.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    
    // Detailed Resource Progress (Grouped by Subject)
    const resourceProgress = await pool.query(
      `SELECT s.name as subject, COUNT(lr.id) as total_resources, SUM(CASE WHEN ur.is_opened = true THEN 1 ELSE 0 END) as opened_resources, SUM(COALESCE(ur.time_spent_seconds, 0)) as time_spent
       FROM subjects s
       LEFT JOIN topics t ON s.id = t.subject_id
       LEFT JOIN learning_resources lr ON t.id = lr.topic_id
       LEFT JOIN user_resource_progress ur ON lr.id = ur.resource_id AND ur.user_id = $1
       GROUP BY s.id, s.name`,
       [student_id]
    );

    // Detailed Game progress for analysis
    const gameProgress = await pool.query(
      `SELECT g.title, g.type, s.name as subject_name, SUM(ug.score) as total_score, COUNT(ug.id) as sessions_played
       FROM games g
       JOIN subjects s ON g.subject_id = s.id
       LEFT JOIN user_game_scores ug ON g.id = ug.game_id AND ug.user_id = $1
       GROUP BY g.id, g.title, g.type, s.name`,
       [student_id]
    );

    const understanding_analysis = analyzeUnderstanding(gameProgress.rows, resourceProgress.rows);

    res.json({
      student: userQuery.rows[0],
      pdf_progress: resourceProgress.rows, // mapping to pdf_progress so frontend doesn't break
      game_progress: gameProgress.rows,
      understanding_analysis
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
