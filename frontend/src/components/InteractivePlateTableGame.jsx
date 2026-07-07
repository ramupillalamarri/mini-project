import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle2, XCircle, ArrowRight, HelpCircle, RotateCcw, Play, Pause, X } from 'lucide-react';

const CHALLENGES = [
  {
    instructions: "Select the plates.",
    code: "plate",
    options: ["plate", ".plate", "#plate", "div plate"],
    // matches indices on the table: plate is indices [1, 2, 4]
    matches: [1, 2, 4],
    answer: 0,
    explanation: "Type selector selects all elements of that tag name. 'plate' selects all <plate> elements."
  },
  {
    instructions: "Select the apple on the plate.",
    code: "plate > apple",
    options: ["plate apple", "plate > apple", "apple plate", "plate + apple"],
    // matches the apple inside plate: index 5 (which is inside plate index 1)
    matches: [5],
    answer: 1,
    explanation: "The child combinator (>) selects elements that are direct children of a specified element. 'plate > apple' targets the apple directly inside <plate>."
  },
  {
    instructions: "Select the small apple.",
    code: "apple.small",
    options: ["apple#small", "apple.small", ".apple#small", "small"],
    // matches apple.small: index 3
    matches: [3],
    answer: 1,
    explanation: "The class selector selects elements with a specific class name. 'apple.small' targets <apple> elements with class 'small'."
  },
  {
    instructions: "Select the empty plates.",
    code: "plate:empty",
    options: ["plate:empty", "plate:blank", "plate::empty", "plate:not(apple)"],
    // matches empty plate: index 2
    matches: [2],
    answer: 0,
    explanation: "The :empty pseudo-class matches elements that have no children (not even text nodes). 'plate:empty' matches the plate with no apple."
  }
];

