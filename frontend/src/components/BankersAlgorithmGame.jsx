import { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertTriangle, CheckCircle, XCircle, Activity, Award, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BankersAlgorithmGame = ({ onGameComplete, highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, paused, gameover
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  
  const initialResources = [10, 5, 7];
  const [available, setAvailable] = useState([...initialResources]);
  const [allocation, setAllocation] = useState([
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2]
  ]);
  const [maxNeed, setMaxNeed] = useState([
    [3, 2, 2],
    [3, 2, 2],
    [4, 0, 2]
  ]);

  const [currentRequest, setCurrentRequest] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [safeSequence, setSafeSequence] = useState([]);
  
  const timerRef = useRef(null);

  const getNeedMatrix = () => {
    return maxNeed.map((row, i) => row.map((maxVal, j) => maxVal - allocation[i][j]));
  };

  const generateRequest = () => {
    const need = getNeedMatrix();
    const unfinished = need.map((n, i) => ({ n, i })).filter(x => x.n.some(val => val > 0));
    
    if (unfinished.length === 0) {
      handleLevelComplete();
      return;
    }

    const pIndex = unfinished[Math.floor(Math.random() * unfinished.length)].i;
    const req = need[pIndex].map(n => Math.floor(Math.random() * (n + 1)));
    
    if (req.every(v => v === 0)) {
      const idx = req.findIndex((v, j) => need[pIndex][j] > 0);
      if (idx !== -1) req[idx] = 1;
    }

    if (Math.random() < 0.2) {
      const j = Math.floor(Math.random() * req.length);
      req[j] += available[j] + 1;
    }

    setCurrentRequest({ process: pIndex, request: req });
    setTimeLeft(15 - Math.min(10, level));
  };

  const handleLevelComplete = () => {
    setScore(s => s + 100);
    showFeedback('Level Clear! Processes finished.', false);
    setLevel(l => l + 1);
    
    setAllocation([
      [0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1]
    ]);
    setMaxNeed([
      [7, 5, 3], [3, 2, 2], [9, 0, 2], [4, 2, 2]
    ]);
    setAvailable([3, 3, 2]);
    setTimeout(generateRequest, 2000);
  };

  const initGame = () => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setAllocation([ [0, 1, 0], [2, 0, 0], [3, 0, 2] ]);
    setMaxNeed([ [3, 2, 2], [3, 2, 2], [4, 0, 2] ]);
    setAvailable([3, 3, 2]);
    setFeedback(null);
    setSafeSequence([]);
    setTimeout(generateRequest, 1000);
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameState === 'playing' && currentRequest) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleTimeOut();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentRequest]);

  const handleTimeOut = () => {
    showFeedback('Timeout! Penalty applied.', true);
    setScore(s => Math.max(0, s - 20));
    generateRequest();
  };

  const showFeedback = (msg, isError) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 2000);
  };

  const isSafeState = (alloc, avail, need) => {
    let work = [...avail];
    let finish = new Array(alloc.length).fill(false);
    let seq = [];
    
    let count = 0;
    while (count < alloc.length) {
      let found = false;
      for (let p = 0; p < alloc.length; p++) {
        if (!finish[p]) {
          let canFinish = true;
          for (let j = 0; j < work.length; j++) {
            if (need[p][j] > work[j]) {
              canFinish = false;
              break;
            }
          }
          if (canFinish) {
            for (let j = 0; j < work.length; j++) {
              work[j] += alloc[p][j];
            }
            seq.push(`P${p}`);
            finish[p] = true;
            found = true;
            count++;
          }
        }
      }
      if (!found) break;
    }
    return { safe: count === alloc.length, seq };
  };

  const processDecision = (grant) => {
    const { process, request } = currentRequest;
    const need = getNeedMatrix();
    
    let isValid = true;
    for (let j = 0; j < request.length; j++) {
      if (request[j] > need[process][j]) isValid = false;
    }

    if (!isValid && grant) {
      triggerGameOver("Invalid Request! Process requested more than its maximum need.");
      return;
    }
    
    if (grant) {
      let canAfford = true;
      for (let j = 0; j < request.length; j++) {
        if (request[j] > available[j]) canAfford = false;
      }
      
      if (!canAfford) {
         triggerGameOver("Resource Overflow! Request exceeds currently available resources.");
         return;
      }

      let tempAlloc = allocation.map(row => [...row]);
      let tempAvail = [...available];
      let tempNeed = need.map(row => [...row]);

      for (let j = 0; j < request.length; j++) {
        tempAlloc[process][j] += request[j];
        tempAvail[j] -= request[j];
        tempNeed[process][j] -= request[j];
      }

      const { safe, seq } = isSafeState(tempAlloc, tempAvail, tempNeed);

      if (safe) {
        setAllocation(tempAlloc);
        setAvailable(tempAvail);
        setSafeSequence(seq);
        setScore(s => s + 30 + timeLeft);
        showFeedback('Safe Allocation! +30', false);
        
        if (tempNeed[process].every(v => v === 0)) {
           for(let j=0; j<tempAvail.length; j++){
             tempAvail[j] += tempAlloc[process][j];
             tempAlloc[process][j] = 0;
           }
           setAvailable([...tempAvail]);
           setAllocation([...tempAlloc]);
           showFeedback(`P${process} Completed & Released Resources!`, false);
        }
        
      } else {
        triggerGameOver("Deadlock Occurred! You approved an unsafe request.");
      }
    } else {
      let tempAlloc = allocation.map(row => [...row]);
      let tempAvail = [...available];
      let tempNeed = need.map(row => [...row]);
      
      let safeToGrant = true;
      for (let j = 0; j < request.length; j++) {
        if (request[j] > tempAvail[j]) safeToGrant = false;
        tempAlloc[process][j] += request[j];
        tempAvail[j] -= request[j];
        tempNeed[process][j] -= request[j];
      }
      
      if (safeToGrant) {
         const { safe } = isSafeState(tempAlloc, tempAvail, tempNeed);
         safeToGrant = safe;
      }

      if (safeToGrant && isValid) {
         setScore(s => Math.max(0, s - 10));
         showFeedback('Denied a safe request. -10', true);
      } else {
         setScore(s => s + 20);
         showFeedback('Correct! Denied unsafe request. +20', false);
      }
    }
    
    setCurrentRequest(null);
    setTimeout(generateRequest, 1000);
  };

  const triggerGameOver = (reason) => {
    setFeedback({ msg: reason, isError: true });
    setGameState('gameover');
  };

  const renderRAG = () => {
    return (
      <svg viewBox="0 0 500 200" className="w-full h-auto max-h-[200px] bg-slate-950/80 rounded-xl border border-indigo-500/10 overflow-visible">
         <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#475569" />
          </marker>
        </defs>
        
        {/* Draw Resources (Squares) */}
        {available.map((r, i) => (
          <g key={`r${i}`} transform={`translate(${100 + i * 140}, 40)`}>
            <rect x="-20" y="-20" width="40" height="40" rx="8" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="2.5" />
            <text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#a5b4fc">R{i}</text>
            <text x="0" y="32" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#64748b">Avail: {r}</text>
          </g>
        ))}
        
        {/* Draw Processes (Circles) */}
        {allocation.map((p, i) => (
          <g key={`p${i}`} transform={`translate(${60 + i * 110}, 145)`}>
            <circle cx="0" cy="0" r="19" fill="rgba(236,72,153,0.1)" stroke="#ec4899" strokeWidth="2.5" />
            <text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fbcfe8">P{i}</text>
          </g>
        ))}
        
        {/* Draw Edges (Allocation) */}
        {allocation.map((row, pIdx) => row.map((amount, rIdx) => {
           if (amount > 0) {
             const rX = 100 + rIdx * 140;
             const rY = 60;
             const pX = 60 + pIdx * 110;
             const pY = 125;
             return (
               <path key={`edge-${pIdx}-${rIdx}`} d={`M ${rX} ${rY} L ${pX} ${pY}`} stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.6" />
             );
           }
           return null;
        }))}
        
        {/* Draw Incoming Request Edge in Red if it exists */}
        {currentRequest && currentRequest.request.map((amount, rIdx) => {
          if (amount > 0) {
             const pX = 60 + currentRequest.process * 110;
             const pY = 125;
             const rX = 100 + rIdx * 140;
             const rY = 60;
             return (
               <path key={`req-${rIdx}`} d={`M ${pX} ${pY} L ${rX} ${rY}`} stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#arrowhead)" opacity="0.85" className="animate-pulse" />
             );
          }
          return null;
        })}
      </svg>
    );
  };

  const needMatrix = getNeedMatrix();

  return (
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/20">
            <Activity size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-pink-300">Deadlock Escape</h2>
            <p className="text-xs font-bold text-pink-450/70 uppercase tracking-wider">
              Banker's Algorithm Simulator | Level {level}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
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
              disabled={gameState === 'start' || gameState === 'gameover'}
            >
              {gameState === 'playing' ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={initGame}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-355 rounded-xl transition-all"
              title="Restart Game"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => onGameComplete(score)}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-rose-950/20 hover:text-rose-455 text-slate-400 rounded-xl transition-all"
              title="Exit Game"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
         
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="col-span-1 lg:col-span-2">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resource Allocation Graph</h3>
               {renderRAG()}
               {safeSequence.length > 0 && (
                 <div className="mt-3 text-xs font-bold text-emerald-400 bg-emerald-950/40 py-2 px-4 rounded-xl border border-emerald-500/20">
                   Safe Sequence Path: {safeSequence.join(' → ')}
                 </div>
               )}
            </div>
            <div className="col-span-1 bg-slate-900/60 rounded-xl shadow-2xl border border-indigo-500/10 p-5 flex flex-col relative overflow-hidden">
               <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                 <AlertTriangle size={16} className="text-amber-500"/> Incoming Request
               </h3>
               
               {currentRequest ? (
                 <div className="flex-1 flex flex-col">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-black text-slate-205">Process P{currentRequest.process}</div>
                      <div className="text-xs font-medium text-slate-500 mt-1">requests vector</div>
                      <div className="text-lg font-bold text-indigo-400 tracking-widest bg-slate-950 py-2.5 rounded-lg mt-3 border border-indigo-500/15">
                        [{currentRequest.request.join(', ')}]
                      </div>
                    </div>

                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mb-6 border border-slate-800 p-0.5">
                      <div className="bg-amber-400 h-full transition-all ease-linear duration-1000" style={{width: `${(timeLeft/15)*100}%`}}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <button 
                        onClick={() => processDecision(false)}
                        className="py-3 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-rose-450 font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle size={18}/> Deny
                      </button>
                      <button 
                        onClick={() => processDecision(true)}
                        className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={18}/> Grant
                      </button>
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-650 text-xs font-bold animate-pulse">
                   Generating next request...
                 </div>
               )}
            </div>
         </div>

         {/* Matrix Tables */}
         <div className="flex-1 bg-slate-900/40 rounded-xl border border-indigo-500/10 p-5 overflow-auto">
            <div className="grid grid-cols-4 gap-4 text-xs min-w-[400px]">
               
               <div>
                 <h4 className="font-bold text-slate-500 mb-2 border-b border-slate-800 pb-1.5 uppercase tracking-wider">Process</h4>
                 {allocation.map((_, i) => <div key={i} className="py-1.5 font-bold text-slate-300">P{i}</div>)}
               </div>
               
               <div>
                 <h4 className="font-bold text-slate-500 mb-2 border-b border-slate-800 pb-1.5 uppercase tracking-wider">Allocation</h4>
                 {allocation.map((row, i) => <div key={i} className="py-1.5 font-mono text-slate-400">[{row.join(', ')}]</div>)}
               </div>

               <div>
                 <h4 className="font-bold text-slate-500 mb-2 border-b border-slate-800 pb-1.5 uppercase tracking-wider">Max Need</h4>
                 {maxNeed.map((row, i) => <div key={i} className="py-1.5 font-mono text-slate-400">[{row.join(', ')}]</div>)}
               </div>

               <div>
                 <h4 className="font-bold text-slate-500 mb-2 border-b border-slate-800 pb-1.5 uppercase tracking-wider">Need (Max-Alloc)</h4>
                 {needMatrix.map((row, i) => <div key={i} className="py-1.5 font-mono font-bold text-indigo-400">[{row.join(', ')}]</div>)}
               </div>

            </div>
         </div>

      </div>

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative text-white">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-350 hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-pink-500/10 border border-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-400">
              <Activity size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Deadlock Escape</h2>
            <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
              Act as the OS Kernel Resource Manager. Prevent Deadlock states using the Banker's Algorithm safety check!
            </p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-pink-400 mt-0.5 shrink-0" />
                <p>Analyze incoming thread request vectors.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-pink-400 mt-0.5 shrink-0" />
                <p>Ensure that allocating resources leaves the system in a <b>Safe State</b> (i.e. at least one sequence path completes).</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-pink-400 mt-0.5 shrink-0" />
                <p>Grant only safe requests; deny deadlock-prone requests to score points.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-pink-605 bg-indigo-650 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Simulator
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-450 animate-pulse">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">System Deadlocked!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">{feedback?.msg || 'Deadlock state occurred.'}</p>
            
            <div className="bg-slate-950 border border-indigo-950 rounded-xl p-6 mb-8">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-indigo-400">{score}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={initGame}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl transition-all border border-slate-750"
              >
                <RotateCcw size={20} />
                Try Again
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

      {/* Dynamic Feedback Toast */}
      {feedback && gameState === 'playing' && (
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-fade-in ${feedback.isError ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default BankersAlgorithmGame;
