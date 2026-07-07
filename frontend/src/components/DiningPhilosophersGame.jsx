import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, ShieldAlert, Award, AlertCircle, Info, CheckCircle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PHILOSOPHER_STATES = {
  THINKING: { text: 'Thinking', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  HUNGRY: { text: 'Hungry!', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  EATING: { text: 'Eating', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
};

const DiningPhilosophersGame = ({ onGameComplete, highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, gameover
  const [score, setScore] = useState(0);
  const [philosophers, setPhilosophers] = useState([
    { id: 0, name: 'Socrates', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] },
    { id: 1, name: 'Plato', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] },
    { id: 2, name: 'Aristotle', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] },
    { id: 3, name: 'Descartes', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] },
    { id: 4, name: 'Nietzsche', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] }
  ]);

  // Chopsticks allocation: Array of 5 chopsticks. Value is holding philosopher id, or null if free.
  // Chopstick i is between philosopher i and (i+1)%5.
  const [chopsticks, setChopsticks] = useState([null, null, null, null, null]);
  const [feedback, setFeedback] = useState(null);

  const gameLoopRef = useRef(null);

  const initGame = () => {
    setGameState('playing');
    setScore(0);
    setChopsticks([null, null, null, null, null]);
    setPhilosophers([
      { id: 0, name: 'Socrates', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] },
      { id: 1, name: 'Plato', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] },
      { id: 2, name: 'Aristotle', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] },
      { id: 3, name: 'Descartes', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] },
      { id: 4, name: 'Nietzsche', state: 'THINKING', hungryTime: 0, holdingChopsticks: [] }
    ]);
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  const showFeedback = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleGameOver = (reason) => {
    setGameState('gameover');
    showFeedback(reason, 'error');
  };

  // Main game tick (cycles state and increments hunger)
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        // 1. Update philosophers thinking/hungry cycle
        setPhilosophers(prev => {
          let updated = prev.map(p => {
            if (p.state === 'THINKING') {
              // 20% chance to become hungry
              if (Math.random() < 0.2) {
                return { ...p, state: 'HUNGRY', hungryTime: 0 };
              }
            } else if (p.state === 'HUNGRY') {
              const nextHunger = p.hungryTime + 1;
              if (nextHunger > 18) {
                // Starvation death
                handleGameOver(`${p.name} starved! You took too long to feed them.`);
              }
              return { ...p, hungryTime: nextHunger };
            }
            return p;
          });
          return updated;
        });

        // 2. Check for Deadlock state:
        // Deadlock happens if all 5 philosophers are holding exactly 1 chopstick.
        // Or if all chopsticks are allocated, but no philosopher is eating (no one has both).
        setChopsticks(currentChopsticks => {
          setPhilosophers(currentPhilosophers => {
            const holdingOneCount = currentPhilosophers.filter(p => p.holdingChopsticks.length === 1).length;
            const eatingCount = currentPhilosophers.filter(p => p.state === 'EATING').length;

            if (holdingOneCount === 5 && eatingCount === 0) {
              handleGameOver('Deadlock! Every philosopher holds 1 chopstick. Circular Wait occurred.');
            }
            return currentPhilosophers;
          });
          return currentChopsticks;
        });

      }, 1000);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [gameState]);

  // Allocate chopstick i to philosopher pId
  const allocateChopstick = (chopstickIdx, pId) => {
    if (gameState !== 'playing') return;

    // Check if chopstick is free
    if (chopsticks[chopstickIdx] !== null) {
      showFeedback('Chopstick is already in use!', 'error');
      return;
    }

    // Check if chopstick is adjacent to philosopher
    const phil = philosophers[pId];
    const leftChopstick = pId;
    const rightChopstick = (pId + 4) % 5;

    if (chopstickIdx !== leftChopstick && chopstickIdx !== rightChopstick) {
      showFeedback('You can only grab adjacent chopsticks!', 'error');
      return;
    }

    if (phil.state !== 'HUNGRY') {
      showFeedback('Philosopher is not hungry!', 'error');
      return;
    }

    // Assign chopstick
    const nextChopsticks = [...chopsticks];
    nextChopsticks[chopstickIdx] = pId;
    setChopsticks(nextChopsticks);

    setPhilosophers(prev => prev.map(p => {
      if (p.id === pId) {
        const nextHolding = [...p.holdingChopsticks, chopstickIdx];
        
        // If holding both adjacent chopsticks, transition to EATING
        const leftAdjacent = pId;
        const rightAdjacent = (pId + 4) % 5;
        const holdsBoth = nextHolding.includes(leftAdjacent) && nextHolding.includes(rightAdjacent);

        if (holdsBoth) {
          // Trigger eating timeline
          setTimeout(() => releaseChopsticks(pId), 4000); // Eats for 4 seconds
          return { ...p, state: 'EATING', holdingChopsticks: nextHolding, hungryTime: 0 };
        }

        return { ...p, holdingChopsticks: nextHolding };
      }
      return p;
    }));
  };

  const releaseChopsticks = (pId) => {
    setChopsticks(prevChopsticks => {
      const nextChopsticks = prevChopsticks.map(c => c === pId ? null : c);
      
      setPhilosophers(prevPhil => {
        const nextPhil = prevPhil.map(p => {
          if (p.id === pId) {
            setScore(s => s + 10);
            showFeedback(`${p.name} finished eating! +10`, 'success');
            return { ...p, state: 'THINKING', holdingChopsticks: [] };
          }
          return p;
        });
        return nextPhil;
      });
      return nextChopsticks;
    });
  };

  // Coordinates mapping for Circular Table Visualization
  const getPhilosopherCoords = (id) => {
    const angle = (id * 2 * Math.PI) / 5 - Math.PI / 2;
    return {
      x: 300 + 100 * Math.cos(angle),
      y: 150 + 100 * Math.sin(angle)
    };
  };

  const getChopstickCoords = (id) => {
    // Chopstick i is between philosopher i and (i+1)%5
    const angle = ((id + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2;
    return {
      x1: 300 + 60 * Math.cos(angle),
      y1: 150 + 60 * Math.sin(angle),
      x2: 300 + 110 * Math.cos(angle),
      y2: 150 + 110 * Math.sin(angle),
      midX: 300 + 85 * Math.cos(angle),
      midY: 150 + 85 * Math.sin(angle)
    };
  };

  return (
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Activity size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-200">Dining Philosophers</h2>
            <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-wider">
              Concurrency & Deadlock Simulator
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</span>
            <span className="text-2xl font-black text-violet-400">{score}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
             <button
              onClick={() => setGameState(prev => prev === 'playing' ? 'paused' : 'playing')}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-355 rounded-xl transition-all"
              disabled={gameState === 'start' || gameState === 'gameover'}
            >
              {gameState === 'playing' ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={initGame}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-355 rounded-xl transition-all"
              title="Restart Game"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => onGameComplete(score)}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-rose-950/20 hover:text-rose-455 text-slate-400 rounded-xl transition-all"
              title="Exit Game"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6">
         
         {/* Left Side: Circular Table SVG (Fully Responsive) */}
         <div className="flex-1 bg-slate-900/40 rounded-2xl border border-indigo-500/10 p-5 flex flex-col justify-center items-center">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Dining Table</h3>
            
            <div className="w-full h-full max-h-[300px] flex items-center justify-center">
              <svg 
                viewBox="0 0 600 300" 
                className="w-full h-full max-w-[600px] max-h-[300px] overflow-visible"
              >
                {/* Dinner Table Circle */}
                <circle cx="300" cy="150" r="80" fill="rgba(30, 41, 59, 0.4)" stroke="#1e293b" strokeWidth="4" />

                {/* Chopsticks lines */}
                {chopsticks.map((holder, idx) => {
                  const coords = getChopstickCoords(idx);
                  const isFree = holder === null;
                  return (
                    <g key={`chop-${idx}`}>
                      <line 
                        x1={coords.x1} y1={coords.y1} 
                        x2={coords.x2} y2={coords.y2} 
                        stroke={isFree ? '#64748b' : '#38bdf8'} 
                        strokeWidth="5" 
                        strokeLinecap="round"
                        className={isFree ? 'opacity-40' : 'animate-pulse'}
                      />
                    </g>
                  );
                })}

                {/* Philosophers circles */}
                {philosophers.map(p => {
                  const coords = getPhilosopherCoords(p.id);
                  const label = PHILOSOPHER_STATES[p.state];
                  
                  return (
                    <g key={p.id} transform={`translate(${coords.x}, ${coords.y})`}>
                      {p.state === 'HUNGRY' && (
                        <circle r="26" fill="none" stroke="#fbbf24" strokeWidth="2" className="animate-ping opacity-30" />
                      )}
                      <circle 
                        r="22" 
                        fill="#0f172a" 
                        stroke={p.state === 'HUNGRY' ? '#fbbf24' : (p.state === 'EATING' ? '#10b981' : '#475569')} 
                        strokeWidth="3.5" 
                      />
                      <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f1f5f9">{p.name.substring(0, 5)}</text>
                      
                      {/* State Tag */}
                      <rect x="-24" y="26" width="48" height="14" rx="4" fill={label.bg} stroke={label.color} strokeWidth="1" />
                      <text x="0" y="36" textAnchor="middle" fontSize="7" fontWeight="bold" fill={label.color}>{label.text}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
         </div>

         {/* Right Side: Allocation Dashboard Control */}
         <div className="w-full lg:w-80 flex flex-col bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-5">
           <div className="mb-4">
             <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs sm:text-sm">Chopstick Allocator</h3>
             <p className="text-[10px] text-slate-500">Pick up adjacent chopsticks for hungry philosophers. Don't let everyone hold 1!</p>
           </div>

           <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
             {philosophers.map(p => {
               const leftChop = p.id;
               const rightChop = (p.id + 4) % 5;
               
               const hasLeft = p.holdingChopsticks.includes(leftChop);
               const hasRight = p.holdingChopsticks.includes(rightChop);

               return (
                 <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                   <div>
                     <span className="font-bold text-xs sm:text-sm text-slate-205">{p.name}</span>
                     <span className="text-[9px] text-slate-500 block">Chopsticks: {p.holdingChopsticks.length}/2</span>
                   </div>

                   {p.state === 'HUNGRY' ? (
                     <div className="flex gap-1.5">
                       <button
                         onClick={() => allocateChopstick(leftChop, p.id)}
                         disabled={hasLeft}
                         className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-550/20 text-xxs font-bold uppercase rounded disabled:opacity-40"
                       >
                         Left
                       </button>
                       <button
                         onClick={() => allocateChopstick(rightChop, p.id)}
                         disabled={hasRight}
                         className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-550/20 text-xxs font-bold uppercase rounded disabled:opacity-40"
                       >
                         Right
                       </button>
                     </div>
                   ) : (
                     <span className="text-xxs font-bold text-slate-500 uppercase tracking-widest">{p.state}</span>
                   )}
                 </div>
               );
             })}
           </div>
         </div>

      </div>

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative text-white">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-350 hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
              <Activity size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Dining Philosophers</h2>
            <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
              Resolve chopstick contention. Allocate resource semaphores without creating a Deadlock state!
            </p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>When philosophers become <b>Hungry</b>, assign them adjacent left/right chopsticks.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>If all 5 philosophers hold 1 chopstick, a <b>Deadlock</b> occurs, crashing the system!</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Manage chopstick handovers efficiently to prevent any philosopher from starving.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all text-lg flex items-center justify-center"
            >
              Start Simulator
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-455">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">Deadlock Detected!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">{feedback?.msg || 'Resource deadlock state reached.'}</p>
            
            <div className="bg-slate-950 border border-indigo-950 rounded-xl p-6 mb-8">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-indigo-400">{score}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={initGame}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl transition-all border border-slate-750"
              >
                <RotateCcw size={20} />
                Try Again
              </button>
              <button 
                onClick={() => onGameComplete(score)}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Feedback Toast */}
      {feedback && gameState === 'playing' && (
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-fade-in ${feedback.type === 'error' ? 'bg-rose-600 border border-rose-500/25' : 'bg-emerald-600 border border-emerald-500/25'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default DiningPhilosophersGame;
