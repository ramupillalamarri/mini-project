import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Cpu, ShieldAlert, Award, AlertCircle, Info, Hand, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const processColors = [
  'linear-gradient(135deg, #f87171, #ef4444)', // Red
  'linear-gradient(135deg, #60a5fa, #3b82f6)', // Blue
  'linear-gradient(135deg, #34d399, #10b981)', // Green
  'linear-gradient(135deg, #fbbf24, #f59e0b)', // Yellow
  'linear-gradient(135deg, #a78bfa, #8b5cf6)', // Purple
  'linear-gradient(135deg, #ec4899, #d946ef)', // Pink
  'linear-gradient(135deg, #2dd4bf, #14b8a6)'  // Teal
];

const TOTAL_PROCESSES = 15;

const generateProcesses = () => {
  const newProcesses = [];
  for (let i = 0; i < TOTAL_PROCESSES; i++) {
    const burstTime = Math.floor(Math.random() * 6) + 3;
    newProcesses.push({
      id: i + 1,
      burstTime: burstTime,
      remainingTime: burstTime,
      arrivalTime: i * 2, // stagger arrivals
      position: -20, // start off-screen
      spawned: false,
      color: processColors[i % processColors.length],
      status: 'waiting' // waiting, executing, completed, missed
    });
  }
  return newProcesses;
};

