import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, Activity, Award, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TreeClimberGame = ({ onGameComplete, highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, gameover
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  
  const [tree, setTree] = useState({ value: null, left: null, right: null });
  const [fallingNode, setFallingNode] = useState(null);
  const [feedback, setFeedback] = useState(null);
  
  const timerRef = useRef(null);

  const initGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setLevel(1);
    setTree({ value: null, left: null, right: null });
    spawnFallingNode();
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  const spawnFallingNode = () => {
    // Generate a number between 10 and 99
    const val = Math.floor(Math.random() * 90) + 10;
    setFallingNode(val);
  };

  const showFeedback = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleGameOver = (reason) => {
    setGameState('gameover');
    showFeedback(reason, 'error');
  };

  // BST Insertion helper
  const insertIntoTree = (val, node) => {
    if (node === null || node.value === null) {
      return { value: val, left: null, right: null };
    }
    if (val < node.value) {
      return { ...node, left: insertIntoTree(val, node.left) };
    } else {
      return { ...node, right: insertIntoTree(val, node.right) };
    }
  };

  // Find the correct insertion slot (returns parentValue and dir)
  const getCorrectSlot = (val, node) => {
    if (node === null || node.value === null) {
      return { parentValue: null, dir: 'root' };
    }
    if (val < node.value) {
      if (node.left === null) {
        return { parentValue: node.value, dir: 'left' };
      }
      return getCorrectSlot(val, node.left);
    } else {
      if (node.right === null) {
        return { parentValue: node.value, dir: 'right' };
      }
      return getCorrectSlot(val, node.right);
    }
  };

  const handleSlotClick = (parentValue, dir) => {
    if (gameState !== 'playing' || !fallingNode) return;

    const correct = getCorrectSlot(fallingNode, tree);
    const isCorrect = (correct.parentValue === parentValue && correct.dir === dir);

    if (isCorrect) {
      showFeedback('Correct insertion! +10', 'success');
      const updatedTree = insertIntoTree(fallingNode, tree);
      setTree(updatedTree);
      setScore(s => s + 10);
      
      // Level progression
      if ((score + 10) > 0 && (score + 10) % 50 === 0) {
        setLevel(l => l + 1);
        showFeedback(`Level Up! BST growing.`, 'success');
      }

      spawnFallingNode();
    } else {
      showFeedback('Incorrect Slot! Follow BST traversal rules.', 'error');
      setLives(l => {
        if (l <= 1) {
          handleGameOver('No lives remaining. BST crashed!');
          return 0;
        }
        return l - 1;
      });
    }
  };

  // Build tree nodes coordinate map for SVG rendering
  const getTreeLayout = (node, x = 300, y = 40, dx = 100, depth = 0) => {
    if (!node || node.value === null) return [];
    
    const current = {
      value: node.value,
      x,
      y,
      depth,
      hasLeft: !!node.left,
      hasRight: !!node.right
    };

    let list = [current];
    const dy = 55;

    if (node.left) {
      list = [...list, ...getTreeLayout(node.left, x - dx, y + dy, dx * 0.5, depth + 1)];
    }
    if (node.right) {
      list = [...list, ...getTreeLayout(node.right, x + dx, y + dy, dx * 0.5, depth + 1)];
    }

    return list;
  };

  // Generate slots/placeholders where new nodes can potentially be inserted
  const getEmptySlots = (node, x = 300, y = 40, dx = 100, depth = 0) => {
    if (!node || node.value === null) {
      // If root is null, root is the only empty slot
      return [{ parentValue: null, dir: 'root', x, y }];
    }

    let list = [];
    const dy = 55;

    if (!node.left) {
      list.push({ parentValue: node.value, dir: 'left', x: x - dx, y: y + dy });
    } else {
      list = [...list, ...getEmptySlots(node.left, x - dx, y + dy, dx * 0.5, depth + 1)];
    }

    if (!node.right) {
      list.push({ parentValue: node.value, dir: 'right', x: x + dx, y: y + dy });
    } else {
      list = [...list, ...getEmptySlots(node.right, x + dx, y + dy, dx * 0.5, depth + 1)];
    }

    return list;
  };

  const getTreeDepth = (node) => {
    if (!node || node.value === null) return 0;
    return 1 + Math.max(getTreeDepth(node.left), getTreeDepth(node.right));
  };

  const maxDepth = Math.max(1, getTreeDepth(tree));
  const svgWidth = Math.max(600, Math.pow(2, maxDepth) * 35);
  const svgHeight = Math.max(300, maxDepth * 60 + 80);
  const initialX = svgWidth / 2;
  const initialY = 40;
  const initialDx = svgWidth * 0.22;

  const layout = getTreeLayout(tree, initialX, initialY, initialDx);
  const slots = getEmptySlots(tree, initialX, initialY, initialDx);

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
            <h2 className="text-xl font-bold tracking-tight text-indigo-200">Tree Climber</h2>
            <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-wider">
              BST Traversal | Level {level}
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
      <div className="flex-1 flex flex-col p-6 bg-slate-950/20 relative">
         
         <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4">
            {/* Falling Node Card */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-indigo-500/10 shadow-lg flex items-center gap-4">
               <div>
                  <span className="text-xxs font-bold text-indigo-400 uppercase">Incoming Value</span>
                  <p className="text-2xl font-black text-slate-100 animate-pulse">{fallingNode}</p>
               </div>
               <div className="h-8 w-px bg-slate-800"></div>
               <div>
                  <span className="text-xxs font-bold text-indigo-400 uppercase">BST Rule</span>
                  <p className="text-xs font-semibold text-slate-400">Left &lt; Node &le; Right</p>
               </div>
            </div>
            
            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/10 text-indigo-200/90 text-xs sm:text-sm font-medium flex items-center gap-2 max-w-md">
               <Info size={18} className="text-indigo-400 shrink-0" />
               <span>Compare the incoming value with the parent nodes. Click the correct dashed slot.</span>
            </div>
         </div>

         {/* Tree SVG Board */}
         <div className="flex-1 bg-slate-950/80 rounded-2xl shadow-2xl border border-indigo-500/10 relative overflow-hidden flex items-center justify-center p-4">
            
            <div className="w-full h-full max-h-[360px] flex items-center justify-center">
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-full max-w-full max-h-[300px] overflow-visible"
              >
                {/* Branches / Lines linking parents to children */}
                {layout.map((n, idx) => {
                  const list = [];
                  const childDy = 55;
                  const dx = initialDx * Math.pow(0.5, n.depth);

                  if (n.hasLeft) {
                    list.push(
                      <line 
                        key={`line-l-${idx}`} 
                        x1={n.x} y1={n.y} 
                        x2={n.x - dx} y2={n.y + childDy} 
                        stroke="#1e293b" 
                        strokeWidth="3" 
                      />
                    );
                  }
                  if (n.hasRight) {
                    list.push(
                      <line 
                        key={`line-r-${idx}`} 
                        x1={n.x} y1={n.y} 
                        x2={n.x + dx} y2={n.y + childDy} 
                        stroke="#1e293b" 
                        strokeWidth="3" 
                      />
                    );
                  }
                  return list;
                })}

                {/* Slots / Dashed Placeholders */}
                {slots.map((slot, idx) => (
                  <g 
                    key={`slot-${idx}`} 
                    transform={`translate(${slot.x}, ${slot.y})`}
                    className="cursor-pointer group"
                    onClick={() => handleSlotClick(slot.parentValue, slot.dir)}
                  >
                    <circle 
                      r="16" 
                      fill="rgba(99,102,241,0.05)" 
                      stroke="#4f46e5" 
                      strokeWidth="2" 
                      strokeDasharray="4,4" 
                      className="transition-all group-hover:scale-110 group-hover:stroke-indigo-400"
                    />
                    <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#6366f1" className="opacity-60 group-hover:opacity-100 font-mono">?</text>
                  </g>
                ))}

                {/* Nodes rendering */}
                {layout.map((n, idx) => (
                  <g key={`node-${idx}`} transform={`translate(${n.x}, ${n.y})`}>
                    <circle 
                      r="18" 
                      fill="#0f172a" 
                      stroke="#6366f1" 
                      strokeWidth="3.5" 
                    />
                    <text x="0" y="5" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#f1f5f9">{n.value}</text>
                  </g>
                ))}

              </svg>
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
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Tree Climber</h2>
            <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
              Binary Search Tree (BST) challenge. Select the correct branch slot to grow the search tree!
            </p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Observe the incoming node value cards.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Traverse down the tree: go Left if value is smaller than current node, or Right if larger.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Click the correct dashed slot circle to insert the node.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Climbing
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
            <h2 className="text-3xl font-black text-slate-100 mb-2">BST Collapse!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">Failed to construct the Binary Search Tree.</p>
            
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

export default TreeClimberGame;