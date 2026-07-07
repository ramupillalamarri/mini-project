import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Check, HelpCircle, ArrowRight, RotateCcw, Play, Pause, X, Info } from 'lucide-react';

const CHALLENGES = [
  {
    level: 1,
    instructions: "Click the Parent node of the <li> tags in this visual DOM tree.",
    nodes: [
      { id: 'body', label: 'body', x: 200, y: 40, role: 'ancestor' },
      { id: 'div', label: 'div#container', x: 200, y: 120, role: 'ancestor' },
      { id: 'ul', label: 'ul', x: 200, y: 200, role: 'target' }, // Target!
      { id: 'li1', label: 'li (Item 1)', x: 130, y: 280, role: 'source' },
      { id: 'li2', label: 'li (Item 2)', x: 270, y: 280, role: 'source' }
    ],
    connections: [
      { from: 'body', to: 'div' },
      { from: 'div', to: 'ul' },
      { from: 'ul', to: 'li1' },
      { from: 'ul', to: 'li2' }
    ],
    targetId: 'ul',
    explanation: "In the DOM hierarchy, the parent node is the direct parent container. Here, 'ul' directly wraps both 'li' elements."
  },
  {
    level: 2,
    instructions: "Click any Sibling node of the <h1> tag.",
    nodes: [
      { id: 'wrapper', label: 'div.wrapper', x: 200, y: 40, role: 'parent' },
      { id: 'h1', label: 'h1 (Title)', x: 80, y: 160, role: 'source' },
      { id: 'p', label: 'p (Paragraph)', x: 200, y: 160, role: 'target' }, // Target!
      { id: 'span', label: 'span (Footer)', x: 320, y: 160, role: 'target' } // Target!
    ],
    connections: [
      { from: 'wrapper', to: 'h1' },
      { from: 'wrapper', to: 'p' },
      { from: 'wrapper', to: 'span' }
    ],
    // Accept either 'p' or 'span'
    targetIds: ['p', 'span'],
    explanation: "Siblings are DOM elements that share the same immediate parent ('div.wrapper'). Both 'p' and 'span' are siblings of 'h1'."
  },
  {
    level: 3,
    instructions: "Click the direct Child node of the <button> tag.",
    nodes: [
      { id: 'form', label: 'form', x: 200, y: 40, role: 'ancestor' },
      { id: 'button', label: 'button#submit', x: 200, y: 130, role: 'source' },
      { id: 'span', label: 'span.icon', x: 200, y: 220, role: 'target' } // Target!
    ],
    connections: [
      { from: 'form', to: 'button' },
      { from: 'button', to: 'span' }
    ],
    targetId: 'span',
    explanation: "A child node is a nested node one level below its parent. The 'span.icon' is nested inside the button."
  },
  {
    level: 4,
    instructions: "Click the Descendant of <body> that is NOT a direct child.",
    nodes: [
      { id: 'body', label: 'body', x: 200, y: 40, role: 'source' },
      { id: 'header', label: 'header', x: 200, y: 140, role: 'child' },
      { id: 'nav', label: 'nav (Menu)', x: 200, y: 240, role: 'target' } // Target!
    ],
    connections: [
      { from: 'body', to: 'header' },
      { from: 'header', to: 'nav' }
    ],
    targetId: 'nav',
    explanation: "Descendants include nested nodes at any level (children, grandchildren, etc.). 'header' is a direct child of 'body', but 'nav' is a grandchild, making it a descendant and not a direct child."
  }
];

