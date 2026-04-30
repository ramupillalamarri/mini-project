import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Server, Award, Minimize2, AlertCircle, X, CheckCircle, RotateCcw } from 'lucide-react';

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

const MemoryManagerGame = ({ onGameComplete, highScore = 0, algorithm = 'First Fit' }) => {
  const [gameState, setGameState] = useState('start'); // start, playing, paused, gameover
  const [score, setScore] = useState(0);
  
  // Memory layout: Array of { id, type: 'free'|'allocated', size, process }
  const [memory, setMemory] = useState([{ id: 'm0', type: 'free', size: TOTAL_MEMORY, process: null }]);
  
  // Falling process queue
  const [processQueue, setProcessQueue] = useState([]);
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
    // External fragmentation: total free space if the max free block cannot satisfy a typical request
    // We will just calculate total free space that is broken into pieces.
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

  // Main game loop (falling blocks)
  useEffect(() => {
    if (gameState === 'playing') {
      const speed = Math.max(1500 - (Math.floor(score / 200) * 200), 500); // gets faster
      dropTimerRef.current = setInterval(() => {
        // Auto-allocate if user didn't act
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
      // Merge adjacent free blocks
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

    if (algorithm === 'First Fit') { // First Fit
      targetIndex = freeSegments[0].idx;
    } else if (algorithm === 'Best Fit') { // Best Fit
      let best = freeSegments[0];
      for (const s of freeSegments) {
        if (s.size < best.size) best = s;
      }
      targetIndex = best.idx;
    } else { // Worst Fit
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
    
    // Check if player selected correct block based on level (if clicked manually)
    // For autoAllocate, it's always correct.
    
    if (target.size === process.size) {
      newMem[index] = { ...target, type: 'allocated', process };
    } else {
      // Split
      newMem.splice(index, 1, 
        { id: Math.random().toString(), type: 'allocated', size: process.size, process },
        { id: Math.random().toString(), type: 'free', size: target.size - process.size, process: null }
      );
    }
    
    setMemory(newMem);
    setScore(s => s + 20);
    showFeedback('+20 Allocated', false);
    
    // Check level progression
    // Check level progression for speed
    if (score > 0 && score % 200 === 0) {
       showFeedback(`Speed Increased!`, false);
    }

    // Schedule freeing the process after a while
    const processToRemove = process;
    setTimeout(() => {
      // Find the segment and free it, if still running
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
    setCompactionCooldown(30); // 30 seconds cooldown
    setScore(s => s + 50);
    showFeedback('Memory Compacted!', false);
  };

  const usedMemPercent = Math.round((getUsedMemory() / TOTAL_MEMORY) * 100);

  return (
    <div className="relative flex flex-col bg-slate-50 min-h-[600px] rounded-3xl shadow-xl border border-slate-200 overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <Server size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Memory Manager</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {getAlgorithmName()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memory</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-2xl font-black ${usedMemPercent > 80 ? 'text-rose-600' : 'text-indigo-600'}`}>
                {usedMemPercent}%
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Award size={18} className="text-violet-500" />
              <span className="text-2xl font-black text-violet-600">{score}</span>
            </div>
            {highScore > 0 && (
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">High Score: {Math.max(highScore, score)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 border-l-2 border-slate-100 pl-6">
             <button
              onClick={() => setGameState(prev => prev === 'playing' ? 'paused' : 'playing')}
              className="p-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm transition-all"
              disabled={gameState === 'start' || gameState === 'gameover'}
            >
              {gameState === 'playing' ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={() => onGameComplete(score)}
              className="p-3 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-colors"
              title="Exit Game"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 flex bg-slate-100 relative overflow-hidden">
        
        {/* Left Side: RAM visualization */}
        <div className="w-1/2 p-8 flex flex-col justify-end items-center relative border-r border-slate-200 bg-white shadow-[inset_-10px_0_20px_rgba(0,0,0,0.02)]">
           <div className="w-full max-w-[200px] flex flex-col h-full bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300 shadow-inner relative">
             {/* Render Memory Segments */}
             {memory.map((seg, idx) => (
                <div 
                  key={seg.id}
                  onClick={() => handleManualAllocate(idx)}
                  className={`w-full relative transition-all duration-300 flex items-center justify-center cursor-pointer hover:brightness-110 border-b border-slate-300 last:border-0`}
                  style={{ 
                    height: `${(seg.size / TOTAL_MEMORY) * 100}%`,
                    background: seg.type === 'free' ? 'transparent' : seg.process.color
                  }}
                >
                  {seg.type === 'free' ? (
                     <span className="text-slate-400 font-medium text-xs opacity-50">{seg.size}KB Free</span>
                  ) : (
                     <div className="flex flex-col items-center text-white">
                       <span className="font-bold text-sm shadow-sm">{seg.process.name}</span>
                       <span className="text-[10px] opacity-80">{seg.size}KB</span>
                     </div>
                  )}
                </div>
             ))}
           </div>
           <div className="mt-4 flex gap-4 w-full max-w-[200px]">
             <button
                onClick={triggerCompaction}
                disabled={compactionCooldown > 0 || gameState !== 'playing'}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
             >
                <Minimize2 size={14} />
                {compactionCooldown > 0 ? `Wait ${compactionCooldown}s` : 'Compact'}
             </button>
           </div>
        </div>

        {/* Right Side: Falling Process */}
        <div className="w-1/2 p-8 flex flex-col items-center justify-start relative bg-slate-50/50">
           
           <div className="text-center mb-8">
             <h3 className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">Incoming Process</h3>
             <p className="text-slate-400 text-xs">Click a free slot in memory to allocate</p>
           </div>

           {fallingProcess && gameState === 'playing' && (
             <div 
               className="w-32 rounded-lg shadow-xl border-2 border-white/20 flex flex-col items-center justify-center animate-bounce text-white transform transition-transform"
               style={{ 
                 background: fallingProcess.color,
                 height: `${Math.max(60, (fallingProcess.size / TOTAL_MEMORY) * 400)}px` // scaled visual representation
               }}
             >
               <span className="font-black text-xl">{fallingProcess.name}</span>
               <span className="font-medium text-sm opacity-90">{fallingProcess.size}KB</span>
             </div>
           )}

           <div className="absolute bottom-8 right-8 left-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
             <div className="flex justify-between text-xs text-slate-500 font-medium mb-1">
               <span>Fragmentation</span>
               <span>{getFragmentation()}KB</span>
             </div>
             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
               <div className="bg-rose-400 h-full transition-all" style={{width: `${Math.min(100, (getFragmentation() / TOTAL_MEMORY) * 100)}%`}}></div>
             </div>
           </div>

        </div>

      </div>

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center transform scale-100 animate-in fade-in zoom-in duration-300 relative">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Server size={40} className="text-indigo-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Memory Manager</h2>
            <p className="text-slate-500 font-medium mb-8">Fit the incoming processes into RAM. Manage fragmentation and avoid overflow!</p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Click a free space in RAM to allocate the incoming process.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Algorithm active: <b>{algorithm}</b>.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Use <b>Compaction</b> to merge free spaces, but it has a cooldown!</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(67,56,202)] hover:shadow-[0_4px_0_rgb(67,56,202)] hover:translate-y-1 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Allocation
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-rose-900/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center transform scale-100 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertCircle size={40} className="text-rose-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Memory Overflow!</h2>
            <p className="text-slate-500 font-medium mb-8">Not enough contiguous space for the process.</p>
            
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-indigo-600">{score}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={initGame}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(15,23,42)] hover:shadow-[0_4px_0_rgb(15,23,42)] hover:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                Try Again
              </button>
              <button 
                onClick={() => onGameComplete(score)}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(67,56,202)] hover:shadow-[0_4px_0_rgb(67,56,202)] hover:translate-y-1 transition-all"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Feedback Toast */}
      {feedback && (
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-in fade-in slide-in-from-top-4 ${feedback.isError ? 'bg-rose-500' : 'bg-emerald-500'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default MemoryManagerGame;
