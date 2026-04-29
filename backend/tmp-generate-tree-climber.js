const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./src/db');

const groqApiKey = process.env.GROQ_API_KEY;

const title = 'Tree Climber';
const subject_id = 5;
const topic_id = 14;
const type = 'simulation';
const componentName = 'TreeClimberGame';

const instructions = `2)🎮 Prompt: Tree Climber (Binary Trees / BST Game)

Create a 2D educational game called “Tree Climber” that teaches Binary Search Trees (BST), AVL Trees, and Red-Black Trees through interactive gameplay.

🌳 Core Concept

The player climbs a growing tree by correctly inserting nodes into a Binary Search Tree.

Nodes (numbers like 10, 5, 15, etc.) fall from the top
The player must place each node in the correct position
Correct placement → tree grows upward
Wrong placement → branch breaks / penalty
🎮 Gameplay Mechanics
1. Node Drop System
Random numbers fall from the top of the screen
Example sequence: 10 → 5 → 15 → 3 → 7
One node appears at a time
2. Player Interaction
Player chooses where to insert the node:
Click on an existing node to traverse left/right
Or drag and drop node into position
Visual guide:
Left = smaller values
Right = larger values
3. BST Insertion Rules
Enforce:
Left subtree → values < parent
Right subtree → values > parent
4. Feedback System
✅ Correct:
Node snaps into place
Player climbs higher
Score increases
❌ Incorrect:
Branch cracks or breaks
Lose life / time penalty
📈 Level Progression
🌱 Level 1–3: Basic BST
Small trees (5–10 nodes)
Slow falling nodes
Visual hints enabled
🌿 Level 4–6: Medium BST
Larger trees (10–20 nodes)
Faster node drops
No hints
🌲 Level 7+: AVL Trees
Tree must remain balanced
If imbalance occurs:
Player must perform rotations:
Left Rotation
Right Rotation
Left-Right
Right-Left
🔴⚫ Advanced Levels: Red-Black Trees
Enforce rules:
No two red nodes adjacent
Equal black height
Player must:
Recolor nodes
Perform rotations
🧠 Learning Features
Show explanation during gameplay:
“5 < 10 → go left”
Display:
Tree height
Balance factor (for AVL)
After each level:
Summary:
Correct insertions
Mistakes
Efficiency score
🎨 UI / UX Design
Clean, minimal UI (educational style)
Components:
Tree visualization (nodes connected with edges)
Falling node at top
Player avatar climbing branches
Score + lives display
Level indicator
🔊 Animations & Effects
Smooth node insertion animation
Branch growth when correct
Shake/break animation when wrong
Rotation animations for AVL
🏆 Game Modes
1. Climb Mode (Main Game)
Endless climbing with increasing difficulty
2. Practice Mode
No penalties
Learn BST insertion step-by-step
3. Challenge Mode
Time-limited
Strict balancing required
💡 Advanced Features (Optional)
Hint system:
Suggest correct insertion path
Ghost preview:
Show where node will land
Replay mode:
Show correct tree build
🛠️ Technical Requirements
Use:
HTML + CSS + JavaScript (Canvas or SVG)
OR React for component-based design
Structure:
Tree as object-based data structure
Separate modules:
BST logic
AVL rotations
Red-Black rules
Include:
Real-time validation of insertion
Smooth animations
Scalable difficulty
🧪 Example Scenario
Node 10 → becomes root
Node 5 → goes left
Node 15 → goes right
Node 3 → left of 5
Node 7 → right of 5

Tree grows visually as player climbs upward.

🎯 Goal

Build a game that:

Makes tree concepts intuitive
Visually demonstrates BST growth
Teaches balancing through interaction
Feels like a fun climbing challenge, not just a lesson
🚀 Output Requirements
Fully functional interactive game
Clean UI with smooth animations
Modular and readable code
Include comments explaining logic`;

const systemPrompt = `You are an expert React developer. 
Your task is to generate a complete, single-file React component based on the user's instructions.
- The component MUST be a default export.
- Use Tailwind CSS for styling.
- You can use lucide-react for icons.
- DO NOT use any other external libraries (unless standard React hooks).
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
