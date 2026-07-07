import { useState, useEffect, useContext, Suspense, useMemo, lazy } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContextValue';
import { useToast } from '../context/ToastContext';
import { Gamepad2, Award, Plus, Trash2, ChevronDown, ChevronUp, Book, Wand2, X } from 'lucide-react';

const gameModules = import.meta.glob('../components/*.jsx');

const getComponentName = (title) => {
  if (title.includes('Scheduler')) return 'SchedulerTowerDefense';
  if (title.includes('Memory Manager')) return 'MemoryManagerGame';
  if (title.includes('Deadlock Escape')) return 'BankersAlgorithmGame';
  if (title.includes('Packet Navigator')) return 'PacketNavigatorGame';
  if (title.includes('ARQ Battle')) return 'ARQBattleGame';
  if (title.includes('Protocol Race')) return 'ProtocolRaceGame';
  if (title.includes('Tree Climber')) return 'TreeClimberGame';
  if (title.includes('Sorting Master')) return 'SortingMasterGame';
  
  // New Web Dev Games Mapping:
  if (title.includes('Interactive Plate Table')) return 'InteractivePlateTableGame';
  if (title.includes('Flexbox Frog Hopper')) return 'FlexboxFrogHopperGame';
  if (title.includes('DOM Node Explorer')) return 'DomNodeExplorerGame';
  if (title.includes('Asynchronous Pipeline')) return 'AsynchronousPipelineGame';

  // New Operating System Games Mapping:
  if (title.includes('Priority Dispatcher')) return 'PriorityDispatcherGame';
  if (title.includes('Page Frame Architect')) return 'PageReplacementGame';
  if (title.includes('Dining Philosophers')) return 'DiningPhilosophersGame';
  
  // New Data Structures Games Mapping:
  if (title.includes('Stack & Queue Cargo')) return 'StackQueueCargoGame';
  
  // Default fallback for dynamic games:
  return title.replace(/[^a-zA-Z0-9]/g, '') + 'Game';
};

