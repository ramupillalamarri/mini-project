import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Check, AlertTriangle, ArrowRight, RotateCcw, Play, Pause, X, Terminal, Move, Layers, Navigation } from 'lucide-react';

const LEVELS = [
  {
    id: 1,
    title: "Level 1: LIFO Reversal",
    description: "Match the target cargo sequence. Note: the target is reversed from the incoming crates!",
    incoming: ['Red', 'Green', 'Blue'],
    target: ['Blue', 'Green', 'Red'],
    movesLimit: 10,
    hint: "Pushed crates go on top. Popping them outputs in reverse order (LIFO)!"
  },
  {
    id: 2,
    title: "Level 2: FIFO Conveyor",
    description: "Match the target cargo sequence. Here, the target order is the same as incoming!",
    incoming: ['Yellow', 'Purple', 'Orange'],
    target: ['Yellow', 'Purple', 'Orange'],
    movesLimit: 10,
    hint: "Queued crates enter the back and leave from the front. This preserves arrival order (FIFO)!"
  },
  {
    id: 3,
    title: "Level 3: Sorting Terminal",
    description: "Combine Stack (LIFO) and Queue (FIFO) to sort the scrambled crates into the target order!",
    incoming: ['Red', 'Blue', 'Yellow', 'Green'],
    target: ['Red', 'Green', 'Blue', 'Yellow'],
    movesLimit: 15,
    hint: "Use the Stack to reverse sequences and the Queue to delay output!"
  }
];

