import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, Cpu, ShieldAlert, Award, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PageReplacementGame = ({ onGameComplete, highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, gameover
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [algorithm, setAlgorithm] = useState('FIFO'); // FIFO or LRU
  const [frames, setFrames] = useState([null, null, null]); // 3 Page Frames
  const [incomingPage, setIncomingPage] = useState(null);
  const [pageHistory, setPageHistory] = useState([]); // tracks arrival times and access patterns
  const [feedback, setFeedback] = useState(null);

  const initGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setFrames([null, null, null]);
    setPageHistory([]);
    setAlgorithm(Math.random() < 0.5 ? 'FIFO' : 'LRU');
    spawnPage();
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  const spawnPage = () => {
    const val = Math.floor(Math.random() * 8) + 1; // page references 1 to 8
    setIncomingPage(val);
  };

  const showFeedback = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleGameOver = (reason) => {
    setGameState('gameover');
    showFeedback(reason, 'error');
  };

  // Helper to compute correct eviction index
  const getCorrectEvictionIndex = (currentFrames, history, algo) => {
    if (algo === 'FIFO') {
      // FIFO: find the frame page that arrived first
      // Arrival order is tracked by finding the minimum index in pageHistory of when it first entered the frames
      const firstArrivals = currentFrames.map(fVal => {
        // Find first occurrence of fVal in history
        return history.indexOf(fVal);
      });
      let minIdx = 0;
      let minVal = firstArrivals[0];
      for (let k = 1; k < firstArrivals.length; k++) {
        if (firstArrivals[k] < minVal) {
          minVal = firstArrivals[k];
          minIdx = k;
        }
      }
      return minIdx;
    } else {
      // LRU: Least Recently Used. Find the frame page whose last access was longest ago
      const lastAccesses = currentFrames.map(fVal => {
        // Find last occurrence of fVal in history
        return history.lastIndexOf(fVal);
      });
      let minIdx = 0;
      let minVal = lastAccesses[0];
      for (let k = 1; k < lastAccesses.length; k++) {
        if (lastAccesses[k] < minVal) {
          minVal = lastAccesses[k];
          minIdx = k;
        }
      }
      return minIdx;
    }
  };

  const handleFrameClick = (frameIdx) => {
    if (gameState !== 'playing' || incomingPage === null) return;

    const pageInFrames = frames.includes(incomingPage);

    if (pageInFrames) {
      showFeedback('No replacement needed! Click Page Hit to process page hit.', 'error');
      return;
    }

    const hasEmptySlot = frames.includes(null);
    if (hasEmptySlot) {
      showFeedback('Slots are empty! Click the empty slot directly.', 'info');
      // Auto-handle empty slot clicks
      const emptyIdx = frames.indexOf(null);
      if (frameIdx === emptyIdx) {
        const nextFrames = [...frames];
        nextFrames[emptyIdx] = incomingPage;
        setFrames(nextFrames);
        setPageHistory(prev => [...prev, incomingPage]);
        setScore(s => s + 10);
        showFeedback('Page Fault resolved! +10', 'success');
        spawnPage();
      }
      return;
    }

    // All slots are full, user must evict one
    const correctIdx = getCorrectEvictionIndex(frames, pageHistory, algorithm);

    if (frameIdx === correctIdx) {
      const nextFrames = [...frames];
      const evictedVal = nextFrames[frameIdx];
      nextFrames[frameIdx] = incomingPage;
      setFrames(nextFrames);
      setPageHistory(prev => [...prev, incomingPage]);
      setScore(s => s + 20);
      showFeedback(`Correct! Evicted ${evictedVal}. +20`, 'success');
      spawnPage();
    } else {
      showFeedback(`Incorrect eviction! Check ${algorithm} replacement rules.`, 'error');
      setLives(l => {
        if (l <= 1) {
          handleGameOver('Too many replacement faults. Kernel crashed!');
          return 0;
        }
        return l - 1;
      });
    }
  };

  const handlePageHitClick = () => {
    if (gameState !== 'playing' || incomingPage === null) return;

    const pageInFrames = frames.includes(incomingPage);
    if (pageInFrames) {
      showFeedback('Page Hit! Frame table accessed. +15', 'success');
      setPageHistory(prev => [...prev, incomingPage]);
      setScore(s => s + 15);
      spawnPage();
    } else {
      showFeedback('Incorrect! Page is not in frames (Page Fault). Evict/Allocate first.', 'error');
      setLives(l => {
        if (l <= 1) {
          handleGameOver('Incorrect page reference. Kernel crashed!');
          return 0;
        }
        return l - 1;
      });
    }
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
            <Cpu size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-200">Page Frame Architect</h2>
            <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-wider">
              {algorithm} Page Replacement Challenge
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lives</span>
             <span className="text-2xl font-black text-rose-500">
               {Array.from({ length: Math.max(0, lives) }).map((_, i) => '♥').join(' ')}
               {lives === 0 && 'Game Over'}
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
      <div className="flex-1 flex flex-col p-6 bg-slate-950/20 relative justify-center items-center">
         
         <div className="w-full max-w-2xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-8">
            {/* Incoming Page Card */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-indigo-500/10 shadow-lg flex items-center gap-4 flex-1">
               <div className="text-center">
                  <span className="text-xxs font-bold text-indigo-400 uppercase tracking-wider">Page Reference</span>
                  <p className="text-3xl font-black text-slate-100 mt-1 animate-bounce">{incomingPage}</p>
               </div>
               <div className="h-10 w-px bg-slate-800"></div>
               <div>
                  <span className="text-xxs font-bold text-indigo-400 uppercase tracking-wider block mb-1">Queue Stream History</span>
                  <div className="flex gap-1.5 overflow-x-auto max-w-[150px] font-mono text-slate-500 font-bold">
                    {pageHistory.slice(-5).map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-950 rounded text-xxs border border-slate-850">{h}</span>
                    ))}
                  </div>
               </div>
            </div>
            
            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/10 text-indigo-200/90 text-xs sm:text-sm font-medium flex items-center gap-2 flex-1">
               <Info size={18} className="text-indigo-400 shrink-0" />
               <span>Check if the page is in the frame. If it is, click <b>Page Hit</b>. Otherwise, click a slot to allocate or evict using <b>{algorithm}</b> rules.</span>
            </div>
         </div>

         {/* Page Frames Layout (Hardware Memory Look) */}
         <div className="w-full max-w-xl bg-slate-900/40 rounded-2xl border border-indigo-500/10 p-6 mb-8 text-center shadow-2xl">
            <h3 className="text-xs font-bold text-indigo-455 uppercase tracking-widest mb-6">Page Frame Slots</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {frames.map((val, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleFrameClick(idx)}
                  className={`h-24 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative group
                    ${val === null ? 
                        'border-dashed border-indigo-500/20 bg-slate-950/20 hover:border-indigo-400/40' : 
                        'border-slate-800 bg-slate-950 hover:border-indigo-500'
                    }
                  `}
                >
                  {val === null ? (
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Empty</span>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-slate-100 font-mono">{val}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest absolute bottom-2">Frame {idx}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handlePageHitClick}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all border border-emerald-500/20 flex items-center gap-2 text-sm uppercase tracking-wider"
              >
                <CheckCircle size={18} /> Page Hit
              </button>
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
              <Cpu size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Page Frame Architect</h2>
            <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
              Manage RAM page faults. Evict page frames accurately using FIFO or LRU algorithms!
            </p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>If the incoming page already exists in the frames, click the <b>Page Hit</b> button.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Otherwise (Page Fault), allocate to empty slots, or click the correct frame to evict.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p><b>FIFO</b> evicts the page that entered first. <b>LRU</b> evicts the page accessed furthest in history.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2"
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
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-455">
              <ShieldAlert size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">Kernel Panic!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">Thrashing occurred! Excessive invalid page evictions crashed the OS memory manager.</p>
            
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

export default PageReplacementGame;
