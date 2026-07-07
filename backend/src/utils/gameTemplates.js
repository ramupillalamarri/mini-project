const getQuizGameTemplate = (componentName, title, instructions) => {
  return `import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, ArrowRight, HelpCircle, RotateCcw, Play, Pause, X } from 'lucide-react';

const QUESTIONS = [
  {
    question: "What is the primary function of the Operating System kernel?",
    options: [
      "To provide a user interface for web browsing",
      "To manage system resources and communication between hardware and software",
      "To compile high-level programming languages into machine code",
      "To design database schemas for data storage"
    ],
    answer: 1,
    explanation: "The kernel is the core of the OS. It manages hardware resources (CPU, memory, devices) and acts as a bridge between applications and hardware."
  },
  {
    question: "Which scheduling algorithm can lead to starvation if short tasks keep arriving?",
    options: [
      "Starvation-free Round Robin (RR)",
      "First-Come, First-Served (FCFS)",
      "Shortest Job First (SJF)",
      "FIFO"
    ],
    answer: 2,
    explanation: "SJF (Shortest Job First) prioritizes the shortest processes. If short processes continuously arrive, long-running processes may never get scheduled, causing starvation."
  },
  {
    question: "What does the 'A' in ACID transaction properties stand for?",
    options: [
      "Availability",
      "Atomicity",
      "Authentication",
      "Agreement"
    ],
    answer: 1,
    explanation: "Atomicity ensures that all operations within a work unit are completed successfully; otherwise, the transaction is aborted and rolled back."
  },
  {
    question: "In computer networking, what is the purpose of the ARP protocol?",
    options: [
      "To map an IP address to a physical MAC address",
      "To route packets across different subnets",
      "To encrypt network traffic between clients",
      "To assign dynamic IP addresses to devices"
    ],
    answer: 0,
    explanation: "ARP (Address Resolution Protocol) is used to find the physical hardware (MAC) address corresponding to a known IPv4 address."
  },
  {
    question: "Which data structure uses LIFO (Last-In, First-Out) ordering?",
    options: [
      "Queue",
      "Heap",
      "Stack",
      "Binary Search Tree"
    ],
    answer: 2,
    explanation: "A Stack is a LIFO data structure. The last item pushed onto the stack is the first one to be popped off."
  }
];

export default function ${componentName}({ onGameComplete }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const activeQuestion = QUESTIONS[currentIdx];

  const handleOptionClick = (index) => {
    if (isAnswered || isPaused) return;
    setSelectedOpt(index);
  };

  const handleAnswerSubmit = () => {
    if (selectedOpt === null || isAnswered || isPaused) return;
    
    setIsAnswered(true);
    if (selectedOpt === activeQuestion.answer) {
      setScore(prev => prev + 20);
    }
  };

  const handleNext = () => {
    setSelectedOpt(null);
    setIsAnswered(false);
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setCompleted(true);
      if (onGameComplete) {
        onGameComplete(score + (selectedOpt === activeQuestion.answer ? 20 : 0));
      }
    }
  };

  const restartGame = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsAnswered(false);
    setScore(0);
    setCompleted(false);
    setIsPaused(false);
  };

  return (
    <div className="min-h-[500px] w-full max-w-3xl mx-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-500/20 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-indigo-200">${title}</h2>
          <p className="text-xs text-indigo-400/80 mt-1">Quiz Challenge</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-sm font-semibold text-indigo-300">
            Score: {score}
          </div>
          
          <div className="flex items-center gap-2 border-l border-indigo-500/20 pl-4">
            <button
              onClick={() => setIsPaused(p => !p)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
              title={isPaused ? "Resume Game" : "Pause Game"}
              disabled={completed}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={restartGame}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
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
        <div className="flex-1 flex flex-col justify-between space-y-6">
          {/* Question Text */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Question {currentIdx + 1} of {QUESTIONS.length}
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 flex items-start gap-2">
              <HelpCircle className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
              {activeQuestion.question}
            </h3>
          </div>

          {/* Options List */}
          <div className="grid grid-cols-1 gap-3 my-4">
            {activeQuestion.options.map((option, idx) => {
              let optStyle = "border-slate-800 bg-slate-900/60 hover:bg-indigo-950/40 hover:border-indigo-500/50";
              
              if (isAnswered) {
                if (idx === activeQuestion.answer) {
                  optStyle = "border-emerald-500 bg-emerald-950/30 text-emerald-200";
                } else if (idx === selectedOpt) {
                  optStyle = "border-rose-500 bg-rose-950/30 text-rose-200";
                } else {
                  optStyle = "border-slate-800 bg-slate-900/30 text-slate-500";
                }
              } else if (selectedOpt === idx) {
                optStyle = "border-indigo-500 bg-indigo-950/50 ring-2 ring-indigo-500/30 text-indigo-200";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(idx)}
                  disabled={isAnswered || isPaused}
                  className={\`w-full text-left p-4 rounded-xl border transition-all duration-200 font-medium flex items-center justify-between group \${optStyle}\`}
                >
                  <span>{option}</span>
                  {isAnswered && idx === activeQuestion.answer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && idx === selectedOpt && idx !== activeQuestion.answer && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Area (Explanation or Submit Button) */}
          <div className="border-t border-indigo-500/10 pt-4 mt-auto">
            {isAnswered ? (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-sm text-indigo-200/90 leading-relaxed">
                  <span className="font-bold text-indigo-400 block mb-1">Explanation:</span>
                  {activeQuestion.explanation}
                </div>
                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:translate-x-0.5 active:translate-x-0"
                >
                  {currentIdx === QUESTIONS.length - 1 ? 'Finish Game' : 'Next Question'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAnswerSubmit}
                disabled={selectedOpt === null || isPaused}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent font-semibold rounded-xl text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:shadow-none transition-all duration-200"
              >
                Submit Answer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-450 shadow-xl">
            <Award className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-100">Congratulations!</h3>
            <p className="text-slate-400 max-w-sm">
              You completed the quiz with a final score of <span className="text-indigo-455 font-bold">{score}</span> points.
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
`;
};