const GAME_DETAILS = {
  'FCFS Scheduler': {
    desc: 'CPU scheduling dispatcher using the First-Come First-Served algorithm.',
    rules: [
      'Dispatch processes strictly in arrival order (oldest first).',
      'Missing deadlines reduces system stability.',
      'Maintain stability above 0% to win.'
    ]
  },
  'SJF Scheduler': {
    desc: 'CPU scheduling dispatcher using the Shortest Job First algorithm.',
    rules: [
      'Dispatch processes in ascending order of remaining burst times.',
      'Missing deadlines reduces system stability.',
      'SJF minimizes average waiting times.'
    ]
  },
  'Round Robin Scheduler': {
    desc: 'CPU scheduling dispatcher using Round Robin time slicing.',
    rules: [
      'Process threads run for a maximum of 3 seconds (Time Quantum).',
      'Preempted tasks return to the tail of the queue.',
      'Evict/rotate properly to prevent system crash.'
    ]
  },
  'Priority Dispatcher (Priority CPU Scheduling)': {
    desc: 'Dispatcher using Priority Queue scheduling and Starvation mitigation.',
    rules: [
      'Dispatch high priority (Red) processes before lower ones.',
      'Low-priority processes starve if ignored, reducing stability.',
      'Click "Age" to increase priority level and reset starvation timers.'
    ]
  },
  'Memory Manager: First Fit': {
    desc: 'Dynamic memory allocator using First Fit placement policy.',
    rules: [
      'Allocate incoming processes to the very first free block that is large enough.',
      'Use Compaction to group fragmented free blocks together.',
      'Memory overflow will crash the manager.'
    ]
  },
  'Memory Manager: Best Fit': {
    desc: 'Dynamic memory allocator using Best Fit placement policy.',
    rules: [
      'Allocate incoming processes to the free block that fits closest in size.',
      'Best Fit minimizes leftover fragment sizes.',
      'Use Compaction when memory becomes highly fragmented.'
    ]
  },
  'Memory Manager: Worst Fit': {
    desc: 'Dynamic memory allocator using Worst Fit placement policy.',
    rules: [
      'Allocate incoming processes to the largest available free block.',
      'Worst Fit leaves larger fragments for future processes.',
      'Use Compaction strategically before overflow occurs.'
    ]
  },
  'Page Frame Architect (Page Replacement)': {
    desc: 'Page Replacement simulator using FIFO or LRU policies.',
    rules: [
      'If page is in the frames, click "Page Hit" to access it.',
      'For Page Faults, click the empty frame, or evict according to rules.',
      'FIFO evicts the oldest page; LRU evicts the least recently accessed page.'
    ]
  },
  "Deadlock Escape: Banker's Algorithm": {
    desc: "Resource allocation dispatcher validating Bankers Safety Algorithm.",
    rules: [
      "Analyze incoming process resource request vectors.",
      "Grant only if a safe execution sequence remains possible.",
      "Denying safe requests or causing deadlock ends the game."
    ]
  },
  'Dining Philosophers Manager (Concurrency)': {
    desc: 'Resource allocation and dining philosophers synchronization challenge.',
    rules: [
      'Assign adjacent chopsticks to hungry philosophers so they can eat.',
      'Deadlock occurs if all philosophers hold exactly 1 chopstick.',
      'Philosophers starve if ignored for too long.'
    ]
  },
  'Packet Navigator: Routing & IP Challenge': {
    desc: 'Routing simulator finding optimal paths across nodes.',
    rules: [
      'Click adjacent routers to route the packet to the destination IP.',
      'Avoid orange congested links (costs are multiplied by 3).',
      'Never revisit a router. Loops cause packet drops.'
    ]
  },
  'ARQ Battle: Reliable Data Transmission Simulator': {
    desc: 'Automatic Repeat Query pipeline protocol simulator.',
    rules: [
      'Observe Stop-and-Wait, Go-Back-N, and Selective Repeat behaviors.',
      'Watch GBN/SR automatically retransmit lost or corrupt data frames.',
      'Earn points for higher successful packet delivery rates.'
    ]
  },
  'Protocol Race: TCP vs UDP Showdown': {
    desc: 'Comparison simulator evaluating TCP and UDP transport protocols.',
    rules: [
      'Select TCP (reliable, ACK-verified) or UDP (fast, lossy).',
      'Evaluate real-world scenarios: video, banking, gaming, downloads.',
      'Earn points for picking the optimal transport layer choice.'
    ]
  },
  'Tree Climber': {
    desc: 'Binary Search Tree traversal insertion game.',
    rules: [
      'Look at the incoming node value card.',
      'Traverse BST: left if value is smaller, right if larger.',
      'Click the correct dashed placeholder slot to insert the node.'
    ]
  },
  'Stack & Queue Cargo Loader': {
    desc: 'LIFO and FIFO train cargo loading and buffer manipulation puzzle.',
    rules: [
      'Load crates into the Stack (Last-In First-Out) or Queue (First-In First-Out).',
      'Shift items to match the cargo sequences specified in the loading manifest.',
      'Earn points for each correctly loaded crate and complete levels under the move limit.'
    ]
  },
  'Sorting Master': {
    desc: 'Interactive array sorting visualizer challenge.',
    rules: [
      'Arrange bars in ascending order by clicking to swap.',
      'Level 1: Bubble Sort (only adjacent out-of-order swaps allowed).',
      'Level 2: Selection Sort (swap minimum element into place).'
    ]
  },
  'The Interactive Plate Table (CSS Selectors)': {
    desc: 'CSS Selector visual targeting challenge.',
    rules: [
      'Target plates and food items using CSS selector rules.',
      'Use elements, attributes, child selectors, and pseudo-classes.',
      'Correct selectors complete levels and increase score.'
    ]
  },
  'Flexbox Frog Hopper (CSS Layouts)': {
    desc: 'Flexbox alignment Pad-hopper layouts game.',
    rules: [
      'Position frogs onto pads using CSS Flexbox layout properties.',
      'Utilize justify-content, align-items, and flex-direction rules.',
      'Complete levels to solve layout challenges.'
    ]
  },
  'DOM Node Explorer (HTML Structure)': {
    desc: 'Interactive HTML DOM structure node traversal challenge.',
    rules: [
      'Traverse node lists and parents of the SVG DOM hierarchy.',
      'Find root, children, siblings, and attributes.',
      'Earn points for accurate HTML structural traversal.'
    ]
  },
  'Asynchronous Pipeline (JavaScript Execution)': {
    desc: 'Event Loop queuing timeline dispatcher.',
    rules: [
      'Sequence JavaScript calls: Synchronous stack, Microtasks, Macrotasks.',
      'Observe execution order of promises, setTimeout, and standard functions.',
      'Avoid sequence blocks and out-of-order execution errors.'
    ]
  }
};