export default function StackQueueCargoGame({ onGameComplete, autoStart = false }) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [gameState, setGameState] = useState('playing'); // playing, completed, gameover
  
  // State for buffers
  const [incomingList, setIncomingList] = useState([]);
  const [stackBuffer, setStackBuffer] = useState([]);
  const [queueBuffer, setQueueBuffer] = useState([]);
  const [targetBin, setTargetBin] = useState([]);
  
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const activeLevel = LEVELS[currentLevel];

  const initLevel = () => {
    const lvl = LEVELS[currentLevel];
    setIncomingList([...lvl.incoming]);
    setStackBuffer([]);
    setQueueBuffer([]);
    setTargetBin([]);
    setMoves(0);
    setGameState('playing');
    setFeedback(null);
  };

  const restartGame = () => {
    setCurrentLevel(0);
    setScore(0);
    setIncomingList([...LEVELS[0].incoming]);
    setStackBuffer([]);
    setQueueBuffer([]);
    setTargetBin([]);
    setMoves(0);
    setGameState('playing');
    setFeedback(null);
  };

  useEffect(() => {
    initLevel();
  }, [currentLevel]);

  // Operations
  const handlePushStack = () => {
    if (isPaused || gameState !== 'playing') return;
    if (incomingList.length === 0) {
      showFeedback("No more incoming crates!", "error");
      return;
    }
    if (stackBuffer.length >= 5) {
      showFeedback("Stack Overflow! Maximum height is 5.", "error");
      return;
    }
    if (moves >= activeLevel.movesLimit) {
      showFeedback("Move limit reached!", "error");
      return;
    }

    const nextCrate = incomingList[0];
    setIncomingList(prev => prev.slice(1));
    setStackBuffer(prev => [...prev, nextCrate]);
    setMoves(prev => prev + 1);
    showFeedback(`Pushed ${nextCrate} to Stack!`, "success");
  };

  const handlePopStack = () => {
    if (isPaused || gameState !== 'playing') return;
    if (stackBuffer.length === 0) {
      showFeedback("Stack Underflow! Stack is empty.", "error");
      return;
    }
    if (moves >= activeLevel.movesLimit) {
      showFeedback("Move limit reached!", "error");
      return;
    }

    const poppedCrate = stackBuffer[stackBuffer.length - 1];
    setStackBuffer(prev => prev.slice(0, -1));
    setTargetBin(prev => [...prev, poppedCrate]);
    setMoves(prev => prev + 1);
    showFeedback(`Popped ${poppedCrate} from Stack to Target!`, "success");
  };

  const handleEnqueue = () => {
    if (isPaused || gameState !== 'playing') return;
    if (incomingList.length === 0) {
      showFeedback("No more incoming crates!", "error");
      return;
    }
    if (queueBuffer.length >= 5) {
      showFeedback("Queue Overflow! Conveyor max capacity is 5.", "error");
      return;
    }
    if (moves >= activeLevel.movesLimit) {
      showFeedback("Move limit reached!", "error");
      return;
    }

    const nextCrate = incomingList[0];
    setIncomingList(prev => prev.slice(1));
    setQueueBuffer(prev => [...prev, nextCrate]);
    setMoves(prev => prev + 1);
    showFeedback(`Enqueued ${nextCrate} to Queue!`, "success");
  };

  const handleDequeue = () => {
    if (isPaused || gameState !== 'playing') return;
    if (queueBuffer.length === 0) {
      showFeedback("Queue Underflow! Queue is empty.", "error");
      return;
    }
    if (moves >= activeLevel.movesLimit) {
      showFeedback("Move limit reached!", "error");
      return;
    }

    const dequeuedCrate = queueBuffer[0];
    setQueueBuffer(prev => prev.slice(1));
    setTargetBin(prev => [...prev, dequeuedCrate]);
    setMoves(prev => prev + 1);
    showFeedback(`Dequeued ${dequeuedCrate} from Queue to Target!`, "success");
  };

  // Check matching status
  useEffect(() => {
    if (targetBin.length === activeLevel.target.length) {
      const isMatch = targetBin.every((val, idx) => val === activeLevel.target[idx]);
      if (isMatch) {
        const bonus = Math.max(10, (activeLevel.movesLimit - moves) * 10);
        setScore(prev => prev + 50 + bonus);
        showFeedback(`Sequence Matched! +${50 + bonus} Points!`, "success");
        if (currentLevel < LEVELS.length - 1) {
          setTimeout(() => {
            setCurrentLevel(prev => prev + 1);
          }, 1500);
        } else {
          setTimeout(() => {
            setGameState('completed');
          }, 1500);
        }
      } else {
        showFeedback("Sequence mismatch! Resetting level...", "error");
        setTimeout(initLevel, 1500);
      }
    } else if (incomingList.length === 0 && stackBuffer.length === 0 && queueBuffer.length === 0) {
      // No more possible moves, and target bin is incomplete
      showFeedback("Incomplete sequence. Resetting...", "error");
      setTimeout(initLevel, 1500);
    }
  }, [targetBin]);

  const showFeedback = (msg, type) => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const getColorClass = (color) => {
    switch (color) {
      case 'Red': return 'bg-rose-500 border-rose-400 text-rose-100 shadow-rose-500/20';
      case 'Green': return 'bg-emerald-500 border-emerald-400 text-emerald-100 shadow-emerald-500/20';
      case 'Blue': return 'bg-sky-500 border-sky-400 text-sky-100 shadow-sky-500/20';
      case 'Yellow': return 'bg-amber-500 border-amber-400 text-amber-950 shadow-amber-500/20';
      case 'Purple': return 'bg-purple-500 border-purple-400 text-purple-100 shadow-purple-500/20';
      case 'Orange': return 'bg-orange-500 border-orange-400 text-orange-950 shadow-orange-500/20';
      default: return 'bg-slate-700 border-slate-600 text-slate-100';
    }
  };

  return (
    <div className="min-h-[600px] w-full max-w-5xl mx-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between select-none">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-indigo-300">Stack & Queue Cargo Loader</h2>
          <p className="text-xs text-indigo-400 mt-1">LIFO Stack vs FIFO Queue Operations</p>
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
              disabled={gameState !== 'playing'}
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
          {/* Top Panel: Target Goal Manifest & Game Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Mission Manifest */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between col-span-2">
              <div>
                <span className="text-xxs font-bold uppercase tracking-wider text-indigo-400 block mb-1">Mission Manifest</span>
                <span className="text-sm font-semibold text-slate-100">{activeLevel.title}: {activeLevel.description}</span>
              </div>
              <div className="mt-3 text-xxs text-slate-450 italic font-medium">
                💡 {activeLevel.hint}
              </div>
            </div>

            {/* Live Stats */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-center items-center text-center">
              <span className="text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Moves Remaining</span>
              <span className={`text-3xl font-black ${activeLevel.movesLimit - moves <= 2 ? 'text-rose-500' : 'text-slate-100'}`}>
                {activeLevel.movesLimit - moves}
              </span>
              <span className="text-xxs text-slate-500 mt-1">Limit: {activeLevel.movesLimit}</span>
            </div>

          </div>

          {/* Interactive Playfield Map */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Col: Incoming Crates Conveyor Belt */}
            <div className="md:col-span-3 bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col items-center justify-between min-h-[160px]">
              <span className="text-xxs font-bold uppercase tracking-wider text-indigo-400/80 mb-3 self-start">Incoming Crates</span>
              <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-visible w-full items-center justify-center flex-1">
                <AnimatePresence>
                  {incomingList.map((crate, idx) => (
                    <motion.div
                      key={`${crate}-${idx}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className={`w-20 md:w-full py-3.5 border rounded-xl flex items-center justify-center font-bold text-xs shadow-md ${getColorClass(crate)}`}
                    >
                      {crate}
                    </motion.div>
                  ))}
                  {incomingList.length === 0 && (
                    <span className="text-xxs text-slate-500 italic">Empty Conveyor</span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Middle Col: Stack vs Queue Buffers */}
            <div className="md:col-span-6 grid grid-cols-2 gap-4">
              
              {/* Stack buffer */}
              <div className="bg-slate-950/60 border border-indigo-500/10 rounded-xl p-4 flex flex-col justify-between items-center relative overflow-hidden">
                <div className="w-full flex justify-between items-center border-b border-indigo-950 pb-2 mb-3">
                  <span className="text-xxs font-bold uppercase tracking-wider text-indigo-350 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Stack (LIFO)
                  </span>
                  <span className="text-[10px] text-slate-500">{stackBuffer.length}/5</span>
                </div>

                {/* Stack crates pile */}
                <div className="flex-1 flex flex-col-reverse justify-start items-center gap-2 w-full min-h-[140px]">
                  <AnimatePresence>
                    {stackBuffer.map((crate, idx) => (
                      <motion.div
                        key={`stack-${idx}`}
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className={`w-full py-2.5 border rounded-lg flex items-center justify-center font-bold text-xxs shadow-md ${getColorClass(crate)}`}
                      >
                        {crate}
                      </motion.div>
                    ))}
                    {stackBuffer.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-600 italic">
                        Empty Stack
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Operations Buttons */}
                <div className="grid grid-cols-2 gap-2 w-full mt-4 z-10">
                  <button
                    onClick={handlePushStack}
                    className="py-2 bg-indigo-950 border border-indigo-500/30 text-indigo-200 text-xxs font-bold rounded-lg hover:bg-indigo-900/60 transition-all"
                  >
                    Push
                  </button>
                  <button
                    onClick={handlePopStack}
                    className="py-2 bg-slate-900 border border-slate-800 text-slate-200 text-xxs font-bold rounded-lg hover:bg-slate-800 transition-all"
                  >
                    Pop
                  </button>
                </div>
              </div>

              {/* Queue buffer */}
              <div className="bg-slate-950/60 border border-indigo-500/10 rounded-xl p-4 flex flex-col justify-between items-center relative overflow-hidden">
                <div className="w-full flex justify-between items-center border-b border-indigo-950 pb-2 mb-3">
                  <span className="text-xxs font-bold uppercase tracking-wider text-indigo-350 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 rotate-90 text-indigo-400" /> Queue (FIFO)
                  </span>
                  <span className="text-[10px] text-slate-500">{queueBuffer.length}/5</span>
                </div>

                {/* Queue crates pile */}
                <div className="flex-1 flex flex-col justify-start items-center gap-2 w-full min-h-[140px]">
                  <AnimatePresence>
                    {queueBuffer.map((crate, idx) => (
                      <motion.div
                        key={`queue-${idx}`}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        className={`w-full py-2.5 border rounded-lg flex items-center justify-center font-bold text-xxs shadow-md ${getColorClass(crate)}`}
                      >
                        {crate}
                      </motion.div>
                    ))}
                    {queueBuffer.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-600 italic">
                        Empty Queue
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Operations Buttons */}
                <div className="grid grid-cols-2 gap-2 w-full mt-4 z-10">
                  <button
                    onClick={handleEnqueue}
                    className="py-2 bg-indigo-950 border border-indigo-500/30 text-indigo-200 text-xxs font-bold rounded-lg hover:bg-indigo-900/60 transition-all"
                  >
                    Enqueue
                  </button>
                  <button
                    onClick={handleDequeue}
                    className="py-2 bg-slate-900 border border-slate-800 text-slate-200 text-xxs font-bold rounded-lg hover:bg-slate-800 transition-all"
                  >
                    Dequeue
                  </button>
                </div>
              </div>

            </div>

            {/* Right Col: Output cargo bay / Target Bin */}
            <div className="md:col-span-3 bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col justify-between items-center min-h-[160px]">
              
              <div className="w-full flex flex-col gap-1 align-start mb-3">
                <span className="text-xxs font-bold uppercase tracking-wider text-indigo-400">Target Manifest</span>
                <div className="flex gap-1.5 flex-wrap">
                  {activeLevel.target.map((t, idx) => (
                    <span key={idx} className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-bold text-slate-300">
                      {idx+1}: {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Bin contents */}
              <div className="flex-1 flex flex-col-reverse justify-start items-center gap-2.5 w-full min-h-[120px]">
                <AnimatePresence>
                  {targetBin.map((crate, idx) => {
                    const expectedColor = activeLevel.target[idx];
                    const isMatching = crate === expectedColor;
                    return (
                      <motion.div
                        key={`target-${idx}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-full py-2 border rounded-xl flex items-center justify-between px-3 font-bold text-xxs shadow-md ${getColorClass(crate)}`}
                      >
                        <span>{crate}</span>
                        {isMatching ? (
                          <Check className="w-3.5 h-3.5 text-emerald-100" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-100 animate-pulse" />
                        )}
                      </motion.div>
                    );
                  })}
                  {targetBin.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-xxs text-slate-650 italic">
                      No Crates Loaded
                    </div>
                  )}
                </AnimatePresence>
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
            <h3 className="text-2xl font-bold text-slate-100 font-sans">Terminal Cleared!</h3>
            <p className="text-slate-400 max-w-sm">
              You configured LIFO Stacks and FIFO Queues successfully! Final score: <span className="text-indigo-400 font-bold">{score}</span> points.
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
