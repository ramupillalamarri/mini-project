import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, Cpu, ShieldAlert, Award, AlertCircle, Info, ArrowUp, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRIORITY_LABELS = {
  1: { text: 'High', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: '#ef4444' },
  2: { text: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: '#f59e0b' },
  3: { text: 'Low', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: '#3b82f6' }
};

const PriorityDispatcherGame = ({ onGameComplete, highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, gameover, completed
  const [score, setScore] = useState(0);
  const [stability, setStability] = useState(100);
  const [queue, setQueue] = useState([]);
  const [cpuProcess, setCpuProcess] = useState(null);
  
  const [feedback, setFeedback] = useState(null);
  const gameLoopRef = useRef(null);
  const processIdCounter = useRef(1);

  const initGame = () => {
    setGameState('playing');
    setScore(0);
    setStability(100);
    setQueue([]);
    setCpuProcess(null);
    processIdCounter.current = 1;
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  const showFeedback = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2000);
  };

  const spawnProcess = () => {
    const priorities = [1, 2, 3];
    const prio = priorities[Math.floor(Math.random() * priorities.length)];
    const burst = Math.floor(Math.random() * 5) + 3; // 3 to 7
    
    const newProc = {
      id: processIdCounter.current++,
      priority: prio,
      burstTime: burst,
      remainingTime: burst,
      waitTime: 0,
      starving: false
    };

    setQueue(prev => {
      if (prev.length >= 6) return prev; // Limit queue size
      return [...prev, newProc];
    });
  };

  // Main game ticks
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        // Randomly spawn processes
        if (Math.random() < 0.25) {
          spawnProcess();
        }

        // Increment wait times for processes in queue
        setQueue(prev => {
          let updated = prev.map(p => {
            const nextWait = p.waitTime + 1;
            const starving = nextWait > 12 && p.priority > 1; // Starving if waiting > 12s and not High priority
            return { ...p, waitTime: nextWait, starving };
          });

          // Check if any process starved to death (stability penalty)
          const starvedCount = updated.filter(p => p.waitTime > 22).length;
          if (starvedCount > 0) {
            setStability(s => {
              const nextS = Math.max(0, s - 10 * starvedCount);
              if (nextS <= 0) {
                setGameState('gameover');
              }
              return nextS;
            });
            showFeedback('Process starved! System stability reduced.', 'error');
            updated = updated.filter(p => p.waitTime <= 22); // remove starved processes
          }
          return updated;
        });

        // Run CPU process
        setCpuProcess(curr => {
          if (!curr) return null;
          const nextRemaining = curr.remainingTime - 0.5;
          if (nextRemaining <= 0) {
            setScore(s => s + 25);
            showFeedback('Process Completed! +25', 'success');
            return null;
          }
          return { ...curr, remainingTime: nextRemaining };
        });

      }, 1000);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [gameState, cpuProcess]);

  const handleDispatch = (proc) => {
    if (cpuProcess) {
      showFeedback('CPU is currently busy!', 'error');
      return;
    }

    // Check if there is a higher priority process in the queue
    const minPriority = Math.min(...queue.map(p => p.priority));
    if (proc.priority > minPriority) {
      showFeedback('Scheduling Penalty! Dispatch the highest priority process first.', 'error');
      setScore(s => Math.max(0, s - 10));
      return;
    }

    // Dispatch
    setCpuProcess(proc);
    setQueue(prev => prev.filter(p => p.id !== proc.id));
    showFeedback('Process Dispatched!', 'success');
  };

  const handleAge = (id) => {
    // Increase priority (decrease priority number)
    setQueue(prev => prev.map(p => {
      if (p.id === id && p.priority > 1) {
        return { ...p, priority: p.priority - 1, waitTime: 0, starving: false };
      }
      return p;
    }));
    showFeedback('Aged process priority up!', 'success');
  };

  return (
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Cpu size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-200">Priority Dispatcher</h2>
            <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-wider">
              Scheduling & Starvation Challenge
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stability</span>
            <span className={`text-2xl font-black ${stability > 50 ? 'text-emerald-450' : 'text-rose-500 animate-pulse'}`}>
              {stability}%
            </span>
          </div>
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
      <div className="flex-1 flex flex-col md:flex-row p-6 bg-slate-950/20 gap-6">
         
         {/* Left Side: Ready Queue */}
         <div className="w-full md:w-1/2 flex flex-col bg-slate-900/40 rounded-2xl border border-indigo-500/10 p-5">
           <div className="mb-4">
             <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs sm:text-sm">Ready Queue</h3>
             <p className="text-[10px] text-slate-500">Click to Dispatch highest priority process first. Prevent starvation!</p>
           </div>

           <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
             <AnimatePresence>
               {queue.map(p => {
                 const label = PRIORITY_LABELS[p.priority];
                 return (
                   <motion.div
                     key={p.id}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 20 }}
                     className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${p.starving ? 'border-rose-500 bg-rose-950/20 animate-pulse' : 'border-slate-800 bg-slate-950/40'}`}
                   >
                     <div className="flex items-center gap-3">
                       <div 
                         className="px-2.5 py-1 rounded text-xxs font-bold uppercase border"
                         style={{ color: label.color, backgroundColor: label.bg, borderColor: label.border }}
                       >
                         {label.text}
                       </div>
                       <div>
                         <span className="font-bold text-slate-200">Process P{p.id}</span>
                         <span className="text-[10px] text-slate-500 block">Burst Time: {p.burstTime}s | Wait: {p.waitTime}s</span>
                       </div>
                     </div>

                     <div className="flex gap-2">
                       {p.priority > 1 && (
                         <button
                           onClick={() => handleAge(p.id)}
                           className="p-2 bg-indigo-950 text-indigo-400 rounded-lg hover:bg-indigo-900 border border-indigo-550/20 flex items-center gap-0.5 text-xxs font-bold uppercase"
                           title="Age process to raise priority"
                         >
                           <ArrowUp size={12} /> Age
                         </button>
                       )}
                       <button
                         onClick={() => handleDispatch(p)}
                         className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xxs font-bold uppercase rounded-lg shadow-md"
                       >
                         Dispatch
                       </button>
                     </div>
                   </motion.div>
                 );
               })}
             </AnimatePresence>

             {queue.length === 0 && (
               <div className="flex-1 flex items-center justify-center text-slate-600 text-xs font-bold animate-pulse">
                 Ready queue is empty
               </div>
             )}
           </div>
         </div>

         {/* Right Side: CPU Execution Core */}
         <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-slate-900/20 rounded-2xl border border-indigo-500/10 p-5">
           <div className="text-center mb-6">
             <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs sm:text-sm mb-1">CPU core execution</h3>
             <p className="text-[10px] text-slate-500">Currently executing process</p>
           </div>

           <div className="w-64 h-56 bg-slate-950 border-2 border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 transition-all duration-300">
             {cpuProcess ? (
               <div className="flex flex-col items-center w-full">
                 <div 
                   className="w-20 h-20 rounded-2xl shadow-xl flex items-center justify-center animate-pulse border border-white/20"
                   style={{ background: PRIORITY_LABELS[cpuProcess.priority].color }}
                 >
                   <span className="text-white font-black text-3xl">P{cpuProcess.id}</span>
                 </div>
                 
                 <div className="mt-6 w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
                   <div 
                     className="bg-indigo-500 h-full rounded-full transition-all" 
                     style={{ width: `${(cpuProcess.remainingTime / cpuProcess.burstTime) * 100}%` }}
                   ></div>
                 </div>
                 <span className="text-[10px] font-bold text-slate-550 mt-3 uppercase tracking-wider">{cpuProcess.remainingTime.toFixed(1)}s remaining</span>
               </div>
             ) : (
               <div className="flex flex-col items-center text-slate-600">
                 <Cpu size={40} className="mb-3 opacity-30" />
                 <span className="text-xs font-bold uppercase tracking-wider">CPU Idle</span>
               </div>
             )}
           </div>
         </div>

      </div>

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative text-white">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-355 hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
              <Cpu size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Priority Dispatcher</h2>
            <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
              Schedule CPU threads according to Priority. Use Aging to prevent lower-priority threads from starving!
            </p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Always dispatch the highest priority (Red &gt; Yellow &gt; Blue) process first.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Low-priority processes will **starve** if ignored for too long. Starvation lowers system stability!</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Click the <b>Age</b> button to promote a thread's priority and reset its starvation timer.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all text-lg flex items-center justify-center"
            >
              Start Dispatching
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-455">
              <ShieldAlert size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">System Failure!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">System stability reached 0% due to excessive process starvation.</p>
            
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

export default PriorityDispatcherGame;
