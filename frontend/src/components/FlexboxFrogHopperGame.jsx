import React, { useState, useEffect } from 'react';
import { Award, Check, RotateCcw, Play, Pause, X, HelpCircle, ArrowRight } from 'lucide-react';

const LEVEL_DATA = [
  {
    level: 1,
    instructions: "Align the frog to the lilypad on the right side of the pond. Use 'justify-content'.",
    targetStyle: { justifyContent: 'flex-end', alignItems: 'flex-start', flexDirection: 'row' },
    defaults: { justifyContent: 'flex-start', alignItems: 'flex-start', flexDirection: 'row' },
    variables: ['justifyContent'],
    options: {
      justifyContent: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around']
    },
    hint: "Use 'justify-content: flex-end' to align items along the main axis to the right."
  },
  {
    level: 2,
    instructions: "Move the frog to the center of the pond. Use both 'justify-content' and 'align-items'.",
    targetStyle: { justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    defaults: { justifyContent: 'flex-start', alignItems: 'flex-start', flexDirection: 'row' },
    variables: ['justifyContent', 'alignItems'],
    options: {
      justifyContent: ['flex-start', 'flex-end', 'center', 'space-between'],
      alignItems: ['flex-start', 'flex-end', 'center', 'stretch']
    },
    hint: "Combine 'justify-content: center' and 'align-items: center' to center items vertically and horizontally."
  },
  {
    level: 3,
    instructions: "Move the frog to the bottom left. The flow is vertical! Set 'flex-direction' and 'justify-content'.",
    targetStyle: { justifyContent: 'flex-end', alignItems: 'flex-start', flexDirection: 'column' },
    defaults: { justifyContent: 'flex-start', alignItems: 'flex-start', flexDirection: 'row' },
    variables: ['flexDirection', 'justifyContent'],
    options: {
      flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
      justifyContent: ['flex-start', 'flex-end', 'center']
    },
    hint: "When 'flex-direction: column' is used, the main axis is vertical, so 'justify-content: flex-end' pushes it to the bottom."
  },
  {
    level: 4,
    instructions: "Position the three frogs on their matching lilypads spread evenly across the pond. Use 'justify-content'.",
    targetStyle: { justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row' },
    defaults: { justifyContent: 'flex-start', alignItems: 'center', flexDirection: 'row' },
    variables: ['justifyContent'],
    options: {
      justifyContent: ['flex-start', 'center', 'space-between', 'space-around', 'space-evenly']
    },
    hint: "Use 'justify-content: space-between' to distribute items evenly with the first item at the start and the last at the end."
  }
];

export default function FlexboxFrogHopperGame({ onGameComplete, autoStart = false }) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [styles, setStyles] = useState({ ...LEVEL_DATA[0].defaults });
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const activeLevel = LEVEL_DATA[currentLevel];

  useEffect(() => {
    if (activeLevel) {
      setStyles({ ...activeLevel.defaults });
      setIsSuccess(false);
      setShowHint(false);
    }
  }, [currentLevel]);

  const handleStyleChange = (key, value) => {
    setStyles(prev => ({ ...prev, [key]: value }));
  };

  const verifyAnswer = () => {
    const isMatched = Object.keys(activeLevel.targetStyle).every(
      key => styles[key] === activeLevel.targetStyle[key]
    );

    if (isMatched) {
      setIsSuccess(true);
      setScore(prev => prev + 25);
    } else {
      alert("Oops! The frog is not on the lilypad yet. Try again or check the hint!");
    }
  };

  const handleNext = () => {
    if (currentLevel < LEVEL_DATA.length - 1) {
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
    setIsPaused(false);
  };

  // Helper for generating frogs
  const renderFrogs = (count) => {
    return Array.from({ length: count }).map((_, idx) => (
      <div 
        key={idx} 
        className="w-12 h-12 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center text-2xl shadow-lg animate-bounce select-none"
        style={{ animationDelay: `${idx * 0.15}s` }}
      >
        🐸
      </div>
    ));
  };

  // Helper for generating lilypads
  const renderLilypads = (count) => {
    return Array.from({ length: count }).map((_, idx) => (
      <div 
        key={idx} 
        className="w-14 h-14 rounded-full bg-green-800 border-2 border-dashed border-green-400/50 flex items-center justify-center text-xl opacity-80"
      >
        🍀
      </div>
    ));
  };

  const frogCount = activeLevel?.level === 4 ? 3 : 1;

  return (
    <div className="min-h-[580px] w-full max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
      
      {/* Background design */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-emerald-300">Flexbox Frog Hopper</h2>
          <p className="text-xs text-emerald-400 mt-1">Learn CSS Flexbox layouts visually</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-sm font-semibold text-emerald-300">
            Score: {score}
          </div>
          
          <div className="flex items-center gap-2 border-l border-emerald-500/20 pl-4">
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
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg transition-all"
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
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-3">
          <h3 className="text-2xl font-black text-slate-200">Game Paused</h3>
          <button
            onClick={() => setIsPaused(false)}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Resume Game
          </button>
        </div>
      )}

      {!completed ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Pond Visual Area */}
          <div className="bg-slate-950/70 border border-emerald-900/30 rounded-xl relative p-4 h-64 md:h-auto min-h-[300px] flex flex-col">
            <span className="absolute top-2 left-2 text-xxs font-semibold uppercase tracking-wider text-emerald-500/80 bg-slate-900 px-2 py-0.5 rounded border border-emerald-500/20">
              Pond Preview
            </span>
            
            {/* Overlay Lilypads (Target position) */}
            <div 
              className="absolute inset-4 flex pointer-events-none transition-all duration-500"
              style={{ ...activeLevel.targetStyle }}
            >
              {renderLilypads(frogCount)}
            </div>

            {/* Moving Frogs (User position) */}
            <div 
              className="absolute inset-4 flex transition-all duration-500"
              style={{ ...styles }}
            >
              {renderFrogs(frogCount)}
            </div>
          </div>

          {/* Code Editor Panel */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Level {currentLevel + 1} of {LEVEL_DATA.length}
              </div>
              <p className="text-sm leading-relaxed text-slate-200">{activeLevel.instructions}</p>
            </div>

            {/* CSS Selector box editor */}
            <div className="bg-slate-950 border border-emerald-950 p-5 rounded-xl font-mono text-sm leading-relaxed text-emerald-400">
              <div>.pond {"{"}</div>
              <div className="pl-4 text-slate-400">display: flex;</div>
              
              {activeLevel.variables.includes('flexDirection') && (
                <div className="pl-4 flex items-center gap-2">
                  <span>flex-direction:</span>
                  <select 
                    value={styles.flexDirection} 
                    onChange={e => handleStyleChange('flexDirection', e.target.value)}
                    className="bg-slate-900 border border-emerald-800 text-emerald-300 rounded px-2 py-0.5 text-xs outline-none focus:border-emerald-500"
                  >
                    {activeLevel.options.flexDirection.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <span>;</span>
                </div>
              )}

              {activeLevel.variables.includes('justifyContent') && (
                <div className="pl-4 flex items-center gap-2">
                  <span>justify-content:</span>
                  <select 
                    value={styles.justifyContent} 
                    onChange={e => handleStyleChange('justifyContent', e.target.value)}
                    className="bg-slate-900 border border-emerald-800 text-emerald-300 rounded px-2 py-0.5 text-xs outline-none focus:border-emerald-500"
                  >
                    {activeLevel.options.justifyContent.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <span>;</span>
                </div>
              )}

              {activeLevel.variables.includes('alignItems') && (
                <div className="pl-4 flex items-center gap-2">
                  <span>align-items:</span>
                  <select 
                    value={styles.alignItems} 
                    onChange={e => handleStyleChange('alignItems', e.target.value)}
                    className="bg-slate-900 border border-emerald-800 text-emerald-300 rounded px-2 py-0.5 text-xs outline-none focus:border-emerald-500"
                  >
                    {activeLevel.options.alignItems.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <span>;</span>
                </div>
              )}

              <div>{"}"}</div>
            </div>

            {/* Actions / Hint panel */}
            <div className="border-t border-emerald-500/10 pt-4 mt-auto">
              {showHint && (
                <div className="mb-4 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs sm:text-sm text-emerald-200">
                  <span className="font-bold text-emerald-400 block mb-1">Hint:</span>
                  {activeLevel.hint}
                </div>
              )}

              <div className="flex gap-2">
                {!isSuccess ? (
                  <>
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-750 font-semibold rounded-xl text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <HelpCircle className="w-4 h-4" />
                      {showHint ? 'Hide Hint' : 'Hint'}
                    </button>
                    <button
                      onClick={verifyAnswer}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl text-white shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      Hopper Jump!
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:translate-x-0.5"
                  >
                    {currentLevel === LEVEL_DATA.length - 1 ? 'Finish Game' : 'Next Level'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
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
              You positioned all frogs correctly and completed Flexbox Frog Hopper! Final score: <span className="text-emerald-400 font-bold">{score}</span> points.
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
