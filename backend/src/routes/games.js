const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getQuizGameTemplate, getMemoryGameTemplate, getSortingGameTemplate } = require('../utils/gameTemplates');
const router = express.Router();

// Get all games
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM games ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get games by subject
router.get('/subject/:subjectId', async (req, res) => {
  const { subjectId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM games WHERE subject_id = $1 ORDER BY created_at DESC', [subjectId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a game (Teacher Only)
router.post('/', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { title, type, subject_id, topic_id } = req.body;
  if (!title || !subject_id || !topic_id) {
    return res.status(400).json({ error: 'Subject, topic and game title are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO games (subject_id, topic_id, title, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [subject_id || null, topic_id || null, title, type || 'quiz']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/generate', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { title, type, subject_id, topic_id, instructions, description } = req.body;
  
  if (!title || !instructions) {
    return res.status(400).json({ error: 'Missing required fields for generation' });
  }

  // Auto-generate component name from title (e.g. "Protocol Matcher" -> "ProtocolMatcherGame")
  const componentName = title.replace(/[^a-zA-Z0-9]/g, '') + 'Game';

  const groqApiKey = process.env.GROQ_API_KEY;

  const systemPrompt = `You are an expert React developer. 
Your task is to generate a complete, single-file React component based on the user's instructions.
- The component MUST be a default export.
- Use Tailwind CSS for styling.
- You can use lucide-react for icons. Import them from 'lucide-react'.
- DO NOT use any other external libraries (unless standard React hooks).
- The component must accept 'onGameComplete(score)' prop and call it when the game finishes to save the score.
- The component MUST include a standardized header layout containing:
  1. A left section with the game title and subtitle.
  2. A right section with a score badge and a button group (Pause, Restart, Exit).
     * Pause button: toggles an isPaused state and renders a backdrop-blur overlay blocking gameplay interactions.
     * Restart button: re-initializes/resets the game state.
     * Exit button: calls onGameComplete(score) directly.
- The final level-clear or game-over state MUST display a results overlay displaying the score, a "Try Again" restart button, and a "Finish" exit button that calls onGameComplete(score).
- Return ONLY the React code inside a single javascript or jsx markdown block. No other text, explanations, or wrapper.`;

  const userPrompt = `Create a React game component named "${componentName}".
Instructions: ${instructions}
${description ? `Additional Description/Context: ${description}` : ''}`;

  try {
    // 1. Call Groq API
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile', // Or 'llama3-8b-8192', using 70b for better code generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let generatedCode = response.data.choices[0].message.content;
    
    // Extract code from markdown block if present
    const codeMatch = generatedCode.match(/```(?:jsx|javascript|js)?\n([\s\S]*?)\n```/);
    if (codeMatch) {
      generatedCode = codeMatch[1];
    }

    // 2. Save the file to the specified location
    const targetLocation = path.join(__dirname, '../../../frontend/src/components');
    const filePath = path.join(targetLocation, `${componentName}.jsx`);
    
    // Ensure directory exists (though it normally should if they point to src/components)
    if (!fs.existsSync(targetLocation)) {
      fs.mkdirSync(targetLocation, { recursive: true });
    }
    
    fs.writeFileSync(filePath, generatedCode, 'utf-8');

    // 3. Add to Database
    const result = await pool.query(
      'INSERT INTO games (subject_id, topic_id, title, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [subject_id || null, topic_id || null, title, type || 'simulation']
    );

    res.status(201).json({ 
      game: result.rows[0], 
      message: `Game generated and saved successfully to ${filePath}` 
    });

  } catch (err) {
    console.error('Groq generation failed, using local offline fallback generator:', err.response?.data || err.message);
    
    // Fallback Code Generation
    let generatedCode;
    const lowerTitle = title.toLowerCase();
    const lowerInstructions = instructions.toLowerCase();
    
    if (lowerTitle.includes('sorting') || lowerInstructions.includes('sort') || lowerInstructions.includes('order')) {
      generatedCode = getSortingGameTemplate(componentName, title, instructions);
    } else if (lowerTitle.includes('match') || lowerTitle.includes('memory') || lowerInstructions.includes('pair')) {
      generatedCode = getMemoryGameTemplate(componentName, title, instructions);
    } else {
      generatedCode = getQuizGameTemplate(componentName, title, instructions);
    }

    try {
      const targetLocation = path.join(__dirname, '../../../frontend/src/components');
      const filePath = path.join(targetLocation, `${componentName}.jsx`);
      
      if (!fs.existsSync(targetLocation)) {
        fs.mkdirSync(targetLocation, { recursive: true });
      }
      
      fs.writeFileSync(filePath, generatedCode, 'utf-8');

      const result = await pool.query(
        'INSERT INTO games (subject_id, topic_id, title, type) VALUES ($1, $2, $3, $4) RETURNING *',
        [subject_id || null, topic_id || null, title, type || 'simulation']
      );

      res.status(201).json({ 
        game: result.rows[0], 
        message: `Game generated using local template (Offline Fallback) and saved successfully to ${filePath}` 
      });
    } catch (dbErr) {
      console.error('Error in fallback path:', dbErr);
      res.status(500).json({ error: 'Failed to generate game in fallback mode: ' + dbErr.message });
    }
  }
});

// Generate dynamic questions for offline/production AI games
router.post('/generate-questions', async (req, res) => {
  const { title, instructions, description } = req.body;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return res.json([
      { question: `What is the primary goal of ${title}?`, options: [instructions, 'To do nothing', 'To fail the system', 'To browse the web'], answer: 0 }
    ]);
  }

  try {
    const prompt = `You are a curriculum assistant. Generate 5 multiple-choice questions for an interactive educational game.
Game Title: ${title}
Instructions: ${instructions}
Description: ${description}

Return ONLY a valid JSON array of objects. Do not include any explanations, introduction, markdown blocks, or text.
Each object must have:
- "question" (string): The quiz question.
- "options" (array of 4 strings): Multiple choice options.
- "answer" (number): Index of the correct option (0-3).`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let content = response.data.choices[0].message.content.trim();
    const match = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (match) content = match[1];

    res.json(JSON.parse(content));
  } catch (err) {
    console.error('Failed to generate dynamic questions:', err.message);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Delete a game (Teacher Only)
router.delete('/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    await pool.query('DELETE FROM games WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Post a new score
router.post('/score', authenticateToken, async (req, res) => {
  const { game_id, score, attempts } = req.body;
  const user_id = req.user.id;

  if (!game_id || score === undefined) return res.status(400).json({ error: 'game_id and score are required' });

  try {
    const result = await pool.query(
      'INSERT INTO user_game_scores (user_id, game_id, score, attempts, played_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
      [user_id, game_id, score, attempts || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get scores for logged-in user
router.get('/scores', authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT g.title, g.type, s.score, s.attempts, s.played_at 
       FROM user_game_scores s
       JOIN games g ON s.game_id = g.id
       WHERE s.user_id = $1
       ORDER BY s.played_at DESC`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
