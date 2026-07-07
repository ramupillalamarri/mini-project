import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Check, AlertTriangle, ArrowRight, RotateCcw, Play, Pause, X, Terminal } from 'lucide-react';

const CHALLENGES = [
  {
    level: 1,
    title: "The Basics: Sync, Micro, Macro",
    code: `console.log("Start");
setTimeout(() => console.log("Timeout"), 0);
Promise.resolve().then(() => console.log("Promise"));
console.log("End");`,
    // The items in the pipeline in order of setup
    initialLanes: {
      stack: [
        { id: 'sync_start', label: 'console.log("Start")', output: 'Start', order: 1 },
        { id: 'sync_end', label: 'console.log("End")', output: 'End', order: 2 }
      ],
      micro: [
        { id: 'micro_promise', label: 'PromiseCallback', output: 'Promise', order: 3 }
      ],
      macro: [
        { id: 'macro_timeout', label: 'TimeoutCallback', output: 'Timeout', order: 4 }
      ]
    },
    // The correct sequence of IDs to click
    correctSequence: ['sync_start', 'sync_end', 'micro_promise', 'macro_timeout'],
    explanation: "Synchronous operations ('Start', 'End') run to completion first. Next, the Microtask queue (Promises) is completely emptied. Finally, the Macrotask queue (timeouts) is processed."
  },
  {
    level: 2,
    title: "Double Promise Queues",
    code: `console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
Promise.resolve().then(() => console.log("4"));
console.log("5");`,
    initialLanes: {
      stack: [
        { id: 'sync_1', label: 'console.log("1")', output: '1', order: 1 },
        { id: 'sync_5', label: 'console.log("5")', output: '5', order: 2 }
      ],
      micro: [
        { id: 'micro_3', label: 'PromiseCallback 3', output: '3', order: 3 },
        { id: 'micro_4', label: 'PromiseCallback 4', output: '4', order: 4 }
      ],
      macro: [
        { id: 'macro_2', label: 'TimeoutCallback 2', output: '2', order: 5 }
      ]
    },
    correctSequence: ['sync_1', 'sync_5', 'micro_3', 'micro_4', 'macro_2'],
    explanation: "1 and 5 run immediately. Both promise callbacks are queued into the microtask queue, which is emptied in FIFO order (3 then 4). The timeout runs last."
  }
];

