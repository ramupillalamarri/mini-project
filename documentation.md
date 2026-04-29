# LearnApp: An AI-Powered Interactive Educational Platform

## 1. INTRODUCTION

### 1.1 BACKGROUND
The rapid evolution of educational technology has shifted the paradigm from traditional, static learning methodologies to interactive, digital platforms. Computer Science education, particularly in complex subjects like Operating Systems, Computer Networks, and Data Structures, requires high cognitive engagement. Gamification and interactive simulations have proven to be highly effective in reducing cognitive load and increasing student retention.

### 1.2 PROBLEM STATEMENT
Current educational platforms often rely on static content such as video lectures and multiple-choice quizzes. They lack dynamic, interactive simulations that allow students to visualize complex algorithms (e.g., CPU Scheduling, Network Protocols, Tree Traversal). Furthermore, creating these interactive simulations manually is extremely time-consuming for educators, resulting in a scarcity of high-quality, customized interactive content.

### 1.3 OBJECTIVES
1. To develop a web-based educational platform that hosts interactive games and simulations for Computer Science topics.
2. To implement a secure, role-based access control system (Students vs. Teachers) using Google OAuth.
3. To integrate an AI-powered game generation tool using Large Language Models (LLMs) that allows teachers to dynamically create new playable simulations based on natural language prompts.
4. To provide a responsive, user-friendly interface that categorizes content by Subjects and Topics.

### 1.4 OVERVIEW
LearnApp is a modern web application built using the PERN stack (PostgreSQL, Express.js, React.js, Node.js). It features a robust backend for managing users, subjects, topics, and game metadata. The frontend provides interactive gameplay using React state management. A key innovation is the integration with the Groq AI API, allowing dynamic generation of React-based game components on the fly.

---

## 2. LITERATURE REVIEW

### 2.1 Traditional vs Interactive Learning
Studies show that interactive learning environments significantly improve student engagement compared to passive learning. Active manipulation of variables in simulations helps students build better mental models of abstract concepts.

### 2.2 Gamification in Education
Gamification involves applying game-design elements (scoring, levels, immediate feedback) to non-game contexts. It increases intrinsic motivation and provides a safe environment for students to fail and learn iteratively.

### 2.3 Role of AI in Content Generation
The advent of advanced LLMs (like Llama 3) has enabled the automated generation of code. In education, this allows for the rapid prototyping of customized learning tools, drastically reducing the development overhead for educators.

### 2.4 Modern Web Architectures for E-Learning
Single Page Applications (SPAs) built with libraries like React offer fluid, app-like experiences. When combined with RESTful APIs and relational databases, they provide a scalable architecture suitable for handling concurrent student access.

### 2.5 Existing Platforms and Limitations
While platforms like Kahoot! or Quizlet offer gamification, they are limited to flashcards and quizzes. They do not offer deep, algorithm-based simulations (like playing as a Network Protocol). LearnApp bridges this gap.

---

## 3. REQUIREMENT ANALYSIS

### 3.1 FUNCTIONAL REQUIREMENTS
- **Authentication**: Users must be able to log in securely using Google OAuth.
- **Role Management**: The system must differentiate between Teachers (admin privileges) and Students.
- **Content Browsing**: Students must be able to browse subjects, topics, and available games.
- **Gameplay**: Students must be able to play interactive simulations and receive immediate feedback/scores.
- **AI Game Generation**: Teachers must be able to generate new games by providing a title, topic, and natural language instructions to an AI agent.
- **Content Management**: Teachers must be able to delete outdated or incorrect games.

### 3.2 NON-FUNCTIONAL REQUIREMENTS
- **Performance**: The UI should respond within 200ms. AI generation should complete within 15 seconds.
- **Security**: API endpoints must be protected using JWT tokens. SQL injection must be prevented using parameterized queries.
- **Scalability**: The database schema must efficiently handle thousands of user scores and logs.
- **Usability**: The interface must be highly intuitive, utilizing modern design principles and Tailwind CSS.

---

## 4. DESIGN

### 4.1 OVERVIEW DIAGRAM
The system follows a 3-tier architecture:
- **Presentation Layer**: React.js frontend utilizing Tailwind CSS and Lucide React icons.
- **Application Layer**: Node.js/Express backend handling business logic, JWT validation, and Groq API orchestration.
- **Data Layer**: PostgreSQL database managing relational data (Users, Subjects, Topics, Games, Scores).

### 4.2 UML DIAGRAMS

#### 4.2.1 USE CASE DIAGRAM
- **Student**: Logs in -> Browses Topics -> Plays Game -> Submits Score.
- **Teacher**: Logs in -> Promotes Users -> Generates AI Game -> Deletes Game -> Views Analytics.

#### 4.2.2 CLASS DIAGRAM
Main Entities:
- `User` (id, google_id, email, role)
- `Subject` (id, name)
- `Topic` (id, subject_id, name)
- `Game` (id, subject_id, topic_id, title, type)
- `Score` (id, user_id, game_id, score)

#### 4.2.3 SEQUENCE DIAGRAM (AI Generation)
1. Teacher submits prompt via UI.
2. React app sends POST to Express API.
3. Express API constructs system prompt and sends to Groq API.
4. Groq API returns React JSX code.
5. Express API saves JSX to file system and inserts record to PostgreSQL.
6. React app updates UI with new game.

