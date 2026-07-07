import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Check, AlertTriangle, ArrowRight, RotateCcw, Play, Pause, X, Info, Layers, RefreshCw } from 'lucide-react';

const LEVELS = [
  {
    level: 1,
    title: "Level 1: BST Insertion Basics",
    instructions: "Insert incoming nodes in the correct BST slots. No rotations required for this layout.",
    initialRoot: 50,
    incoming: [30, 70, 20],
    movesLimit: 6,
    needsRotation: false
  },
  {
    level: 2,
    title: "Level 2: Left Rotation (Left-Left Heavy)",
    instructions: "Insert nodes. If height difference is > 1, select the unbalanced node (red) and click Rotate Left!",
    initialRoot: 50,
    incoming: [70, 80, 90],
    movesLimit: 8,
    needsRotation: true
  },
  {
    level: 3,
    title: "Level 3: Right Rotation (Right-Right Heavy)",
    instructions: "Balance the tree! Insert nodes, identify the unbalanced root (+2 or -2), and apply Rotate Right.",
    initialRoot: 50,
    incoming: [30, 20, 10],
    movesLimit: 8,
    needsRotation: true
  }
];

export default function BinaryTreeBalanceBeamGame({ onGameComplete, autoStart = false }) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [gameState, setGameState] = useState('playing'); // playing, completed
  
  // Game states
  const [tree, setTree] = useState(null);
  const [incomingList, setIncomingList] = useState([]);
  const [selectedNodeValue, setSelectedNodeValue] = useState(null);
  const [warning, setWarning] = useState(null);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const activeLevel = LEVELS[currentLevel];

  // Helper: Get height of a tree node
  const getHeight = (node) => {
    if (!node || node.value === null) return 0;
    return 1 + Math.max(getHeight(node.left), getHeight(node.right));
  };

  // Helper: Calculate balance factor of a tree node
  const getBalanceFactor = (node) => {
    if (!node || node.value === null) return 0;
    return getHeight(node.left) - getHeight(node.right);
  };

  const initLevel = () => {
    const lvl = LEVELS[currentLevel];
    setTree({ value: lvl.initialRoot, left: null, right: null });
    setIncomingList([...lvl.incoming]);
    setSelectedNodeValue(null);
    setWarning(null);
    setMoves(0);
    setGameState('playing');
  };

  const restartGame = () => {
    setCurrentLevel(0);
    setScore(0);
    initLevel();
  };

  useEffect(() => {
    initLevel();
  }, [currentLevel]);

  // Acquisitional slot finder
  const getEmptySlots = (node, x = 300, y = 45, dx = 100) => {
    if (!node || node.value === null) return [];
    
    let list = [];
    const dy = 55;
    
    if (!node.left) {
      list.push({ parentVal: node.value, dir: 'left', x: x - dx, y: y + dy });
    } else {
      list = [...list, ...getEmptySlots(node.left, x - dx, y + dy, dx * 0.5)];
    }

    if (!node.right) {
      list.push({ parentVal: node.value, dir: 'right', x: x + dx, y: y + dy });
    } else {
      list = [...list, ...getEmptySlots(node.right, x + dx, y + dy, dx * 0.5)];
    }

    return list;
  };

  // Traversal coordinate map
  const getTreeLayout = (node, x = 300, y = 45, dx = 100, depth = 0) => {
    if (!node || node.value === null) return [];
    
    const balance = getBalanceFactor(node);
    const isUnbalanced = Math.abs(balance) > 1;

    const current = {
      value: node.value,
      x,
      y,
      depth,
      balance,
      isUnbalanced,
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

  // BST rules checker
  const checkBstRules = (val, parentVal, dir) => {
    // Basic verification helper
    if (dir === 'left' && val >= parentVal) return false;
    if (dir === 'right' && val < parentVal) return false;
    return true;
  };

  // Slot click handler
  const handleSlotClick = (parentVal, dir) => {
    if (isPaused || gameState !== 'playing' || warning) return;
    if (incomingList.length === 0) return;
    if (moves >= activeLevel.movesLimit) {
      showFeedback("Move limit exceeded!", "error");
      return;
    }

    const incomingVal = incomingList[0];

    // Verify if this is the correct BST slot
    const isCorrect = checkBstRules(incomingVal, parentVal, dir);

    if (isCorrect) {
      // Perform insertion
      const insertRecursive = (node) => {
        if (!node) return { value: incomingVal, left: null, right: null };
        if (incomingVal < node.value) {
          node.left = insertRecursive(node.left);
        } else {
          node.right = insertRecursive(node.right);
        }
        return node;
      };

      const updatedTree = insertRecursive({ ...tree });
      setTree(updatedTree);
      setIncomingList(prev => prev.slice(1));
      setMoves(prev => prev + 1);
      setScore(prev => prev + 10);
      showFeedback("Correctly Inserted! +10 Points", "success");

      // Verify balance factors after insertion
      setTimeout(() => {
        detectUnbalance(updatedTree);
      }, 300);

    } else {
      setMoves(prev => prev + 1);
      showFeedback("Incorrect slot! Check BST properties.", "error");
    }
  };

  const detectUnbalance = (t) => {
    const layout = getTreeLayout(t);
    const unbalanced = layout.find(n => n.isUnbalanced);
    if (unbalanced) {
      setWarning(`Tree Unbalanced at node ${unbalanced.value}! Apply rotations.`);
      showFeedback("Warning: Tree Unbalanced!", "error");
    } else if (incomingList.length === 0) {
      // Completed level
      const bonus = Math.max(0, (activeLevel.movesLimit - moves) * 10);
      setScore(prev => prev + 50 + bonus);
      showFeedback(`Level Complete! +50 Points`, "success");
      
      if (currentLevel < LEVELS.length - 1) {
        setTimeout(() => {
          setCurrentLevel(prev => prev + 1);
        }, 1500);
      } else {
        setTimeout(() => {
          setGameState('completed');
        }, 1500);
      }
    }
  };

  // Rotation triggers
  const handleRotateLeft = () => {
    if (isPaused || !selectedNodeValue || !warning) return;

    // Recurse rotation left
    const rotateLeftRec = (node, val) => {
      if (!node) return null;
      if (node.value === val) {
        if (!node.right) return node; // Can't rotate left if no right child
        const temp = node.right;
        node.right = temp.left;
        temp.left = node;
        return temp;
      }
      node.left = rotateLeftRec(node.left, val);
      node.right = rotateLeftRec(node.right, val);
      return node;
    };

    const newTree = rotateLeftRec({ ...tree }, selectedNodeValue);
    setTree(newTree);
    setSelectedNodeValue(null);
    setWarning(null);
    setMoves(prev => prev + 1);
    setScore(prev => prev + 20);
    showFeedback("Rotated Left successfully! +20 Points", "success");

    // Recalculate balance
    setTimeout(() => {
      detectUnbalance(newTree);
    }, 300);
  };

  const handleRotateRight = () => {
    if (isPaused || !selectedNodeValue || !warning) return;

    // Recurse rotation right
    const rotateRightRec = (node, val) => {
      if (!node) return null;
      if (node.value === val) {
        if (!node.left) return node; // Can't rotate right if no left child
        const temp = node.left;
        node.left = temp.right;
        temp.right = node;
        return temp;
      }
      node.left = rotateRightRec(node.left, val);
      node.right = rotateRightRec(node.right, val);
      return node;
    };

    const newTree = rotateRightRec({ ...tree }, selectedNodeValue);
    setTree(newTree);
    setSelectedNodeValue(null);
    setWarning(null);
    setMoves(prev => prev + 1);
    setScore(prev => prev + 20);
    showFeedback("Rotated Right successfully! +20 Points", "success");

    // Recalculate balance
    setTimeout(() => {
      detectUnbalance(newTree);
    }, 300);
  };

  const showFeedback = (msg, type) => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2500);
  };

  const maxDepth = 4;
  const svgWidth = 600;
  const svgHeight = 300;
  const initialX = svgWidth / 2;
  const initialY = 40;
  const initialDx = 110;

  const layout = getTreeLayout(tree, initialX, initialY, initialDx);
  const slots = getEmptySlots(tree, initialX, initialY, initialDx);

  return (
    <div className="min-h-[600px] w-full max-w-5xl mx-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between select-none">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-indigo-300">Binary Tree Balance Beam</h2>
          <p className="text-xs text-indigo-400 mt-1">AVL Balancing & Rotation Simulator</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-sm font-semibold text-indigo-300">
            Score: {score}
          </div>
          
          <div className="flex items-center gap-2 border-l border-indigo-500/20 pl-4">
            <button
              onClick={() => setIsPaused(p => !p)}
              className="p-2 bg-slate-800 hover:bg-slate-770 text-slate-300 rounded-lg transition-all"
              title={isPaused ? "Resume Game" : "Pause Game"}
              disabled={gameState === 'completed'}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={restartGame}
              className="p-2 bg-slate-800 hover:bg-slate-770 text-slate-300 rounded-lg transition-all"
              title="Restart Game"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => onGameComplete && onGameComplete(score)}
              className="p-2 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 rounded-lg transition-all"
              title="Exit Game"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
          <h3 className="text-2xl font-black text-slate-200 font-sans">Game Paused</h3>
          <button
            onClick={() => setIsPaused(false)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Resume Game
          </button>
        </div>
      )}

      {gameState === 'playing' ? (
        <div className="flex-1 flex flex-col space-y-6">
          {/* Top Info Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Mission Manifest */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between col-span-2">
              <div>
                <span className="text-xxs font-bold uppercase tracking-wider text-indigo-400 block mb-1">Level {activeLevel.level}: {activeLevel.title}</span>
                <span className="text-sm font-semibold text-slate-100">{activeLevel.instructions}</span>
              </div>
              {warning && (
                <div className="mt-2.5 p-2 bg-rose-950/30 border border-rose-500/20 rounded-lg text-rose-350 text-xxs font-bold flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {warning}
                </div>
              )}
            </div>

            {/* Target values card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Incoming Node</span>
                  <span className="text-2xl font-black text-indigo-350">{incomingList.length > 0 ? incomingList[0] : 'None'}</span>
                </div>
              </div>
              <div className="text-right border-l border-slate-800 pl-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Remaining</span>
                <span className="text-base font-bold text-slate-200">{incomingList.length} nodes</span>
              </div>
            </div>

          </div>

          {/* Main Visual Board */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Visual Canvas Block */}
            <div className="md:col-span-8 bg-slate-950/80 rounded-2xl shadow-2xl border border-indigo-500/10 p-4 relative min-h-[300px] flex items-center justify-center">
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-full max-w-full max-h-[280px] overflow-visible"
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
                        strokeWidth="2.5" 
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
                        strokeWidth="2.5" 
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
                    onClick={() => handleSlotClick(slot.parentVal, slot.dir)}
                  >
                    <circle 
                      r="16" 
                      fill="rgba(99,102,241,0.03)" 
                      stroke="#4f46e5" 
                      strokeWidth="2" 
                      strokeDasharray="4,4" 
                      className="transition-all group-hover:scale-115 group-hover:stroke-indigo-400"
                    />
                    <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#6366f1" className="opacity-60 group-hover:opacity-100 font-mono">?</text>
                  </g>
                ))}

                {/* Nodes rendering */}
                {layout.map((n, idx) => {
                  const isSelected = selectedNodeValue === n.value;
                  let borderCol = "#6366f1";
                  let bgFill = "#0f172a";

                  if (n.isUnbalanced) {
                    borderCol = "#ef4444";
                    bgFill = "#450a0a";
                  } else if (isSelected) {
                    borderCol = "#10b981";
                    bgFill = "#064e3b";
                  }

                  return (
                    <g 
                      key={`node-${idx}`} 
                      transform={`translate(${n.x}, ${n.y})`}
                      className="cursor-pointer"
                      onClick={() => setSelectedNodeValue(n.value)}
                    >
                      <circle 
                        r="18" 
                        fill={bgFill} 
                        stroke={borderCol} 
                        strokeWidth="3.5" 
                        className="transition-all hover:scale-105"
                      />
                      <text x="0" y="5" textAnchor="middle" fontSize="11" fontWeight="black" fill="#f1f5f9" className="font-mono">{n.value}</text>
                      {/* Balance factor label */}
                      <text x="0" y="-24" textAnchor="middle" fontSize="9" fontWeight="bold" fill={n.isUnbalanced ? "#ef4444" : "#94a3b8"}>
                        BF: {n.balance}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Rotation Actions & Balancing Panels */}
            <div className="md:col-span-4 flex flex-col justify-between space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xxs font-bold text-slate-500 uppercase tracking-widest block mb-2">AVL Rotation Deck</span>
                  <div className="bg-slate-900 border border-indigo-950 rounded-xl p-3.5 mb-4 text-center">
                    <p className="text-xxs text-slate-400 font-medium mb-1">Selected Node</p>
                    <p className="text-2xl font-black text-indigo-400">{selectedNodeValue || 'None'}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleRotateLeft}
                    disabled={!selectedNodeValue || !warning}
                    className="w-full py-3 bg-indigo-950 border border-indigo-500/30 text-indigo-200 disabled:opacity-40 hover:bg-indigo-900/40 text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    Rotate Left ↺
                  </button>
                  <button
                    onClick={handleRotateRight}
                    disabled={!selectedNodeValue || !warning}
                    className="w-full py-3 bg-indigo-950 border border-indigo-500/30 text-indigo-200 disabled:opacity-40 hover:bg-indigo-900/40 text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    Rotate Right ↻
                  </button>
                </div>
              </div>

              <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4 text-xs leading-relaxed text-slate-350">
                <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1.5">
                  <Info size={16} />
                  <span>Rotation Rule</span>
                </div>
                <span>Select the unbalanced parent node (BF &ge; 2 or &le; -2) and click the rotation button to restore binary balance!</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-450 shadow-xl">
            <Award className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-100 font-sans">Tree Balanced!</h3>
            <p className="text-slate-400 max-w-sm">
              You constructed and balanced all binary levels perfectly! Final score: <span className="text-indigo-400 font-bold">{score}</span> points.
            </p>
          </div>
          <button
            onClick={restartGame}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold rounded-xl flex items-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
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
}