const GamesPage = () => {
  const { showToast } = useToast();
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userScores, setUserScores] = useState([]);
  
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  
  // Game state
  const [activeGame, setActiveGame] = useState(null);
  const [descGame, setDescGame] = useState(null);
  const [score, setScore] = useState(0);
  const [showPostGameModal, setShowPostGameModal] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const DynamicGameComponent = useMemo(() => {
    if (!activeGame) return null;
    const compName = getComponentName(activeGame.title);
    const key = Object.keys(gameModules).find(k => k.endsWith(`/${compName}.jsx`));
    if (key) {
      return lazy(gameModules[key]);
    }
    return null;
  }, [activeGame]);

  // Admin state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGame, setNewGame] = useState({ title: '', type: 'quiz', subject_id: '', topic_id: '' });
  const [showAiModal, setShowAiModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGame, setAiGame] = useState({ 
    title: '', 
    subject_id: null, 
    topic_id: null, 
    instructions: '',
    description: ''
  });

  useEffect(() => {
    const fetchSubjectsAndGames = async () => {
      try {
        const promises = [
          axios.get('/api/subjects'),
          axios.get('/api/games')
        ];
        
        const results = await Promise.all(promises);
        setSubjects(results[0].data);
        setGames(results[1].data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectsAndGames();
  }, []);

  useEffect(() => {
    if (user) {
      axios.get('/api/games/scores', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(res => setUserScores(res.data))
        .catch(err => console.error('Failed to load user scores', err));
    }
  }, [user]);

  const playGame = (game) => {
    setActiveGame(game);
    if (game.title.includes('Scheduler') || 
        game.title.includes('Memory Manager') || 
        game.title.includes('Deadlock Escape') ||
        game.title.includes('Packet Navigator') ||
        game.title.includes('ARQ Battle') ||
        game.title.includes('Protocol Race') ||
        game.title.includes('Tree Climber') ||
        game.title.includes('Sorting Master') ||
        game.title.includes('Interactive Plate Table') ||
        game.title.includes('Flexbox Frog Hopper') ||
        game.title.includes('DOM Node Explorer') ||
        game.title.includes('Asynchronous Pipeline') ||
        game.title.includes('Priority Dispatcher') ||
        game.title.includes('Page Frame Architect') ||
        game.title.includes('Dining Philosophers') ||
        game.title.includes('Stack & Queue Cargo')) {
      return;
    }
    setScore(Math.floor(Math.random() * 100)); // Simulated game score for other simple games
  };

  const handleGameComplete = async (gameScore) => {
    setScore(gameScore);
    if (user) {
      try {
        await axios.post('/api/games/score', {
          game_id: activeGame.id,
          score: gameScore,
          attempts: 1
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      } catch (e) {
        console.error(e);
      }
    }
    setShowPostGameModal(true);
  };

  const submitScore = async () => {
    if (user) {
      try {
        await axios.post('/api/games/score', {
          game_id: activeGame.id,
          score: score,
          attempts: 1
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Score saved successfully!', 'success');
      } catch (e) {
        console.error(e);
        showToast('Error saving score.', 'error');
      }
    }
    setActiveGame(null);
  };

  const handleAddGame = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/games', newGame, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setGames([res.data, ...games]);
      setShowAddModal(false);
      setNewGame({ title: '', type: 'quiz', subject_id: '', topic_id: '' });
      showToast('Game added successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error adding game.', 'error');
    }
  };

  const handleGenerateGame = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await axios.post('/api/games/generate', aiGame, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
      });
      setGames([res.data.game, ...games]);
      setShowAiModal(false);
      setAiGame({ 
        title: '', subject_id: null, topic_id: null, instructions: '', description: '' 
      });
      showToast('Game generated successfully and added to the list!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error generating game with AI. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game?')) return;
    try {
      await axios.delete(`/api/games/${gameId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setGames(prevGames => prevGames.filter(g => g.id !== gameId));
      showToast('Game deleted successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error deleting game: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {!activeGame ? (
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Interactive Games</h1>
              <p className="text-gray-500 mt-2 font-medium">Test your knowledge with immersive simulations.</p>
            </div>
            {user?.role === 'teacher' && (
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowAiModal(true)}
                  className="flex items-center px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 hover:shadow-lg transition-all"
                >
                  <Wand2 size={18} className="mr-2" />
                  AI Create Game
                </button>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center px-4 py-2.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 hover:shadow-lg transition-all"
                >
                  <Plus size={18} className="mr-2" />
                  Add Game
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {subjects.map((subject) => {
              // Get games directly under the subject (no topic)
              const topLevelGames = games.filter(g => g.subject_id === subject.id && !g.topic_id);
              
              return (
                <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in">
                  {/* Subject Header */}
                  <div 
                    className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
                        <Book size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{subject.name}</h2>
                        <p className="text-sm text-gray-500">{subject.topics?.length || 0} Topics Available</p>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {expandedSubject === subject.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>

                  {/* Topics List */}
                  {expandedSubject === subject.id && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-4">
                      
                      {/* Top level games for this subject */}
                      {topLevelGames.length > 0 && (
                         <div className="mb-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">General Subject Games</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                               {topLevelGames.map((game) => (
                                 <div key={game.id} className="flex flex-col p-4 rounded-xl border border-gray-200 bg-white hover:border-brand-300 hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                                        <Gamepad2 size={20} />
                                      </div>
                                      {user?.role === 'teacher' && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                                          className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1">{game.title}</h3>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">{game.type}</p>
                                    <button 
                                      onClick={() => setDescGame(game)}
                                      className="mt-auto w-full py-2 bg-gray-50 hover:bg-brand-50 text-gray-800 hover:text-brand-700 font-medium rounded-lg transition-colors border border-gray-200 hover:border-brand-200"
                                    >
                                      Play Now
                                    </button>
                                 </div>
                               ))}
                            </div>
                         </div>
                      )}

                      {(!subject.topics || subject.topics.length === 0) && topLevelGames.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No topics or games added yet.</p>
                      ) : (
                        subject.topics?.map(topic => {
                          const topicGames = games.filter(g => g.topic_id === topic.id);
                          return (
                            <div key={topic.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div 
                                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors border-b border-transparent"
                                onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                              >
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-800">{topic.name}</h3>
                                </div>
                                <div className="text-gray-400">
                                  {expandedTopic === topic.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                              </div>

                              {/* Topic Games */}
                              {expandedTopic === topic.id && (
                                <div className="p-4 border-t border-gray-100 bg-white">
                                  <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Interactive Games</h4>
                                  
                                  {topicGames.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {topicGames.map((game) => (
                                        <div key={game.id} className="flex flex-col p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-brand-300 hover:shadow-md transition-all group">
                                          <div className="flex justify-between items-start mb-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                              <Gamepad2 size={20} />
                                            </div>
                                            {user?.role === 'teacher' && (
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                                                className="text-gray-400 hover:text-red-500 transition-colors bg-white rounded p-1 shadow-sm border border-gray-100"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            )}
                                          </div>
                                          <h3 className="font-bold text-gray-900 mb-1">{game.title}</h3>
                                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">{game.type}</p>
                                          <button 
                                            onClick={() => setDescGame(game)}
                                            className="mt-auto w-full py-2.5 bg-white hover:bg-brand-50 text-gray-800 hover:text-brand-700 font-semibold rounded-lg transition-colors border border-gray-200 shadow-sm"
                                          >
                                            Play Now
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 italic">No games available for this topic yet.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : DynamicGameComponent ? (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>}>
          <DynamicGameComponent 
            key={gameKey}
            onGameComplete={handleGameComplete} 
            autoStart={true}
            algorithm={
              activeGame.title.startsWith('FCFS') ? 'FCFS' : 
              activeGame.title.startsWith('SJF') ? 'SJF' : 
              activeGame.title.includes('First Fit') ? 'First Fit' : 
              activeGame.title.includes('Best Fit') ? 'Best Fit' : 
              activeGame.title.includes('Worst Fit') ? 'Worst Fit' : 
              'RR'
            } 
            highScore={userScores.filter(s => s.title === activeGame.title).reduce((max, s) => Math.max(max, s.score), 0)}
          />
        </Suspense>
      ) : (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Game Complete!</h2>
            <p className="text-gray-600 mb-6">Your Score: <span className="font-bold text-2xl text-brand-600">{score}</span></p>
            <div className="flex space-x-3">
              <button 
                onClick={submitScore}
                className="flex-1 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                Save Score
              </button>
              <button 
                onClick={() => setActiveGame(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Game Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add New Game</h2>
            <form onSubmit={handleAddGame} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select 
                  required
                  value={newGame.subject_id || ''}
                  onChange={e => setNewGame({...newGame, subject_id: e.target.value, topic_id: ''})}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              {newGame.subject_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <select 
                    required
                    value={newGame.topic_id || ''}
                    onChange={e => setNewGame({...newGame, topic_id: e.target.value})}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="">Select Topic...</option>
                    {subjects.find(s => s.id == newGame.subject_id)?.topics?.map(t => 
                      <option key={t.id} value={t.id}>{t.name}</option>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Game Title</label>
                <input 
                  required
                  type="text" 
                  value={newGame.title}
                  onChange={e => setNewGame({...newGame, title: e.target.value})}
                  className="w-full border rounded-lg p-2"
                  placeholder="e.g. FCFS Scheduler"
                />
              </div>
              <input type="hidden" value={newGame.type} />
              <div className="flex space-x-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Create Game Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center mb-4 text-indigo-600">
              <Wand2 size={24} className="mr-2" />
              <h2 className="text-xl font-bold">AI Create Game</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">Dynamically generate a new React game component using Groq AI.</p>
            
            <form onSubmit={handleGenerateGame} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select 
                    required
                    value={aiGame.subject_id || ''}
                    onChange={e => setAiGame({...aiGame, subject_id: e.target.value, topic_id: null})}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Subject...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                
                {aiGame.subject_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</label>
                    <select 
                      value={aiGame.topic_id || ''}
                      onChange={e => setAiGame({...aiGame, topic_id: e.target.value})}
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Top Level (No Topic)</option>
                      {subjects.find(s => s.id == aiGame.subject_id)?.topics?.map(t => 
                        <option key={t.id} value={t.id}>{t.name}</option>
                      )}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Game Title (UI)</label>
                  <input 
                    required
                    type="text" 
                    value={aiGame.title}
                    onChange={e => setAiGame({...aiGame, title: e.target.value})}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Protocol Matcher"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Creation Instructions</label>
                <textarea 
                  required
                  rows="4"
                  value={aiGame.instructions}
                  onChange={e => setAiGame({...aiGame, instructions: e.target.value})}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="How should Groq create the game? E.g. 'Create a drag and drop game...'"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea 
                  rows="2"
                  value={aiGame.description}
                  onChange={e => setAiGame({...aiGame, description: e.target.value})}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Extra details or context for the game..."
                ></textarea>
              </div>

              <div className="flex space-x-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setShowAiModal(false)} 
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate Game'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Game Description & How to Play Modal */}
      {descGame && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-indigo-500/25 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative text-white">
            <button
              onClick={() => setDescGame(null)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
              <Gamepad2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-center text-slate-100 mb-2">{descGame.title}</h2>
            <p className="text-slate-400 text-center text-sm font-medium mb-6 leading-relaxed">
              {GAME_DETAILS[descGame.title]?.desc || descGame.description || 'Interactive web development concepts game.'}
            </p>
            
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-indigo-950 text-left mb-6">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">How to Play</h3>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed font-medium">
                {(GAME_DETAILS[descGame.title]?.rules || ['Use visual clues to solve the interactive challenges.', 'Achieve high scores to build your concept knowledge.', 'Complete tasks without faults or errors.']).map((rule, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setDescGame(null)}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-750 text-white text-sm font-bold rounded-xl transition-all border border-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const targetGame = descGame;
                  setDescGame(null);
                  playGame(targetGame);
                }}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all"
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Complete Modal Overlay */}
      {showPostGameModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-indigo-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center text-white relative">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-450">
              <Award size={44} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2 font-sans">Game Complete!</h2>
            <p className="text-slate-400 text-sm font-medium mb-6">Your score has been stored successfully in the database.</p>
            
            <div className="bg-slate-950 border border-indigo-950 rounded-xl p-5 mb-8">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-indigo-400">{score}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setShowPostGameModal(false);
                  setGameKey(k => k + 1);
                }}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl transition-all border border-slate-700 text-sm"
              >
                Try Again
              </button>
              <button 
                onClick={() => {
                  setShowPostGameModal(false);
                  setActiveGame(null);
                }}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-sm"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GamesPage;