export default function AsynchronousPipelineGame({ onGameComplete, autoStart = false }) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [lanes, setLanes] = useState({ stack: [], micro: [], macro: [] });
  const [clickOrder, setClickOrder] = useState([]);
  const [consoleOutputs, setConsoleOutputs] = useState([]);
  const [errorCount, setErrorCount] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const activeChallenge = CHALLENGES[currentLevel];

  const initializeLevel = () => {
    if (!activeChallenge) return;
    setLanes(JSON.parse(JSON.stringify(activeChallenge.initialLanes)));
    setClickOrder([]);
    setConsoleOutputs([]);
    setErrorCount(0);
  };

  useEffect(() => {
    initializeLevel();
  }, [currentLevel]);

  const handleCardClick = (card, laneKey) => {
    const nextIndex = clickOrder.length;
    const expectedId = activeChallenge.correctSequence[nextIndex];

    if (card.id === expectedId) {
      // Correct!
      setClickOrder(prev => [...prev, card.id]);
      setConsoleOutputs(prev => [...prev, `> ${card.output}`]);
      
      // Remove card from its lane
      setLanes(prev => ({
        ...prev,
        [laneKey]: prev[laneKey].filter(c => c.id !== card.id)
      }));

      // Check if level completed
      if (clickOrder.length + 1 === activeChallenge.correctSequence.length) {
        const levelBonus = Math.max(10, 50 - errorCount * 10);
        setScore(prev => prev + levelBonus);
      }
    } else {
      // Wrong card clicked
      setErrorCount(prev => prev + 1);
      
      // Shake effect
      const cardEl = document.getElementById(card.id);
      if (cardEl) {
        cardEl.classList.add('animate-shake');
        setTimeout(() => cardEl.classList.remove('animate-shake'), 500);
      }
    }
  };

  const handleNext = () => {
    if (currentLevel < CHALLENGES.length - 1) {
      setCurrentLevel(prev => prev + 1);
    } else {
      setCompleted(true);
      if (onGameComplete) {
        onGameComplete(score);
      }
    }
  };

  const restartGame = () => {
    setCurrentLevel(0);
    setScore(0);
    setCompleted(false);
  };

  const levelCompleted = activeChallenge && clickOrder.length === activeChallenge.correctSequence.length;

  return (
    <div className="min-h-[600px] w-full max-w-5xl mx-auto bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 border border-violet-500/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-violet-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-violet-350">Asynchronous Pipeline</h2>
          <p className="text-xs text-violet-400 mt-1">Act as the JS Event Loop engine</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-full text-sm font-semibold text-violet-300">
            Score: {score}
          </div>
          
          <div className="flex items-center gap-2 border-l border-violet-500/20 pl-4">
            <button
              onClick={() => setIsPaused(p => !p)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg transition-all"
              title={isPaused ? "Resume Game" : "Pause Game"}
              disabled={completed}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={() => {
                setCurrentLevel(0);
                setScore(0);
                setCompleted(false);
                setClickOrder([]);
                setConsoleOutputs([]);
                setIsPaused(false);
              }}
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
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Resume Game
          </button>
        </div>
      )}

      {!completed ? (
        <div className="flex-1 flex flex-col space-y-6">
          
          {/* Top Panel: The Code and Console Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Code Block display */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xxs font-bold uppercase tracking-wider text-violet-400 mb-2">JavaScript Execution Block</span>
              <pre className="text-xs font-mono text-violet-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-violet-950/40 overflow-x-auto whitespace-pre">
                {activeChallenge.code}
              </pre>
            </div>

            {/* Simulated Console Logs */}
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex flex-col">
              <div className="text-xxs font-bold uppercase tracking-wider text-violet-450 mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-violet-400" />
                Console Logs
              </div>
              <div className="flex-1 bg-slate-900/40 p-3 rounded-lg border border-slate-950 text-xs font-mono text-emerald-400 h-28 overflow-y-auto space-y-1">
                {consoleOutputs.length === 0 ? (
                  <span className="text-slate-500 italic">No output yet. Click pipeline cards...</span>
                ) : (
                  consoleOutputs.map((out, idx) => <div key={idx}>{out}</div>)
                )}
              </div>
            </div>

          </div>

          {/* Middle Panel: Visual Queues and Pipelines */}
          <div className="grid grid-cols-3 gap-4 bg-slate-950/40 border border-slate-900 rounded-xl p-4 relative min-h-[180px] items-start">
            
            {/* Call Stack container (LIFO) */}
            <div className="bg-slate-950/60 border border-indigo-950 rounded-lg p-3 flex flex-col items-center min-h-[140px]">
              <span className="text-xxs font-bold text-indigo-400 uppercase tracking-wider mb-3">Call Stack</span>
              <div className="flex flex-col-reverse gap-2 w-full">
                <AnimatePresence>
                  {lanes.stack.map((card, idx) => (
                    <motion.button
                      id={card.id}
                      key={card.id}
                      onClick={() => handleCardClick(card, 'stack')}
                      className="w-full py-2 px-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded text-xxs font-mono text-indigo-200 shadow hover:shadow-indigo-500/10 cursor-pointer outline-none select-none"
                      layoutId={card.id}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                      {card.label}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Microtask Queue container (FIFO) */}
            <div className="bg-slate-950/60 border border-violet-950 rounded-lg p-3 flex flex-col items-center min-h-[140px]">
              <span className="text-xxs font-bold text-violet-400 uppercase tracking-wider mb-3">Microtask Queue</span>
              <div className="flex flex-col gap-2 w-full">
                <AnimatePresence>
                  {lanes.micro.map((card) => (
                    <motion.button
                      id={card.id}
                      key={card.id}
                      onClick={() => handleCardClick(card, 'micro')}
                      className="w-full py-2 px-3 bg-violet-900/40 hover:bg-violet-900/60 border border-violet-500/30 rounded text-xxs font-mono text-violet-200 shadow hover:shadow-violet-500/10 cursor-pointer outline-none select-none"
                      layoutId={card.id}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                      {card.label}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Macrotask Queue container (FIFO) */}
            <div className="bg-slate-950/60 border border-pink-950 rounded-lg p-3 flex flex-col items-center min-h-[140px]">
              <span className="text-xxs font-bold text-pink-400 uppercase tracking-wider mb-3">Macrotask Queue</span>
              <div className="flex flex-col gap-2 w-full">
                <AnimatePresence>
                  {lanes.macro.map((card) => (
                    <motion.button
                      id={card.id}
                      key={card.id}
                      onClick={() => handleCardClick(card, 'macro')}
                      className="w-full py-2 px-3 bg-pink-900/40 hover:bg-pink-900/60 border border-pink-500/30 rounded text-xxs font-mono text-pink-200 shadow hover:shadow-pink-500/10 cursor-pointer outline-none select-none"
                      layoutId={card.id}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                      {card.label}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* Bottom Panel: Verification & Info */}
          <div className="border-t border-violet-500/10 pt-4 mt-auto">
            {errorCount > 0 && !levelCompleted && (
              <div className="mb-4 p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl text-xs flex items-center gap-2 text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Wrong queue extracted! Review synchronous operations vs. micro vs. macro execution order.</span>
              </div>
            )}
            
            {levelCompleted ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-violet-950/30 border border-violet-500/20 rounded-xl text-xs sm:text-sm text-violet-200/90 leading-relaxed">
                  <span className="font-bold text-violet-400 block mb-1">Explanation:</span>
                  {activeChallenge.explanation}
                </div>
                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 font-semibold rounded-xl text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:translate-x-0.5"
                >
                  {currentLevel === CHALLENGES.length - 1 ? 'Finish Pipeline Challenge' : 'Next Level'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-400 text-center font-medium">
                👉 Click cards inside the stack/queues in the exact order they should pop off and execute!
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 shadow-xl">
            <Award className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-100">Pipeline Synchronized!</h3>
            <p className="text-slate-400 max-w-sm">
              You acted as the Event Loop successfully! Final score: <span className="text-violet-400 font-bold">{score}</span> points.
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
