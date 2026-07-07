import React, { useState, useEffect } from 'react';
import { Play, Pause, X, RotateCcw, Zap, ShieldCheck, CheckCircle, ShieldAlert, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SortingMasterGame = ({ onGameComplete, highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, levelclear, gameover
  const [level, setLevel] = useState(1); // 1: Bubble, 2: Selection, 3: Insertion/Free
  const [numbers, setNumbers] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (gameState === 'playing') {
      generateNumbers();
    }
  }, [gameState, level]);

  const generateNumbers = () => {
    const nums = [];
    const count = level === 1 ? 6 : level === 2 ? 7 : 8; // grow list size
    for (let i = 0; i < count; i++) {
      nums.push(Math.floor(Math.random() * 85) + 15); // numbers between 15 and 100
    }
    setNumbers(nums);
    setSelectedIdx(null);
    setMoves(0);
  };

  const showFeedback = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2500);
  };

  const initGame = () => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  const handleBarClick = (idx) => {
    if (gameState !== 'playing') return;

    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else {
      // Perform Swap if valid based on level sorting algorithm rules
      const i = selectedIdx;
      const j = idx;

      if (i === j) {
        setSelectedIdx(null);
        return;
      }

      // Check level algorithm constraints
      if (level === 1) {
        // Bubble Sort: must be adjacent
        if (Math.abs(i - j) !== 1) {
          showFeedback('Bubble Sort only allows swapping adjacent items!', 'error');
          setSelectedIdx(null);
          return;
        }
        // Bubble Sort check order (optional helper warning but let them swap to sort)
      } else if (level === 2) {
        // Selection Sort: must select minimum in remaining unsorted portion
        // Let's check if they swapped the actual minimum element
        // For simplicity of game flow, we allow arbitrary swaps but track efficiency
      }

      // Swap
      const newNums = [...numbers];
      [newNums[i], newNums[j]] = [newNums[j], newNums[i]];
      setNumbers(newNums);
      setMoves(m => m + 1);
      setSelectedIdx(null);

      // Check if sorted
      const isSorted = newNums.every((val, index) => index === 0 || val >= newNums[index - 1]);
      if (isSorted) {
        handleLevelClear();
      }
    }
  };

  const handleLevelClear = () => {
    const points = Math.max(10, 100 - moves * 5);
    setScore(s => s + points);
    showFeedback(`List Sorted! +${points} Points!`, 'success');
    
    if (level < 3) {
      setTimeout(() => {
        setLevel(l => l + 1);
      }, 1500);
    } else {
      setTimeout(() => {
        setGameState('completed');
      }, 1500);
    }
  };

  const handleGameComplete = () => {
    onGameComplete(score);
  };

  const getAlgorithmInfo = () => {
    if (level === 1) {
      return {
        name: 'Bubble Sort Mode',
        rule: 'Swap adjacent elements that are out of order.'
      };
    } else if (level === 2) {
      return {
        name: 'Selection Sort Mode',
        rule: 'Find the smallest item and swap it to its sorted position.'
      };
    } else {
      return {
        name: 'Insertion / Free Sort Mode',
        rule: 'Position each element to build the fully sorted list.'
      };
    }
  };

  const info = getAlgorithmInfo();

  return (
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Zap size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-200">Sorting Master</h2>
            <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-wider">
              Algorithm Challenge | Level {level} / 3
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Moves</span>
             <span className="text-2xl font-black text-indigo-400">{moves}</span>
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
      <div className="flex-1 flex flex-col p-6 bg-slate-950/20 relative">
         
         <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-indigo-500/10 shadow-lg">
               <span className="text-xxs font-bold text-indigo-400 uppercase tracking-wider block mb-1">Active Algorithm Mode</span>
               <span className="text-base font-black text-slate-100">{info.name}</span>
            </div>
            
            <div className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-500/10 text-indigo-200/90 text-xs sm:text-sm font-medium flex items-center gap-2 max-w-md">
               <Info size={18} className="text-indigo-400 shrink-0" />
               <span>{info.rule} Click two bars sequentially to swap their positions.</span>
            </div>
         </div>

         {/* Visual Bar Visualizer (Responsive flex layouts) */}
         <div className="flex-1 bg-slate-950/80 rounded-2xl shadow-2xl border border-indigo-500/10 relative overflow-hidden flex items-end justify-center p-8 gap-3 sm:gap-6 min-h-[220px]">
            {numbers.map((num, idx) => {
              const isSelected = selectedIdx === idx;
              return (
                <div 
                  key={idx}
                  onClick={() => handleBarClick(idx)}
                  className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
                >
                  {/* Floating Number Tag */}
                  <span className="text-xxs sm:text-xs font-mono font-bold text-indigo-300 mb-2 opacity-80 group-hover:opacity-100">{num}</span>
                  
                  {/* Visual Bar representation */}
                  <div 
                    className={`w-full rounded-t-lg transition-all duration-300 relative border ${isSelected ? 'bg-indigo-500 border-indigo-300 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-800 group-hover:bg-slate-850'}`}
                    style={{ height: `${num}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-lg"></div>
                  </div>
                </div>
              );
            })}
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
              <Zap size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Sorting Master</h2>
            <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
              Construct sorted arrays visually. Learn sorting rules for Bubble Sort, Selection Sort, and Insertion Sort!
            </p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Observe the array numbers represented as vertical bars.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Swap elements sequentially by clicking on two bars.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Solve each algorithm level to maximize your score output.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Sorting
            </button>
          </div>
        </div>
      )}

      {/* Game Completed / Over Screens */}
      {gameState === 'completed' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-450 animate-bounce">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">Sorted Mastered!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">You solved all sorting algorithm levels successfully.</p>
            
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
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-fade-in ${feedback.type === 'error' ? 'bg-rose-600 border border-rose-500/25' : 'bg-emerald-600 border border-emerald-500/25'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default SortingMasterGame;