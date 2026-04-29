const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./src/db');

const groqApiKey = process.env.GROQ_API_KEY;

const title = 'Sorting Master';
const subject_id = 5;
const topic_id = 12; // 12 is Sorting
const type = 'simulation';
const componentName = 'SortingMasterGame';

const instructions = `Create a 2D educational game called “Sorting Master” that teaches Bubble Sort and Selection Sort through interactive gameplay.
- Nodes are a list of numbers in boxes.
- The player must swap boxes to correctly sort them in ascending order.
- Include a simple UI showing the current numbers.
- Provide a button to check if sorted, and increase the score if correct.
- Make sure to use Tailwind CSS for styling.`;

const systemPrompt = `You are an expert React developer. 
Your task is to generate a complete, single-file React component based on the user's instructions.
- The component MUST be a default export.
- Use Tailwind CSS for styling.
- DO NOT use any external libraries for icons, just use plain text or emojis.
- The component must accept 'onGameComplete(score)' prop and call it when the game finishes to save the score.
- Return ONLY the React code inside a single javascript or jsx markdown block. No other text, explanations, or wrapper.`;

const userPrompt = `Create a React game component named "${componentName}".
Instructions: ${instructions}`;

async function generate() {
  try {
    console.log('Generating game with Groq...');
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
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
    
    // Extract code from markdown block
    const codeMatch = generatedCode.match(/\`\`\`(?:jsx|javascript|js)?\n([\s\S]*?)\n\`\`\`/);
    if (codeMatch) {
      generatedCode = codeMatch[1];
    }

    console.log('Game generated. Saving file...');
    
    const targetLocation = path.join(__dirname, '../frontend/src/components');
    const filePath = path.join(targetLocation, `${componentName}.jsx`);
    
    if (!fs.existsSync(targetLocation)) {
      fs.mkdirSync(targetLocation, { recursive: true });
    }
    
    fs.writeFileSync(filePath, generatedCode, 'utf-8');
    console.log(`File saved to ${filePath}`);

    console.log('Inserting into database...');
    await pool.query(
      'INSERT INTO games (subject_id, topic_id, title, type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [subject_id, topic_id, title, type]
    );
    console.log('Game added to database successfully.');

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  } finally {
    pool.end();
  }
}

generate();
