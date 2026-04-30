import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContextValue';
import { Gamepad2, Award, Plus, Trash2, ChevronDown, ChevronUp, Book, Wand2 } from 'lucide-react';
import SchedulerTowerDefense from '../components/SchedulerTowerDefense';
import MemoryManagerGame from '../components/MemoryManagerGame';
import BankersAlgorithmGame from '../components/BankersAlgorithmGame';
import PacketNavigatorGame from '../components/PacketNavigatorGame';
import ARQBattleGame from '../components/ARQBattleGame';
import ProtocolRaceGame from '../components/ProtocolRaceGame';
import TreeClimberGame from '../components/TreeClimberGame';
import SortingMasterGame from '../components/SortingMasterGame';

const GamesPage = () => {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userScores, setUserScores] = useState([]);
  
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  
  // Game state
  const [activeGame, setActiveGame] = useState(null);
  const [score, setScore] = useState(0);

  // Admin state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGame, setNewGame] = useState({ title: '', type: 'quiz', subject_id: null, topic_id: null });
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
          axios.get('http://localhost:5000/api/subjects'),
          axios.get('http://localhost:5000/api/games')
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
      axios.get('http://localhost:5000/api/games/scores', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
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
        game.title.includes('Sorting Master')) {
      return;
    }
    setScore(Math.floor(Math.random() * 100)); // Simulated game score for other simple games
  };

  const handleGameComplete = async (gameScore) => {
    setScore(gameScore);
    if (user) {
      try {
        await axios.post('http://localhost:5000/api/games/score', {
          game_id: activeGame.id,
          score: gameScore,
          attempts: 1
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      } catch (e) {
        console.error(e);
      }
    }
    setActiveGame(null);
  };

  const submitScore = async () => {
    if (user) {
      try {
        await axios.post('http://localhost:5000/api/games/score', {
          game_id: activeGame.id,
          score: score,
          attempts: 1
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        alert('Score saved successfully!');
      } catch (e) {
        console.error(e);
      }
    }
    setActiveGame(null);
  };

  const handleAddGame = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/games', newGame, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setGames([res.data, ...games]);
      setShowAddModal(false);
      setNewGame({ title: '', type: 'quiz', subject_id: null, topic_id: null });
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateGame = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await axios.post('http://localhost:5000/api/games/generate', aiGame, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
      });
      setGames([res.data.game, ...games]);
      setShowAiModal(false);
      setAiGame({ 
        title: '', subject_id: null, topic_id: null, instructions: '', description: '' 
      });
      alert(res.data.message + '\\n\\nPlease note: You must import and render this component in GamesPage.jsx manually to play it.');
    } catch (error) {
      console.error(error);
      alert('Error generating game. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/games/${gameId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setGames(prevGames => prevGames.filter(g => g.id !== gameId));
    } catch (error) {
      console.error(error);
      alert('Error deleting game: ' + (error.response?.data?.error || error.message));
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
                                      onClick={() => playGame(game)}
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
                                            onClick={() => playGame(game)}
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
      ) : activeGame.title.includes('Scheduler') ? (
        <SchedulerTowerDefense 
          onGameComplete={handleGameComplete} 
          algorithm={activeGame.title.startsWith('FCFS') ? 'FCFS' : activeGame.title.startsWith('SJF') ? 'SJF' : 'RR'} 
          highScore={userScores.filter(s => s.title === activeGame.title).reduce((max, s) => Math.max(max, s.score), 0)}
        />
      ) : activeGame.title.includes('Memory Manager') ? (
        <MemoryManagerGame 
          onGameComplete={handleGameComplete} 
          algorithm={activeGame.title.includes('First Fit') ? 'First Fit' : activeGame.title.includes('Best Fit') ? 'Best Fit' : 'Worst Fit'}
          highScore={userScores.filter(s => s.title === activeGame.title).reduce((max, s) => Math.max(max, s.score), 0)}
        />
      ) : activeGame.title.includes('Deadlock Escape') ? (
        <BankersAlgorithmGame 
          onGameComplete={handleGameComplete} 
          highScore={userScores.filter(s => s.title === activeGame.title).reduce((max, s) => Math.max(max, s.score), 0)}
        />
      ) : activeGame.title.includes('Packet Navigator') ? (
        <PacketNavigatorGame 
          onGameComplete={handleGameComplete} 
          highScore={userScores.filter(s => s.title === activeGame.title).reduce((max, s) => Math.max(max, s.score), 0)}
        />
      ) : activeGame.title.includes('ARQ Battle') ? (
        <ARQBattleGame 
          onGameComplete={handleGameComplete} 
          highScore={userScores.filter(s => s.title === activeGame.title).reduce((max, s) => Math.max(max, s.score), 0)}
        />
      ) : activeGame.title.includes('Protocol Race') ? (
        <ProtocolRaceGame 
          onGameComplete={handleGameComplete} 
          highScore={userScores.filter(s => s.title === activeGame.title).reduce((max, s) => Math.max(max, s.score), 0)}
        />
      ) : activeGame.title.includes('Tree Climber') ? (
        <TreeClimberGame 
          onGameComplete={handleGameComplete} 
          highScore={userScores.filter(s => s.title === activeGame.title).reduce((max, s) => Math.max(max, s.score), 0)}
        />
      ) : activeGame.title.includes('Sorting Master') ? (
        <SortingMasterGame 
          onGameComplete={handleGameComplete} 
        />
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
                  onChange={e => setNewGame({...newGame, subject_id: e.target.value, topic_id: null})}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              {newGame.subject_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</label>
                  <select 
                    value={newGame.topic_id || ''}
                    onChange={e => setNewGame({...newGame, topic_id: e.target.value})}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="">Top Level (No Topic)</option>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select 
                  value={newGame.type}
                  onChange={e => setNewGame({...newGame, type: e.target.value})}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="quiz">Quiz</option>
                  <option value="logic">Logic Game</option>
                  <option value="simulation">Simulation</option>
                </select>
              </div>
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

    </div>
  );
};

export default GamesPage;