const SchedulerTowerDefense = ({ onGameComplete, algorithm = 'FCFS', highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, paused, completed, failed
  const [stability, setStability] = useState(100);
  const [score, setScore] = useState(0);
  const [processes, setProcesses] = useState(() => generateProcesses());
  const [cpuProcess, setCpuProcess] = useState(null);
  const [time, setTime] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const timeQuantum = algorithm === 'RR' ? 3 : null;
  const conveyorSpeed = 0.15; // smooth speed

  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  
  const stateRef = useRef({ processes, cpuProcess, stability, score, gameState, time });

  useEffect(() => {
    stateRef.current = { processes, cpuProcess, stability, score, gameState, time };
  }, [processes, cpuProcess, stability, score, gameState, time]);

  const showFeedback = (message, type) => {
    setFeedback({ message, type, id: Date.now() });
    setTimeout(() => setFeedback(null), 1500);
  };

  const executeProcess = (process) => {
    setCpuProcess({ ...process, executionSlice: timeQuantum ? timeQuantum : process.remainingTime });
    setProcesses(prev =>
      prev.map(p =>
        p.id === process.id ? { ...p, status: 'executing' } : p
      )
    );
  };

  const handleProcessSelect = (process) => {
    const { cpuProcess, processes } = stateRef.current;

    if (cpuProcess) {
      showFeedback('CPU is currently busy!', 'error');
      return;
    }

    if (algorithm === 'FCFS') {
      const waitingProcesses = processes.filter(p => p.status === 'waiting' && p.spawned);
      if (waitingProcesses.length === 0) return;
      const earliestArrival = Math.min(...waitingProcesses.map(p => p.arrivalTime));
      if (process.arrivalTime > earliestArrival) {
        showFeedback('Wrong! FCFS requires the oldest process.', 'error');
        return;
      }
    } else if (algorithm === 'SJF') {
      const waitingProcesses = processes.filter(p => p.status === 'waiting' && p.spawned);
      if (waitingProcesses.length === 0) return;
      const shortestBurst = Math.min(...waitingProcesses.map(p => p.remainingTime));
      if (process.remainingTime > shortestBurst) {
        showFeedback('Wrong! SJF requires the shortest remaining time.', 'error');
        return;
      }
    }

    showFeedback('Good job!', 'success');
    executeProcess(process);
  };

  // Game Loop
  useEffect(() => {
    const loop = (currentTime) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const state = stateRef.current;

      if (state.gameState !== 'playing') {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      const newTime = state.time + deltaTime;
      setTime(newTime);

      let processesUpdated = false;
      let newProcesses = [...state.processes];

      // Spawn and move
      newProcesses = newProcesses.map(process => {
        if (process.status === 'waiting') {
          if (!process.spawned && newTime >= process.arrivalTime) {
            processesUpdated = true;
            return { ...process, spawned: true, position: 0 };
          }
          if (process.spawned) {
            const newPosition = process.position + (conveyorSpeed * deltaTime * 100);
            if (newPosition >= 88) { // Hit Deadline
              setStability(prev => {
                const n = Math.max(0, prev - 15);
                if (n <= 0) setGameState('failed');
                return n;
              });
              processesUpdated = true;
              return { ...process, status: 'missed' };
            }
            if (newPosition !== process.position) processesUpdated = true;
            return { ...process, position: newPosition };
          }
        }
        return process;
      });

      // Execute CPU
      if (state.cpuProcess) {
        const cpuP = { ...state.cpuProcess };
        const decrement = deltaTime * 2;
        cpuP.remainingTime -= decrement;
        cpuP.executionSlice -= decrement;

        if (cpuP.remainingTime <= 0) {
          setScore(prev => prev + 20 + Math.floor(state.stability / 10));
          newProcesses = newProcesses.map(p => p.id === cpuP.id ? { ...p, status: 'completed' } : p);
          setCpuProcess(null);
          processesUpdated = true;
        } else if (timeQuantum && cpuP.executionSlice <= 0) {
          newProcesses = newProcesses.map(p => 
            p.id === cpuP.id ? { ...p, status: 'waiting', remainingTime: cpuP.remainingTime, position: 0 } : p
          );
          setCpuProcess(null);
          processesUpdated = true;
        } else {
          setCpuProcess(cpuP);
        }
      }

      if (processesUpdated) {
        setProcesses(newProcesses);
      }

      // Check win condition
      const activeOrPending = newProcesses.filter(p => p.status === 'waiting' || p.status === 'executing' || !p.spawned);
      if (activeOrPending.length === 0 && !state.cpuProcess) {
        setGameState('completed');
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [timeQuantum, algorithm]);

  const handleDragStart = (e, process) => {
    e.dataTransfer.setData('processId', process.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const processId = parseInt(e.dataTransfer.getData('processId'));
    const process = processes.find(p => p.id === processId);
    if (process) {
      handleProcessSelect(process);
    }
  };

  const resetGame = () => {
    setStability(100);
    setScore(0);
    setGameState('playing');
    setProcesses(generateProcesses());
    setCpuProcess(null);
    setTime(0);
    setFeedback(null);
    lastTimeRef.current = performance.now();
  };

  const startGame = () => {
    resetGame();
  };

  return (
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Cpu size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-200">
              {algorithm} Scheduler
            </h2>
            <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-wider">
              System Operations Mode {timeQuantum && `| Quantum: ${timeQuantum}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stability</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldAlert size={18} className={stability > 50 ? 'text-emerald-400' : 'text-rose-500'} />
              <span className={`text-2xl font-black ${stability > 50 ? 'text-emerald-450' : 'text-rose-500'}`}>
                {Math.ceil(stability)}%
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Award size={18} className="text-violet-400" />
              <span className="text-2xl font-black text-violet-400">{score}</span>
            </div>
            {highScore > 0 && (
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">High Score: {Math.max(highScore, score)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
             <button
              onClick={() => setGameState(prev => prev === 'playing' ? 'paused' : 'playing')}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 rounded-xl transition-all"
              disabled={gameState === 'start' || gameState === 'completed' || gameState === 'failed'}
            >
              {gameState === 'playing' ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={resetGame}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 rounded-xl transition-all"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => onGameComplete(score)}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-rose-950/20 hover:text-rose-450 text-slate-400 rounded-xl transition-all"
              title="Exit Game"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="flex-1 p-6 flex flex-col relative overflow-hidden bg-slate-950/20">
        
        {/* Dynamic Feedback Popups */}
        {feedback && (
          <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full font-black text-sm shadow-xl z-50 animate-bounce flex items-center gap-2 border ${feedback.type === 'error' ? 'bg-rose-950/80 text-rose-400 border-rose-500/20 shadow-rose-500/10' : 'bg-emerald-950/80 text-emerald-450 border-emerald-500/20 shadow-emerald-500/10'}`}>
            {feedback.type === 'error' ? <AlertCircle size={18}/> : <Award size={18}/>}
            {feedback.message}
          </div>
        )}

        {/* Instructions Banner */}
        <div className="flex justify-center mb-6">
           <div className="bg-slate-900/60 border border-indigo-500/15 shadow-lg rounded-full px-6 py-2 flex items-center gap-3">
              <Info size={16} className="text-indigo-400" />
              <p className="text-xs sm:text-sm font-bold text-slate-300">
                {algorithm === 'FCFS' && "Click/Drag processes in Arrival Order (oldest first)."}
                {algorithm === 'SJF' && "Click/Drag the process with the Shortest Remaining Time."}
                {algorithm === 'RR' && `Click/Drag any process. It runs for a max of ${timeQuantum}s.`}
              </p>
           </div>
        </div>

        {/* Conveyor System */}
        <div className="relative h-44 bg-slate-950 rounded-2xl shadow-inner border-y border-indigo-500/10 mx-4 flex items-center overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, #fff 20px, #fff 40px)'}}></div>

          {/* Deadline Zone */}
          <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-32 bg-gradient-to-l from-rose-500/10 to-transparent border-l border-rose-500/20 flex flex-col items-center justify-center">
             <AlertCircle className="text-rose-500 mb-2 animate-pulse" size={24} />
             <span className="text-[9px] font-black text-rose-450 uppercase tracking-widest text-center">Deadline<br/>Zone</span>
          </div>

          {/* Render Processes */}
          {processes.map(p => {
            if (!p.spawned || p.status !== 'waiting') return null;
            return (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, p)}
                onClick={() => handleProcessSelect(p)}
                className="absolute top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing hover:-translate-y-2/3 transition-transform shadow-lg rounded-xl overflow-hidden border border-white/10 w-12 sm:w-16 md:w-20"
                style={{
                  left: `${p.position}%`,
                  background: p.color,
                  zIndex: Math.floor(p.position)
                }}
              >
                {/* Process Header */}
                <div className="px-1 py-1 bg-black/30 text-center border-b border-white/10 flex flex-col">
                  <span className="text-white font-black text-xs">P{p.id}</span>
                  {algorithm === 'FCFS' && <span className="text-white/80 font-bold text-[8px] sm:text-[9px]">AT: {p.arrivalTime}</span>}
                </div>
                {/* Process Body */}
                <div className="py-2 text-center text-white font-black text-lg sm:text-2xl">
                  {Math.ceil(p.remainingTime)}
                </div>
              </div>
            );
          })}
        </div>

        {/* CPU Target Arena */}
        <div className="mt-8 flex justify-center pb-6">
          <div 
            className={`w-64 sm:w-72 h-48 sm:h-52 bg-slate-900/60 rounded-3xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${cpuProcess ? 'border-2 border-indigo-500 scale-105' : 'border-2 border-slate-800 border-dashed hover:border-indigo-500/40'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* CPU Badge */}
            <div className="absolute top-4 left-0 right-0 flex justify-center">
              <span className="bg-slate-950 text-slate-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-800">
                <Cpu size={14} className="text-indigo-400" /> CPU Core
              </span>
            </div>

            {cpuProcess ? (
              <div className="mt-8 flex flex-col items-center w-full px-6">
                 <div 
                   className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-xl border border-white/20 flex items-center justify-center animate-pulse"
                   style={{ background: cpuProcess.color }}
                 >
                   <span className="text-white font-black text-2xl sm:text-3xl">P{cpuProcess.id}</span>
                 </div>
                 
                 {/* Progress Bar */}
                 <div className="mt-4 w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-100" 
                      style={{ width: `${(cpuProcess.remainingTime / cpuProcess.burstTime) * 100}%` }}
                    ></div>
                 </div>
                 <span className="text-[10px] font-black text-slate-500 mt-2 uppercase tracking-wider">{cpuProcess.remainingTime.toFixed(1)}s remaining</span>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center text-slate-500 animate-pulse">
                <Hand size={40} className="mb-3 opacity-40" />
                <span className="text-xs font-black uppercase tracking-widest">Click or Drop Here</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Start Game Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-905 border border-indigo-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-350 hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
              <Cpu size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">{algorithm} Scheduler</h2>
            <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
              Act as the OS Scheduler. Process CPU threads before they hit the deadline limit!
            </p>
            
            <div className="bg-slate-950 border border-indigo-950 rounded-2xl p-6 mb-8 text-left text-xs leading-relaxed text-slate-300">
               <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <ShieldAlert size={16}/> Rules for {algorithm}
               </h3>
               <ul className="space-y-3 font-medium">
                 {algorithm === 'FCFS' && (
                   <li>• Always pick the process with the <b>smallest AT (Arrival Time)</b>.</li>
                 )}
                 {algorithm === 'SJF' && (
                   <li>• Always pick the process with the <b>smallest number</b> (Burst Time).</li>
                 )}
                 {algorithm === 'RR' && (
                   <>
                     <li>• You can pick <b>any</b> waiting process.</li>
                     <li>• Processes run for a max of <b>{timeQuantum} seconds</b> before being preempted.</li>
                   </>
                 )}
                 <li>• <span className="text-rose-450 font-bold">Penalty:</span> Missing a deadline costs 15% stability!</li>
               </ul>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-lg flex items-center justify-center"
            >
              Start Scheduling
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlays */}
      {(gameState === 'completed' || gameState === 'failed') && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            {gameState === 'completed' ? (
              <>
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-450 animate-bounce">
                  <Award size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-100 mb-2">System Optimal!</h2>
                <p className="text-slate-400 mb-8 font-medium text-sm">All processes executed successfully.</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-450">
                  <ShieldAlert size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-100 mb-2">System Crash!</h2>
                <p className="text-slate-400 mb-8 font-medium text-sm">Stability reached 0%. Too many missed deadlines.</p>
              </>
            )}
            
            <div className="bg-slate-950 border border-indigo-950 rounded-xl p-6 mb-8">
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Final Score</div>
               <div className="text-5xl font-black text-indigo-400">{score}</div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={resetGame}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl transition-all border border-slate-750"
              >
                Retry
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
    </div>
  );
};

export default SchedulerTowerDefense;