#### 4.2.4 ACTIVITY DIAGRAM (Playing a Game)
Start -> Select Subject -> Select Topic -> Choose Game -> Read Instructions -> Play Simulation -> Win/Lose -> Record Score -> End.

#### 4.2.5 COMPONENT DIAGRAM
- `GamesPage.jsx`: Renders the accordion list of games and handles the AI modal.
- `AuthContext`: Manages JWT state across the app.
- `games.js` (Route): Handles CRUD for games and AI proxying.
- `db.js`: PostgreSQL connection pool.

#### 4.2.6 DEPLOYMENT DIAGRAM
- Client Browser <--> Node.js Server (Port 5000) <--> PostgreSQL Database (Port 5432)
- Node.js Server <--> External Groq AI API

### 4.3 ALGORITHMS

#### 4.3.1 ALGORITHM 1: AI Code Generation Pipeline
1. Receive instructions and title from user.
2. Inject strict system prompt enforcing React constraints (Tailwind, Lucide icons, single file).
3. Call LLM API (llama-3.3-70b-versatile).
4. Parse response using Regex to extract JSX code block.
5. Write code to file system using Node `fs` module.
6. Commit metadata to database.

#### 4.3.2 ALGORITHM 2: Binary Search Tree Insertion (Game Logic)
1. Receive incoming node value.
2. If tree is empty, set as root.
3. If value < current node, traverse left. If left is null, insert.
4. If value > current node, traverse right. If right is null, insert.
5. Compare player's choice against calculated correct path.

#### 4.3.3 ALGORITHM 3: FCFS CPU Scheduling (Game Logic)
1. Queue incoming processes with Burst Times.
2. Process processes strictly in arrival order.
3. Calculate Waiting Time = Previous Process Completion Time - Current Arrival Time.
4. Validate player's assignment of processes to the CPU timeline.

#### 4.3.4 ALGORITHM 4: Banker's Algorithm (Game Logic)
1. Track Available, Max, and Allocation matrices.
2. Need = Max - Allocation.
3. When player grants request: Check if Request <= Need and Request <= Available.
4. If true, temporarily allocate. If system remains in safe state, approve. Else, deny.

#### 4.3.5 ALGORITHM 5: Role-Based JWT Auth
1. Receive Google OAuth credential.
2. Verify token with Google Library.
3. Query DB by email. If new user, assign default role (Teacher for admin email, Student for others).
4. Sign JWT containing user ID and Role.
5. Middleware verifies JWT on every protected route.

---

## 5. CODING, IMPLEMENTATION & RESULTS

### 5.1 PSEUDO CODE (AI Generation Route)
```javascript
route POST '/api/games/generate':
  verify_teacher_token()
  prompt = construct_prompt(request.body)
  response = call_groq_api(prompt)
  code = extract_jsx(response)
  file_path = "frontend/src/components/" + request.body.title + "Game.jsx"
  save_to_disk(file_path, code)
  insert_db(request.body)
  return success
```

### 5.2 EXPLANATION OF KEY FUNCTIONS
- **`authenticateToken`**: Express middleware that intercepts requests, reads the Authorization header, verifies the JWT secret, and attaches the user object to the request.
- **`requireRole(role)`**: Middleware that checks if `req.user.role` matches the required permission level before allowing access to destructive endpoints.
- **`playGame(game)`**: React function that sets the active game state and dynamically renders the corresponding imported React component.

### 5.3 METHOD OF IMPLEMENTATION
The project was implemented using Vite for rapid React frontend development and Express for a lightweight backend. PostgreSQL was chosen for its robust relational integrity.

#### 5.3.1 OUTPUT SCREENS
*(Note: Attach screenshots of the Login Page, Dashboard, Games Accordion, AI Create Game Modal, and an active Game Simulation here before printing).*

#### 5.3.2 RESULT ANALYSIS
The platform successfully allows instant login via Google. The AI generation feature successfully outputs playable mini-games (e.g., Tree Climber, Sorting Master) in under 10 seconds. Database insertions maintain referential integrity with cascading deletes functioning as expected.

---

## 6. TESTING & VALIDATION
- **Authentication Testing**: Verified that unauthorized users receive 401/403 errors when attempting to access Teacher routes.
- **Integration Testing**: Verified that deleting a game from the UI successfully propagates the DELETE command to the PostgreSQL database and removes the item from the React state without requiring a refresh.
- **AI Validation**: Tested multiple prompts to ensure the LLM strictly adheres to returning only JSX code without markdown wrappers that break the compilation.

---

## 7. CONCLUSION
LearnApp successfully demonstrates a modern approach to interactive education. By combining a robust PERN stack architecture with cutting-edge Large Language Models, the platform solves the bottleneck of content creation. Teachers can now instantly generate complex algorithmic simulations, providing students with an ever-expanding library of engaging, gamified Computer Science learning tools.

---

## REFERENCES
1. React Documentation: https://react.dev/
2. Node.js & Express Documentation: https://expressjs.com/
3. PostgreSQL Documentation: https://www.postgresql.org/
4. Groq API Documentation: https://console.groq.com/docs/
5. Tailwind CSS: https://tailwindcss.com/