const getMemoryGameTemplate = (componentName, title, instructions) => {
  return `import React, { useState, useEffect } from 'react';
import { Award, RotateCcw, Play, Pause, X } from 'lucide-react';

const CARDS_DATA = [
  { id: 1, name: 'IP Address', category: 'Networking' },
  { id: 2, name: 'MAC Address', category: 'Networking' },
  { id: 3, name: 'TCP', category: 'Protocol' },
  { id: 4, name: 'UDP', category: 'Protocol' },
  { id: 5, name: 'CPU', category: 'Hardware' },
  { id: 6, name: 'RAM', category: 'Hardware' },
  { id: 7, name: 'Kernel', category: 'OS' },
  { id: 8, name: 'Process', category: 'OS' }
];

export default function ${componentName}({ onGameComplete }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const initializeGame = () => {
    const doubleCards = [...CARDS_DATA, ...CARDS_DATA].map((card, idx) => ({
      ...card,
      uniqueId: idx
    }));
    
    const shuffled = doubleCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setCompleted(false);
    setIsPaused(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const handleCardClick = (uniqueId) => {
    if (isPaused || flipped.length === 2 || matched.includes(uniqueId) || flipped.includes(uniqueId)) return;

    const newFlipped = [...flipped, uniqueId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      
      const firstCard = cards.find(c => c.uniqueId === newFlipped[0]);
      const secondCard = cards.find(c => c.uniqueId === newFlipped[1]);

      if (firstCard.id === secondCard.id) {
        setMatched(prev => {
          const updated = [...prev, newFlipped[0], newFlipped[1]];
          if (updated.length === cards.length) {
            setCompleted(true);
            const score = Math.max(10, 100 - moves * 3);
            if (onGameComplete) onGameComplete(score);
          }
          return updated;
        });
        setFlipped([]);
      } else {
        setTimeout(() => {
          setFlipped([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-[500px] w-full max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-2xl border border-indigo-500/20 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Decorative Blur */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-indigo-200">${title}</h2>
          <p className="text-xs text-indigo-400/80 mt-1">Memory Match Game</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-sm font-semibold text-indigo-300">
            Moves: {moves}
          </div>
          
          <div className="flex items-center gap-2 border-l border-indigo-500/20 pl-4">
            <button
              onClick={() => setIsPaused(p => !p)}
              className="p-2 bg-slate-800 hover:bg-slate-770 text-slate-300 rounded-lg transition-all"
              title={isPaused ? "Resume Game" : "Pause Game"}
              disabled={completed}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={initializeGame}
              className="p-2 bg-slate-800 hover:bg-slate-770 text-slate-300 rounded-lg transition-all"
              title="Restart Game"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => onGameComplete && onGameComplete(Math.max(10, 100 - moves * 3))}
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
        <div className="grid grid-cols-4 gap-3 md:gap-4 my-auto">
          {cards.map((card) => {
            const isFlipped = flipped.includes(card.uniqueId) || matched.includes(card.uniqueId);
            const isMatched = matched.includes(card.uniqueId);

            return (
              <button
                key={card.uniqueId}
                onClick={() => handleCardClick(card.uniqueId)}
                disabled={isPaused}
                className={\`aspect-square md:h-28 flex flex-col items-center justify-center rounded-xl font-semibold border transition-all duration-300 transform outline-none select-none \${
                  isFlipped 
                    ? isMatched 
                      ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300 scale-95 cursor-default'
                      : 'bg-indigo-950/50 border-indigo-500/60 text-indigo-100 rotate-y-180 shadow-md'
                    : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 hover:shadow-indigo-500/5 shadow hover:-translate-y-0.5'
                }\`}
              >
                {isFlipped ? (
                  <div className="text-center p-2">
                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">{card.category}</p>
                    <p className="text-sm md:text-base leading-tight">{card.name}</p>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-black">
                    ?
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-450 shadow-xl">
            <Award className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-100">Victory!</h3>
            <p className="text-slate-400 max-w-sm">
              All memory pairs matched successfully in <span className="text-indigo-400 font-bold">{moves}</span> moves.
            </p>
          </div>
          <button
            onClick={initializeGame}
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
`;
};