export default function InteractivePlateTableGame({ onGameComplete, autoStart = false }) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const activeChallenge = CHALLENGES[currentIdx];

  const handleOptionClick = (index) => {
    if (isAnswered) return;
    setSelectedOpt(index);
  };

  const handleAnswerSubmit = () => {
    if (selectedOpt === null || isAnswered) return;
    setIsAnswered(true);
    if (selectedOpt === activeChallenge.answer) {
      setScore(prev => prev + 25);
    }
  };

  const handleNext = () => {
    setSelectedOpt(null);
    setIsAnswered(false);
    if (currentIdx < CHALLENGES.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setCompleted(true);
      if (onGameComplete) {
        onGameComplete(score + (selectedOpt === activeChallenge.answer ? 25 : 0));
      }
    }
  };

  const restartGame = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsAnswered(false);
    setScore(0);
    setCompleted(false);
  };

  // The virtual table items:
  // 0: Bento box
  // 1: Plate with Apple
  // 2: Empty Plate
  // 3: Small Apple
  // 4: Fancy Plate
  const renderTableItem = (id, label, icon, isFancy = false) => {
    // Check if this item is currently matched by the selected option
    const isSelectedMatch = selectedOpt === activeChallenge.answer && activeChallenge.matches.includes(id);
    const isAnySelected = selectedOpt !== null;
    const isFalsyMatch = selectedOpt !== null && selectedOpt !== activeChallenge.answer && CHALLENGES[currentIdx].options[selectedOpt] === activeChallenge.options[selectedOpt] && false; // simplified

    // Apply animation classes
    return (
      <motion.div
        key={id}
        className={`w-28 h-28 rounded-xl flex flex-col items-center justify-center border relative transition-all duration-300 ${
          isFancy ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800 bg-slate-900/60'
        } ${isSelectedMatch ? 'ring-4 ring-emerald-500 shadow-emerald-500/30' : ''}`}
        animate={isSelectedMatch ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ repeat: isSelectedMatch ? Infinity : 0, duration: 1.5 }}
      >
        <span className="text-4xl select-none">{icon}</span>
        <span className="text-xxs font-mono text-slate-400 mt-2">{label}</span>
      </motion.div>
    );
  };

  return (
    <div className="min-h-[580px] w-full max-w-4xl mx-auto bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-950 rounded-2xl border border-indigo-500/20 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-indigo-200">The Interactive Plate Table</h2>
          <p className="text-xs text-indigo-400 mt-1">Visualize CSS targeting in real-time</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-sm font-semibold text-indigo-300">
            Score: {score}
          </div>
          
          <div className="flex items-center gap-2 border-l border-indigo-500/20 pl-4">
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
                setCurrentIdx(0);
                setSelectedOpt(null);
                setIsAnswered(false);
                setScore(0);
                setCompleted(false);
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
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Resume Game
          </button>
        </div>
      )}

      {!completed ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Left Panel: The Diner Dinner Table (Visual Playground) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between relative min-h-[300px]">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">
              Dinner Table Preview
            </div>

            <div className="flex-1 grid grid-cols-3 gap-4 items-center justify-items-center my-auto">
              {/* 0: Bento */}
              {renderTableItem(0, "<bento>", "🍱")}
              
              {/* 1: Plate with Apple (Contains apple index 5) */}
              <div className="relative">
                {renderTableItem(1, "<plate>", "🍽️")}
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center pb-2 pointer-events-none text-2xl"
                  animate={selectedOpt === activeChallenge.answer && activeChallenge.matches.includes(5) ? { scale: [1, 1.2, 1], y: [0, -10, 0] } : {}}
                  transition={{ repeat: (selectedOpt === activeChallenge.answer && activeChallenge.matches.includes(5)) ? Infinity : 0, duration: 1.2 }}
                >
                  🍎
                </motion.div>
              </div>

              {/* 2: Empty Plate */}
              {renderTableItem(2, "<plate empty>", "🍽️")}

              {/* 3: Small Apple */}
              {renderTableItem(3, "<apple class='small'>", "🍎")}

              {/* 4: Fancy Plate */}
              {renderTableItem(4, "<plate id='fancy'>", "⭐🍽️", true)}
            </div>

            <div className="mt-4 p-3 bg-indigo-950/30 border border-indigo-500/10 rounded-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 block mb-0.5">Objective</span>
              <p className="text-sm text-slate-100 font-semibold">{activeChallenge.instructions}</p>
            </div>
          </div>

          {/* Right Panel: Challenge & Selector Input */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Level {currentIdx + 1} of {CHALLENGES.length}
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-100">
                Pick the correct CSS selector rules:
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5 my-2">
              {activeChallenge.options.map((option, idx) => {
                let optStyle = "border-slate-800 bg-slate-900/60 hover:bg-indigo-950/40 hover:border-indigo-500/50";
                
                if (isAnswered) {
                  if (idx === activeChallenge.answer) {
                    optStyle = "border-emerald-500 bg-emerald-950/30 text-emerald-200";
                  } else if (idx === selectedOpt) {
                    optStyle = "border-rose-500 bg-rose-950/30 text-rose-200";
                  } else {
                    optStyle = "border-slate-800 bg-slate-900/30 text-slate-550";
                  }
                } else if (selectedOpt === idx) {
                  optStyle = "border-indigo-500 bg-indigo-950/50 ring-2 ring-indigo-500/30 text-indigo-200";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(idx)}
                    disabled={isAnswered}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 font-mono font-medium flex items-center justify-between group ${optStyle}`}
                  >
                    <span>{option}</span>
                    {isAnswered && idx === activeChallenge.answer && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && idx === selectedOpt && idx !== activeChallenge.answer && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-indigo-500/10 pt-4 mt-auto">
              {isAnswered ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs sm:text-sm text-indigo-200/90 leading-relaxed animate-fade-in">
                    <span className="font-bold text-indigo-400 block mb-1">Explanation:</span>
                    {activeChallenge.explanation}
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:translate-x-0.5"
                  >
                    {currentIdx === CHALLENGES.length - 1 ? 'Finish Game' : 'Next Level'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAnswerSubmit}
                  disabled={selectedOpt === null}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent font-semibold rounded-xl text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Verify Selector Matches
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
            <h3 className="text-2xl font-bold text-slate-100">Congratulations!</h3>
            <p className="text-slate-400 max-w-sm">
              You completed the CSS Diner Table challenge with a final score of <span className="text-indigo-400 font-bold">{score}</span> points.
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