export default function DomNodeExplorerGame({ onGameComplete, autoStart = false }) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  const activeLevel = CHALLENGES[currentLevel];

  const restartGame = () => {
    setCurrentLevel(0);
    setScore(0);
    setCompleted(false);
    setSelectedNode(null);
    setIsPaused(false);
    setIsAnswered(false);
  };

  const handleNodeClick = (nodeId) => {
    if (isAnswered || isPaused) return;
    setSelectedNode(nodeId);
  };

  const handleVerify = () => {
    if (!selectedNode || isAnswered || isPaused) return;
    
    setIsAnswered(true);
    const isCorrect = activeLevel.targetIds 
      ? activeLevel.targetIds.includes(selectedNode)
      : selectedNode === activeLevel.targetId;

    if (isCorrect) {
      setScore(prev => prev + 25);
    }
  };

  const handleNext = () => {
    setSelectedNode(null);
    setIsAnswered(false);
    if (currentLevel < CHALLENGES.length - 1) {
      setCurrentLevel(prev => prev + 1);
    } else {
      setCompleted(true);
      if (onGameComplete) {
        onGameComplete(score);
      }
    }
  };

  const isCorrectSelection = (nodeId) => {
    if (activeLevel.targetIds) {
      return activeLevel.targetIds.includes(nodeId);
    }
    return nodeId === activeLevel.targetId;
  };

  return (
    <div className="min-h-[580px] w-full max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 border border-sky-500/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
      
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-sky-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-sky-300">DOM Node Explorer</h2>
          <p className="text-xs text-sky-400 mt-1">Point-and-click tree hierarchy navigator</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-sky-500/20 border border-sky-500/30 rounded-full text-sm font-semibold text-sky-300">
            Score: {score}
          </div>
          
          <div className="flex items-center gap-2 border-l border-sky-500/20 pl-4">
            <button
              onClick={() => setIsPaused(p => !p)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg transition-all"
              title={isPaused ? "Resume Game" : "Pause Game"}
              disabled={completed}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={restartGame}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-355 rounded-lg transition-all"
              title="Restart Game"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => onGameComplete && onGameComplete(score)}
              className="p-2 bg-slate-800 hover:bg-rose-955/40 hover:text-rose-455 text-slate-400 rounded-lg transition-all"
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
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Resume Game
          </button>
        </div>
      )}

      {!completed ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Left Panel: DOM Tree Graphic Canvas */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl relative p-4 h-[350px] md:h-auto min-h-[300px] flex flex-col justify-between overflow-hidden">
            <span className="text-xxs font-bold uppercase tracking-wider text-sky-500/80 bg-slate-900 px-2 py-0.5 rounded border border-sky-500/20 self-start">
              DOM Interactive Tree
            </span>
            
            {/* SVG Link lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {activeLevel.connections.map((conn, idx) => {
                const fromNode = activeLevel.nodes.find(n => n.id === conn.from);
                const toNode = activeLevel.nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;
                return (
                  <line 
                    key={idx}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="#0284c7"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                    className="opacity-40 animate-pulse"
                  />
                );
              })}
            </svg>

            {/* Tree Nodes */}
            <div className="absolute inset-0">
              {activeLevel.nodes.map((node) => {
                const isSelected = selectedNode === node.id;
                const isSource = node.role === 'source';
                const isCorrect = isAnswered && isCorrectSelection(node.id);
                const isWrong = isAnswered && isSelected && !isCorrectSelection(node.id);

                let nodeColor = "bg-slate-900 border-sky-500 text-sky-200 hover:bg-sky-950/50 hover:scale-105";
                
                if (isSource) {
                  nodeColor = "bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/10";
                }
                
                if (isSelected) {
                  nodeColor = "bg-sky-500 border-white text-white scale-110 shadow-lg shadow-sky-500/30";
                }

                if (isAnswered) {
                  if (isCorrect) {
                    nodeColor = "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/25";
                  } else if (isWrong) {
                    nodeColor = "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/25";
                  } else {
                    nodeColor = "bg-slate-950/50 border-slate-900 text-slate-600 pointer-events-none opacity-40";
                  }
                }

                return (
                  <motion.button
                    key={node.id}
                    onClick={() => handleNodeClick(node.id)}
                    disabled={isAnswered || isSource}
                    className={`absolute rounded-full border px-4 py-2 text-xs font-mono font-bold shadow-md transition-all outline-none flex items-center gap-1.5`}
                    style={{ left: node.x - 60, top: node.y - 20, width: 120, height: 40, justifyContent: 'center' }}
                    animate={isSource ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: isSource ? Infinity : 0, duration: 2 }}
                  >
                    <span>{node.label}</span>
                    {isSource && <span className="text-[10px] bg-indigo-500/40 text-indigo-300 px-1 rounded">Ref</span>}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Challenge prompt */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Level {currentLevel + 1} of {CHALLENGES.length}
              </div>
              
              <div className="bg-sky-950/40 border border-sky-500/10 p-4 rounded-xl flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold leading-relaxed text-slate-100">{activeLevel.instructions}</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-sky-950 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-400">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <p>
                The node marked with <span className="text-indigo-400 font-bold">Ref</span> is your starting reference element. Direct parents wrap children directly, while siblings share the same parent node.
              </p>
            </div>

            <div className="border-t border-sky-500/10 pt-4 mt-auto">
              {isAnswered ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-sky-950/30 border border-sky-500/20 rounded-xl text-xs sm:text-sm text-sky-200/90 leading-relaxed">
                    <span className="font-bold text-sky-400 block mb-1">Explanation:</span>
                    {activeLevel.explanation}
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 font-semibold rounded-xl text-white flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all hover:translate-x-0.5"
                  >
                    {currentLevel === CHALLENGES.length - 1 ? 'Finish Game' : 'Next Level'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleVerify}
                  disabled={selectedNode === null}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent font-semibold rounded-xl text-white flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all"
                >
                  Confirm Tree Selection
                </button>
              )}
            </div>
          </div>
          
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 shadow-xl">
            <Award className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-100">Tree Climbed!</h3>
            <p className="text-slate-400 max-w-sm">
              You navigated the tree perfectly and completed DOM Node Explorer! Final score: <span className="text-sky-400 font-bold">{score}</span> points.
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
    </div>
  );
}