const getSortingGameTemplate = (componentName, title, instructions) => {
  return `import React, { useState, useEffect } from 'react';
import { Award, ArrowUp, ArrowDown, Check, HelpCircle, RotateCcw, Play, Pause, X } from 'lucide-react';

const INITIAL_ITEMS = [
  { id: '1', name: 'Physical Layer', rank: 1, desc: 'Transmits raw bit streams over a physical medium.' },
  { id: '2', name: 'Data Link Layer', rank: 2, desc: 'Provides node-to-node data transfer and error correction.' },
  { id: '3', name: 'Network Layer', rank: 3, desc: 'Handles packet routing, forwarding and logical addressing.' },
  { id: '4', name: 'Transport Layer', rank: 4, desc: 'Manages end-to-end communication, reliability, and flow control.' },
  { id: '5', name: 'Session Layer', rank: 5, desc: 'Establishes, manages, and terminates sessions between applications.' },
  { id: '6', name: 'Presentation Layer', rank: 6, desc: 'Translates, encrypts, and compresses data for application use.' },
  { id: '7', name: 'Application Layer', rank: 7, desc: 'Provides network services directly to end-user applications.' }
];

export default function ${componentName}({ onGameComplete }) {
  const [items, setItems] = useState([]);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const initializeGame = () => {
    const shuffled = [...INITIAL_ITEMS].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setChecked(false);
    setScore(0);
    setCompleted(false);
    setIsPaused(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const moveItem = (index, direction) => {
    if (checked || isPaused) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setItems(updated);
  };

  const handleCheck = () => {
    if (isPaused) return;
    setChecked(true);
    let correctCount = 0;
    
    items.forEach((item, idx) => {
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
      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4 mb-6 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-indigo-200">${title}</h2>
          <p className="text-xs text-indigo-400/80 mt-1">Sorting Challenge</p>
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
              disabled={completed}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={initializeGame}
              className="p-2 bg-slate-800 hover:bg-slate-770 text-slate-300 rounded-lg transition-all"
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
                className={\`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 \${borderStyle}\`}
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
                      disabled={idx === 0 || isPaused}
                      className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
                    >
                      <ArrowUp className="w-4 h-4 text-indigo-400" />
                    </button>
                    <button
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === items.length - 1 || isPaused}
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
            disabled={isPaused}
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
              <RotateCcw className="w-3.5 h-3.5" />
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
`;
};

module.exports = {
  getQuizGameTemplate,
  getMemoryGameTemplate,
  getSortingGameTemplate
};
