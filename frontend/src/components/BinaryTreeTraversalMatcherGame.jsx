import React, { useState, useEffect } from 'react';
import { Award, ArrowUp, ArrowDown, Check, HelpCircle, RefreshCw } from 'lucide-react';

const INITIAL_ITEMS = [
  { id: '1', name: 'Physical Layer', rank: 1, desc: 'Transmits raw bit streams over a physical medium.' },
  { id: '2', name: 'Data Link Layer', rank: 2, desc: 'Provides node-to-node data transfer and error correction.' },
  { id: '3', name: 'Network Layer', rank: 3, desc: 'Handles packet routing, forwarding and logical addressing.' },
  { id: '4', name: 'Transport Layer', rank: 4, desc: 'Manages end-to-end communication, reliability, and flow control.' },
  { id: '5', name: 'Session Layer', rank: 5, desc: 'Establishes, manages, and terminates sessions between applications.' },
  { id: '6', name: 'Presentation Layer', rank: 6, desc: 'Translates, encrypts, and compresses data for application use.' },
  { id: '7', name: 'Application Layer', rank: 7, desc: 'Provides network services directly to end-user applications.' }
];

export default function BinaryTreeTraversalMatcherGame({ onGameComplete }) {
  const [items, setItems] = useState([]);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const initializeGame = () => {
    // Shuffle the OSI model layers randomly
    const shuffled = [...INITIAL_ITEMS].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setChecked(false);
    setScore(0);
    setCompleted(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const moveItem = (index, direction) => {
    if (checked) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setItems(updated);
  };

  const handleCheck = () => {
    setChecked(true);
    let correctCount = 0;
    
    items.forEach((item, idx) => {
      // Correct position is rank - 1 (1-indexed to 0-indexed)
      if (item.rank === idx + 1) {
        correctCount += 1;
      }
    });

    const finalScore = Math.round((correctCount / items.length) * 100);
    setScore(finalScore);
    setCompleted(true);
    
    if (onGameComplete) {
      onGameComplete(finalScore);
    }
  };

  return (
    <div className="min-h-[500px] w-full max-w-3xl mx-auto bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-2xl border border-indigo-500/20 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-indigo-200">Binary Tree Traversal Matcher</h2>
          <p className="text-xs text-indigo-400/80 mt-1">Sorting Order - Local Fallback Mode</p>
        </div>
        <button 
          onClick={initializeGame} 
          className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 my-auto">
        <p className="text-sm text-indigo-300/80 flex items-center gap-2 mb-2 font-medium">
          <HelpCircle className="w-4 h-4" />
          Arrange the OSI Layers in order from Bottom (Layer 1) to Top (Layer 7) using the arrows:
        </p>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {items.map((item, idx) => {
            const isCorrect = checked && item.rank === idx + 1;
            const borderStyle = checked 
              ? isCorrect 
                ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200' 
                : 'border-rose-500/50 bg-rose-950/20 text-rose-200'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700';

            return (
              <div 
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${borderStyle}`}
              >
                <div className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base">{item.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                  </div>
                </div>

                {!checked && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
                    >
                      <ArrowUp className="w-4 h-4 text-indigo-400" />
                    </button>
                    <button
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === items.length - 1}
                      className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
                    >
                      <ArrowDown className="w-4 h-4 text-indigo-400" />
                    </button>
                  </div>
                )}

                {checked && isCorrect && (
                  <Check className="w-5 h-5 text-emerald-400 mr-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-indigo-500/10 pt-4 mt-6">
        {!completed ? (
          <button
            onClick={handleCheck}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white shadow-lg shadow-indigo-600/30 transition-all"
          >
            Check My Arrangement
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100">Sorting Complete!</h4>
                <p className="text-xs text-slate-400">Score: {score}/100 points</p>
              </div>
            </div>
            <button
              onClick={initializeGame}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
