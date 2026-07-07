import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Server, Award, Minimize2, AlertCircle, X, CheckCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TOTAL_MEMORY = 256; // KB

const blockColors = [
  'linear-gradient(135deg, #f87171, #ef4444)', // Red
  'linear-gradient(135deg, #60a5fa, #3b82f6)', // Blue
  'linear-gradient(135deg, #34d399, #10b981)', // Green
  'linear-gradient(135deg, #fbbf24, #f59e0b)', // Yellow
  'linear-gradient(135deg, #a78bfa, #8b5cf6)', // Purple
  'linear-gradient(135deg, #ec4899, #d946ef)', // Pink
  'linear-gradient(135deg, #2dd4bf, #14b8a6)'  // Teal
];

const generateProcess = (id) => ({
  id,
  size: Math.floor(Math.random() * 30) + 10, // 10KB to 40KB
  color: blockColors[Math.floor(Math.random() * blockColors.length)],
  name: `P${id}`
});

const MemoryManagerGame = ({ onGameComplete, highScore = 0, algorithm = 'First Fit', autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, paused, gameover
  const [score, setScore] = useState(0);
  
  // Memory layout: Array of { id, type: 'free'|'allocated', size, process }
  const [memory, setMemory] = useState([{ id: 'm0', type: 'free', size: TOTAL_MEMORY, process: null }]);
  
  // Falling process queue
  const [fallingProcess, setFallingProcess] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [compactionCooldown, setCompactionCooldown] = useState(0);
  
  const processCounterRef = useRef(1);
  const dropTimerRef = useRef(null);

  const getAlgorithmName = () => {
    return algorithm;
  };

  const getUsedMemory = () => {
    return memory.reduce((acc, seg) => acc + (seg.type === 'allocated' ? seg.size : 0), 0);
  };

  const getFragmentation = () => {
    const freeSegments = memory.filter(s => s.type === 'free');
    if (freeSegments.length <= 1) return 0;
    return freeSegments.reduce((acc, seg) => acc + seg.size, 0);
  };

  const spawnProcess = () => {
    const newP = generateProcess(processCounterRef.current++);
    setFallingProcess(newP);
  };

  const initGame = () => {
    setGameState('playing');
    setScore(0);
    setMemory([{ id: 'm0', type: 'free', size: TOTAL_MEMORY, process: null }]);
    processCounterRef.current = 1;
    spawnProcess();
    setCompactionCooldown(0);
    setFeedback(null);
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  // Main game loop (falling blocks)
  useEffect(() => {
    if (gameState === 'playing') {
      const speed = Math.max(1500 - (Math.floor(score / 200) * 200), 500); // gets faster
      dropTimerRef.current = setInterval(() => {
        if (fallingProcess) {
           autoAllocate(fallingProcess);
        }
      }, speed);
    }
    
    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [gameState, fallingProcess, memory, score]);

  // Compaction cooldown timer
  useEffect(() => {
    if (compactionCooldown > 0 && gameState === 'playing') {
      const timer = setTimeout(() => setCompactionCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [compactionCooldown, gameState]);

  const showFeedback = (msg, isError) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 1500);
  };

  const freeProcess = (segmentId) => {
    setMemory(prev => {
      let newMem = prev.map(seg => seg.id === segmentId ? { ...seg, type: 'free', process: null } : seg);
      newMem = mergeFreeBlocks(newMem);
      return newMem;
    });
    setScore(s => s + 5);
  };

  const mergeFreeBlocks = (mem) => {
    const merged = [];
    for (let i = 0; i < mem.length; i++) {
      if (mem[i].type === 'free' && merged.length > 0 && merged[merged.length - 1].type === 'free') {
        merged[merged.length - 1].size += mem[i].size;
      } else {
        merged.push({ ...mem[i] });
      }
    }
    return merged;
  };

  const autoAllocate = (process) => {
    let targetIndex = -1;
    const freeSegments = memory.map((seg, idx) => ({ ...seg, idx })).filter(s => s.type === 'free' && s.size >= process.size);

    if (freeSegments.length === 0) {
      showFeedback('Memory Overflow! Game Over', true);
      setGameState('gameover');
      return;
    }

    if (algorithm === 'First Fit') {
      targetIndex = freeSegments[0].idx;
    } else if (algorithm === 'Best Fit') {
      let best = freeSegments[0];
      for (const s of freeSegments) {
        if (s.size < best.size) best = s;
      }
      targetIndex = best.idx;
    } else {
      let worst = freeSegments[0];
      for (const s of freeSegments) {
        if (s.size > worst.size) worst = s;
      }
      targetIndex = worst.idx;
    }

    allocateToSegment(targetIndex, process);
  };

  const allocateToSegment = (index, process) => {
    const newMem = [...memory];
    const target = newMem[index];
    
    if (target.size === process.size) {
      newMem[index] = { ...target, type: 'allocated', process };
    } else {
      newMem.splice(index, 1, 
        { id: Math.random().toString(), type: 'allocated', size: process.size, process },
        { id: Math.random().toString(), type: 'free', size: target.size - process.size, process: null }
      );
    }
    
    setMemory(newMem);
    setScore(s => s + 20);
    showFeedback('+20 Allocated', false);
    
    if (score > 0 && score % 200 === 0) {
       showFeedback(`Speed Increased!`, false);
    }

    const processToRemove = process;
    setTimeout(() => {
      setMemory(currentMem => {
         const idx = currentMem.findIndex(s => s.type === 'allocated' && s.process?.id === processToRemove.id);
         if (idx !== -1) {
           let memCopy = [...currentMem];
           memCopy[idx] = { ...memCopy[idx], type: 'free', process: null };
           return mergeFreeBlocks(memCopy);
         }
         return currentMem;
      });
    }, Math.random() * 8000 + 4000);

    spawnProcess();
  };

  const handleManualAllocate = (index) => {
    if (gameState !== 'playing' || !fallingProcess) return;
    const target = memory[index];
    if (target.type !== 'free' || target.size < fallingProcess.size) {
      showFeedback('Invalid Slot', true);
      setScore(s => Math.max(0, s - 5));
      return;
    }
    allocateToSegment(index, fallingProcess);
  };

  const triggerCompaction = () => {
    if (compactionCooldown > 0 || gameState !== 'playing') return;
    
    const allocated = memory.filter(s => s.type === 'allocated');
    const freeSize = memory.filter(s => s.type === 'free').reduce((acc, s) => acc + s.size, 0);
    
    const newMem = [...allocated];
    if (freeSize > 0) {
      newMem.push({ id: 'm_free', type: 'free', size: freeSize, process: null });
    }
    
    setMemory(newMem);
    setCompactionCooldown(30);
    setScore(s => s + 50);
    showFeedback('Memory Compacted!', false);
  };

  const usedMemPercent = Math.round((getUsedMemory() / TOTAL_MEMORY) * 100);

  return (
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Server size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-200">Memory Manager</h2>
            <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-wider">
              {getAlgorithmName()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Memory Use</span>
            <span className={`text-2xl font-black ${usedMemPercent > 80 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>
              {usedMemPercent}%
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Award size={18} className="text-violet-400" />
              <span className="text-2xl font-black text-violet-400">{score}</span>
            </div>
            {highScore > 0 && (
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">High: {Math.max(highScore, score)}</span>
            )}
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

      {/* Main Play Area (Responsive Grid) */}
      <div className="flex-1 flex flex-col md:flex-row bg-slate-950/20 relative overflow-hidden">
        
        {/* Left Column: RAM representation */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between items-center border-b md:border-b-0 md:border-r border-indigo-500/10 bg-slate-950/40">
           <div className="text-center mb-2 md:mb-4">
             <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs sm:text-sm">RAM MODULE</h3>
             <p className="text-[10px] text-slate-500">256 KB Total Memory</p>
           </div>
           
           <div className="w-full max-w-[220px] flex flex-col h-72 sm:h-96 bg-slate-950 border border-indigo-500/10 rounded-xl overflow-hidden shadow-2xl relative p-1.5 gap-1.5">
             {/* Render Memory Segments */}
             {memory.map((seg, idx) => (
                <div 
                  key={seg.id}
                  onClick={() => handleManualAllocate(idx)}
                  className={`w-full relative transition-all duration-300 flex items-center justify-center cursor-pointer hover:brightness-125 rounded-lg border border-indigo-500/5`}
                  style={{ 
                    height: `${(seg.size / TOTAL_MEMORY) * 100}%`,
                    background: seg.type === 'free' ? 'rgba(30, 41, 59, 0.2)' : seg.process.color
                  }}
                >
                  {seg.type === 'free' ? (
                     <span className="text-[10px] text-slate-500 font-bold font-mono tracking-wider">{seg.size}KB Free</span>
                  ) : (
                     <div className="flex flex-col items-center text-white text-center leading-none">
                       <span className="font-black text-xs sm:text-sm shadow-md">P{seg.process.id}</span>
                       <span className="text-[9px] font-bold opacity-80 mt-0.5">{seg.size}KB</span>
                     </div>
                  )}
                </div>
             ))}
           </div>
           
           <div className="mt-4 w-full max-w-[220px]">
             <button
                onClick={triggerCompaction}
                disabled={compactionCooldown > 0 || gameState !== 'playing'}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 border border-indigo-500/20"
             >
                <Minimize2 size={14} />
                {compactionCooldown > 0 ? `Compaction cooldown: ${compactionCooldown}s` : 'Compact Fragmentation'}
             </button>
           </div>
        </div>

        {/* Right Column: Incoming Process */}
        <div className="w-full md:w-1/2 p-6 flex flex-col items-center justify-between bg-slate-950/20">
           
           <div className="text-center">
             <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs sm:text-sm mb-1">Queue Pipeline</h3>
             <p className="text-[10px] text-slate-500">Allocate the incoming thread to the correct memory block</p>
           </div>

           <div className="flex-1 flex items-center justify-center my-6">
             {fallingProcess && gameState === 'playing' ? (
               <div 
                 className="w-28 sm:w-32 rounded-xl shadow-2xl border border-white/20 flex flex-col items-center justify-center animate-bounce text-white transform transition-all p-4"
                 style={{ 
                   background: fallingProcess.color,
                   height: `${Math.max(80, (fallingProcess.size / TOTAL_MEMORY) * 400)}px`
                 }}
               >
                 <span className="font-black text-xl leading-none">{fallingProcess.name}</span>
                 <span className="font-bold text-xs opacity-90 mt-1">{fallingProcess.size}KB</span>
               </div>
             ) : (
               <div className="text-slate-600 text-xs sm:text-sm font-bold">No active processes</div>
             )}
           </div>

           <div className="w-full max-w-[280px] bg-slate-900/60 p-4 rounded-xl border border-indigo-500/10">
             <div className="flex justify-between text-xxs sm:text-xs text-slate-400 font-bold mb-1.5">
               <span>External Fragmentation</span>
               <span className="font-mono">{getFragmentation()}KB</span>
             </div>
             <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
               <div className="bg-rose-500 h-full rounded-full transition-all" style={{width: `${Math.min(100, (getFragmentation() / TOTAL_MEMORY) * 100)}%`}}></div>
             </div>
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
              <Server size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Memory Manager</h2>
            <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
              Place the incoming memory threads into empty slots using the {algorithm} protocol rules!
            </p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Click any free space segment in the RAM module to allocate.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Ensure allocation choices match the selected: <b>{algorithm}</b> algorithm rules.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Use <b>Compact</b> to group memory segments when fragmentation starts to block allocation.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Allocation
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-450">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">Memory Overflow!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">Not enough contiguous RAM blocks to fit process thread allocation.</p>
            
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
      {feedback && (
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-fade-in ${feedback.isError ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default MemoryManagerGame;
