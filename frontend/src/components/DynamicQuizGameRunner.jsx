import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Play, Pause, RotateCcw, X, Trophy, ArrowRight, HelpCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function DynamicQuizGameRunner({ game, onGameComplete, highScore = 0 }) {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await axios.post('/api/games/generate-questions', {
          title: game.title,
          instructions: game.instructions,
          description: game.description
        });
        setQuestions(response.data);
      } catch (err) {
        console.error('Failed to load dynamic questions:', err);
        setError(true);
        showToast('Failed to generate game questions. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [game, showToast]);

  const handleOptionClick = (optionIndex) => {
    if (selectedOption !== null || isPaused) return;
    
    setSelectedOption(optionIndex);
    const currentQuestion = questions[currentIndex];
    
    if (optionIndex === currentQuestion.answer) {
      setScore(prev => prev + 20); // 20 points per correct answer (total 100)
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsFinished(false);
    setIsPaused(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        <p className="text-sm font-semibold text-gray-500 animate-pulse">AI is compiling challenge modules...</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to Load Game</h3>
        <p className="text-sm text-gray-500 mb-6">The AI service returned an error. Please try restarting or checking your connection.</p>
        <button 
          onClick={() => onGameComplete(0)} 
          className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all"
        >
          Exit Game
        </button>
      </div>
    );
  }

  const activeQuestion = questions[currentIndex];

  return (
    <div className="relative bg-white outline outline-1 outline-gray-200 rounded-3xl shadow-xl overflow-hidden max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{game.title}</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Interactive AI Challenge Mode</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 bg-brand-50 text-brand-600 font-bold rounded-lg text-xs">
            Score: {score}
          </div>
          <button 
            onClick={() => setIsPaused(!isPaused)} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Pause"
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button 
            onClick={handleRestart} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Restart"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={() => onGameComplete(score)} 
            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Exit"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-8 min-h-[350px] flex flex-col justify-between">
        {!isFinished ? (
          <>
            {/* Question Progress bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-gray-400 mb-2">
                <span>STAGE {currentIndex + 1} OF {questions.length}</span>
                <span>High Score: {highScore}</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-6">
                <div 
                  className="bg-brand-600 h-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <h3 className="text-lg font-bold text-gray-900 leading-snug mb-6">
                {activeQuestion.question}
              </h3>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeQuestion.options.map((option, idx) => {
                  let btnStyle = "border-gray-200 hover:border-brand-500 hover:bg-brand-50/10";
                  let icon = <HelpCircle size={18} className="text-gray-400 group-hover:text-brand-500 transition-colors" />;

                  if (selectedOption !== null) {
                    if (idx === activeQuestion.answer) {
                      btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
                      icon = <CheckCircle2 size={18} className="text-emerald-600" />;
                    } else if (idx === selectedOption) {
                      btnStyle = "border-rose-500 bg-rose-50 text-rose-900";
                      icon = <AlertCircle size={18} className="text-rose-600" />;
                    } else {
                      btnStyle = "opacity-50 border-gray-100";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={selectedOption !== null || isPaused}
                      onClick={() => handleOptionClick(idx)}
                      className={`group flex items-center justify-between p-4 border-2 rounded-2xl text-left font-semibold text-sm transition-all duration-200 ${btnStyle}`}
                    >
                      <span className="flex-1 pr-3">{option}</span>
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next / Actions */}
            <div className="mt-8 flex justify-end">
              {selectedOption !== null && (
                <button
                  onClick={handleNext}
                  className="flex items-center px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-brand-600/10"
                >
                  {currentIndex === questions.length - 1 ? 'Finish Challenge' : 'Next Stage'}
                  <ArrowRight size={16} className="ml-2" />
                </button>
              )}
            </div>
          </>
        ) : (
          /* Finished State */
          <div className="flex flex-col items-center justify-center text-center py-6">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Trophy size={44} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Challenge Complete!</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm">
              You completed the AI interactive challenge for **{game.title}**!
            </p>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-6">
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Your Score</span>
                <span className="text-2xl font-black text-brand-600">{score} / 100</span>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Correct Answers</span>
                <span className="text-2xl font-black text-gray-800">{score / 20} / 5</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3 w-full max-w-xs">
              <button
                onClick={handleRestart}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => onGameComplete(score)}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-brand-600/10"
              >
                Save & Exit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && (
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
            <h3 className="text-2xl font-black text-white mb-2">Game Paused</h3>
            <p className="text-sm text-white/80 mb-6 max-w-xs">Take a breath, review the stages, and resume when ready!</p>
            <button
              onClick={() => setIsPaused(false)}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-brand-600/10 flex items-center gap-2"
            >
              <Play size={16} />
              Resume Game
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
