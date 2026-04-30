import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Cpu, ShieldAlert, Award, AlertCircle, Info, Hand, X } from 'lucide-react';

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

const SchedulerTowerDefense = ({ onGameComplete, algorithm = 'FCFS', highScore = 0 }) => {
  const [gameState, setGameState] = useState('start'); // start, playing, paused, completed, failed
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
        const decrement = deltaTime * 2; // Process faster than real time for better pacing
        cpuP.remainingTime -= decrement;
        cpuP.executionSlice -= decrement;

        if (cpuP.remainingTime <= 0) {
          // Finished
          setScore(prev => prev + 20 + Math.floor(state.stability / 10));
          newProcesses = newProcesses.map(p => p.id === cpuP.id ? { ...p, status: 'completed' } : p);
          setCpuProcess(null);
          processesUpdated = true;
        } else if (timeQuantum && cpuP.executionSlice <= 0) {
          // Time Quantum Expired (RR)
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
    <div className="relative flex flex-col bg-slate-50 min-h-[600px] rounded-3xl shadow-xl border border-slate-200 overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 text-brand-600 rounded-xl">
            <Cpu size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {algorithm} Scheduler
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              System Operations Mode {timeQuantum && `| Quantum: ${timeQuantum}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stability</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldAlert size={18} className={stability > 50 ? 'text-emerald-500' : 'text-rose-500'} />
              <span className={`text-2xl font-black ${stability > 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Math.ceil(stability)}%
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Award size={18} className="text-violet-500" />
              <span className="text-2xl font-black text-violet-600">{score}</span>
            </div>
            {highScore > 0 && (
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">High Score: {Math.max(highScore, score)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 border-l-2 border-slate-100 pl-6">
             <button
              onClick={() => setGameState(prev => prev === 'playing' ? 'paused' : 'playing')}
              className="p-3 bg-white border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 text-slate-700 rounded-xl shadow-sm transition-all"
              disabled={gameState === 'start' || gameState === 'completed' || gameState === 'failed'}
            >
              {gameState === 'playing' ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={resetGame}
              className="p-3 bg-white border border-slate-200 hover:bg-slate-50 hover:scale-105 active:scale-95 text-slate-700 rounded-xl shadow-sm transition-all"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => onGameComplete(score)}
              className="p-3 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 hover:scale-105 active:scale-95 text-slate-700 rounded-xl shadow-sm transition-all"
              title="Exit Game"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="flex-1 p-8 flex flex-col relative overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">
        
        {/* Dynamic Feedback Popups */}
        {feedback && (
          <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full font-black text-sm shadow-xl z-50 animate-bounce flex items-center gap-2 border-2 ${feedback.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-rose-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-500/20'}`}>
            {feedback.type === 'error' ? <AlertCircle size={18}/> : <Award size={18}/>}
            {feedback.message}
          </div>
        )}

        {/* Instructions Banner */}
        <div className="flex justify-center mb-8">
           <div className="bg-white/80 backdrop-blur border border-slate-200 shadow-sm rounded-full px-6 py-2 flex items-center gap-3">
              <Info size={16} className="text-brand-500" />
              <p className="text-sm font-bold text-slate-600">
                {algorithm === 'FCFS' && "Click or Drag processes in Arrival Order (oldest first)."}
                {algorithm === 'SJF' && "Click or Drag the process with the Shortest Remaining Time."}
                {algorithm === 'RR' && `Click or Drag any process. It runs for a max of ${timeQuantum}s.`}
              </p>
           </div>
        </div>

        {/* Conveyor System */}
        <div className="relative h-44 bg-white rounded-2xl shadow-inner border-y-[6px] border-slate-300 mx-8 flex items-center overflow-hidden">
          {/* Belt texture */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, #000 20px, #000 40px)'}}></div>

          {/* Deadline Zone */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-rose-500/10 to-transparent border-l-4 border-rose-500/30 flex flex-col items-center justify-center">
             <AlertCircle className="text-rose-500 mb-2 animate-pulse" size={28} />
             <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest text-center">Deadline<br/>Zone</span>
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
                className="absolute top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing hover:-translate-y-8 transition-transform shadow-lg rounded-xl overflow-hidden border border-white/40 ring-4 ring-black/5"
                style={{
                  left: `${p.position}%`,
                  width: '72px',
                  background: p.color,
                  zIndex: Math.floor(p.position)
                }}
              >
                {/* Process Header */}
                <div className="px-2 py-1.5 bg-black/20 text-center border-b border-white/20 flex flex-col">
                  <span className="text-white font-black text-sm drop-shadow">P{p.id}</span>
                  {algorithm === 'FCFS' && <span className="text-white/80 font-bold text-[10px]">AT: {p.arrivalTime}</span>}
                </div>
                {/* Process Body */}
                <div className="py-3 text-center text-white font-black text-2xl drop-shadow-md">
                  {Math.ceil(p.remainingTime)}
                </div>
              </div>
            );
          })}
        </div>

        {/* CPU Target Arena */}
        <div className="mt-12 flex justify-center pb-8">
          <div 
            className={`w-72 h-56 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${cpuProcess ? 'border-4 border-brand-400 scale-105' : 'border-4 border-slate-200 border-dashed hover:border-brand-300'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* CPU Badge */}
            <div className="absolute top-4 left-0 right-0 flex justify-center">
              <span className="bg-slate-100 text-slate-500 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Cpu size={14} /> Main Core
              </span>
            </div>

            {cpuProcess ? (
              <div className="mt-8 flex flex-col items-center w-full px-8">
                 <div 
                   className="w-24 h-24 rounded-2xl shadow-xl border-4 border-white flex items-center justify-center animate-pulse"
                   style={{ background: cpuProcess.color }}
                 >
                   <span className="text-white font-black text-4xl drop-shadow-lg">P{cpuProcess.id}</span>
                 </div>
                 
                 {/* Progress Bar */}
                 <div className="mt-6 w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner p-0.5">
                    <div 
                      className="bg-brand-500 h-full rounded-full transition-all duration-100" 
                      style={{ width: `${(cpuProcess.remainingTime / cpuProcess.burstTime) * 100}%` }}
                    ></div>
                 </div>
                 <span className="text-xs font-black text-slate-400 mt-3 uppercase tracking-wider">{cpuProcess.remainingTime.toFixed(1)}s remaining</span>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center text-slate-400 animate-pulse">
                <Hand size={48} className="mb-4 opacity-50" />
                <span className="text-sm font-black uppercase tracking-widest">Click or Drop Here</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Start Game Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-10 max-w-lg w-full mx-4 shadow-2xl text-center transform transition-all border border-slate-100 relative">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-500">
              <Cpu size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">{algorithm} Scheduler</h2>
            <p className="text-slate-500 mb-8 font-medium">
              You are the CPU Scheduler! Prevent system failure by executing processes before they hit the deadline zone.
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-200">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <ShieldAlert size={16}/> Rules for {algorithm}
               </h3>
               <ul className="space-y-3 text-sm font-medium text-slate-600">
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
                 <li>• <span className="text-rose-500 font-bold">Penalty:</span> Missing a deadline costs 15% stability!</li>
               </ul>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-brand-600 text-white font-black text-lg rounded-2xl hover:bg-brand-700 hover:-translate-y-1 transition-all shadow-lg shadow-brand-500/30 active:translate-y-0"
            >
              Start Scheduling
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlays */}
      {(gameState === 'completed' || gameState === 'failed') && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl text-center transform transition-all border border-slate-100">
            {gameState === 'completed' ? (
              <>
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                  <Award size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">System Optimal!</h2>
                <p className="text-slate-500 mb-8 font-medium">All processes executed successfully.</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                  <ShieldAlert size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">System Crash!</h2>
                <p className="text-slate-500 mb-8 font-medium">Stability reached 0%. Too many missed deadlines.</p>
              </>
            )}
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200">
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Score</div>
               <div className="text-5xl font-black text-brand-600 drop-shadow-sm">{score}</div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={resetGame}
                className="flex-1 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => onGameComplete(score)}
                className="flex-1 py-4 bg-brand-600 text-white font-black rounded-2xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30"
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