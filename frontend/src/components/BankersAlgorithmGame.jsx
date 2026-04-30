import { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertTriangle, CheckCircle, XCircle, Activity, Award, X, RotateCcw } from 'lucide-react';

const BankersAlgorithmGame = ({ onGameComplete, highScore = 0 }) => {
  const [gameState, setGameState] = useState('start'); // start, playing, paused, gameover
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  
  // N=3, M=3 for level 1
  const initialResources = [10, 5, 7];
  const [available, setAvailable] = useState([...initialResources]);
  const [allocation, setAllocation] = useState([
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2]
  ]);
  const [maxNeed, setMaxNeed] = useState([
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2]
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
    // Pick a random process that hasn't finished
    const unfinished = need.map((n, i) => ({ n, i })).filter(x => x.n.some(val => val > 0));
    
    if (unfinished.length === 0) {
      // Level complete!
      handleLevelComplete();
      return;
    }

    const pIndex = unfinished[Math.floor(Math.random() * unfinished.length)].i;
    const req = need[pIndex].map(n => Math.floor(Math.random() * (n + 1)));
    
    // Ensure request is not all zeros
    if (req.every(v => v === 0)) {
      const idx = req.findIndex((v, j) => need[pIndex][j] > 0);
      if (idx !== -1) req[idx] = 1;
    }

    // 20% chance to generate an unsafe request by exceeding available intentionally (for tricking)
    if (Math.random() < 0.2) {
      const j = Math.floor(Math.random() * req.length);
      req[j] += available[j] + 1; // force unsafe/invalid
    }

    setCurrentRequest({ process: pIndex, request: req });
    setTimeLeft(15 - Math.min(10, level)); // Gets faster
  };

  const handleLevelComplete = () => {
    setScore(s => s + 100);
    showFeedback('Level Clear! Processes finished.', false);
    setLevel(l => l + 1);
    
    // Reset with slightly harder matrices
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
    setMaxNeed([ [7, 5, 3], [3, 2, 2], [9, 0, 2] ]);
    setAvailable([3, 3, 2]);
    setFeedback(null);
    setSafeSequence([]);
    setTimeout(generateRequest, 1000);
  };

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
      if (!found) break; // unsafe
    }
    return { safe: count === alloc.length, seq };
  };

  const processDecision = (grant) => {
    const { process, request } = currentRequest;
    const need = getNeedMatrix();
    
    // Check basic validity
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

      // Simulate allocation
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
        // Safe allocation!
        setAllocation(tempAlloc);
        setAvailable(tempAvail);
        setSafeSequence(seq);
        setScore(s => s + 30 + timeLeft); // Time bonus
        showFeedback('Safe Allocation! +30', false);
        
        // If process finished, release resources
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
      // Denied
      // Was it actually safe to grant?
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
         // Bad denial
         setScore(s => Math.max(0, s - 10));
         showFeedback('Denied a safe request. -10', true);
      } else {
         // Good denial
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
    // Simple SVG Graph visualization mapping allocation
    return (
      <svg width="100%" height="200" className="bg-slate-50 rounded-xl border border-slate-200">
         <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
        {/* Draw Resources (Squares) */}
        {available.map((r, i) => (
          <g key={`r${i}`} transform={`translate(${100 + i * 120}, 40)`}>
            <rect x="-20" y="-20" width="40" height="40" rx="8" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" className="text-sm font-bold fill-indigo-700">R{i}</text>
            <text x="0" y="35" textAnchor="middle" className="text-[10px] font-bold fill-slate-400">Av: {r}</text>
          </g>
        ))}
        {/* Draw Processes (Circles) */}
        {allocation.map((p, i) => (
          <g key={`p${i}`} transform={`translate(${60 + i * 100}, 150)`}>
            <circle cx="0" cy="0" r="20" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" className="text-sm font-bold fill-pink-700">P{i}</text>
          </g>
        ))}
        {/* Draw Edges (Allocation) */}
        {allocation.map((row, pIdx) => row.map((amount, rIdx) => {
           if (amount > 0) {
             const rX = 100 + rIdx * 120;
             const rY = 60; // bottom of rect
             const pX = 60 + pIdx * 100;
             const pY = 130; // top of circle
             return (
               <path key={`edge-${pIdx}-${rIdx}`} d={`M ${rX} ${rY} L ${pX} ${pY}`} stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.6" />
             );
           }
           return null;
        }))}
        {/* Draw Incoming Request Edge in Red if it exists */}
        {currentRequest && currentRequest.request.map((amount, rIdx) => {
          if (amount > 0) {
             const pX = 60 + currentRequest.process * 100;
             const pY = 130; 
             const rX = 100 + rIdx * 120;
             const rY = 60; 
             return (
               <path key={`req-${rIdx}`} d={`M ${pX} ${pY} L ${rX} ${rY}`} stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)" opacity="0.8" className="animate-pulse" />
             );
          }
          return null;
        })}
      </svg>
    );
  };

  const needMatrix = getNeedMatrix();

  return (
    <div className="relative flex flex-col bg-slate-50 min-h-[600px] rounded-3xl shadow-xl border border-slate-200 overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 text-pink-600 rounded-xl">
            <Activity size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Deadlock Escape</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Banker's Algorithm Simulator | Level {level}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
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
              className="p-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm transition-all"
              disabled={gameState === 'start' || gameState === 'gameover'}
            >
              {gameState === 'playing' ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={() => onGameComplete(score)}
              className="p-3 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-colors"
              title="Exit Game"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
         
         <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
               <h3 className="text-sm font-bold text-slate-600 mb-2">Resource Allocation Graph</h3>
               {renderRAG()}
               {safeSequence.length > 0 && (
                 <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-lg inline-block border border-emerald-100">
                   Safe Sequence: {safeSequence.join(' → ')}
                 </div>
               )}
            </div>
            <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col relative overflow-hidden">
               <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-1">
                 <AlertTriangle size={16} className="text-amber-500"/> Incoming Request
               </h3>
               
               {currentRequest ? (
                 <div className="flex-1 flex flex-col">
                    <div className="text-center mb-6">
                      <div className="text-3xl font-black text-slate-800">P{currentRequest.process}</div>
                      <div className="text-sm font-medium text-slate-500 mt-1">requests</div>
                      <div className="text-lg font-bold text-indigo-600 tracking-widest bg-indigo-50 py-2 rounded-lg mt-2 border border-indigo-100">
                        [{currentRequest.request.join(', ')}]
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
                      <div className="bg-amber-400 h-full transition-all ease-linear duration-1000" style={{width: `${(timeLeft/15)*100}%`}}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button 
                        onClick={() => processDecision(false)}
                        className="py-3 bg-white border-2 border-rose-100 hover:bg-rose-50 text-rose-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle size={18}/> Deny
                      </button>
                      <button 
                        onClick={() => processDecision(true)}
                        className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={18}/> Grant
                      </button>
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
                   Waiting for requests...
                 </div>
               )}
            </div>
         </div>

         {/* Matrix Tables */}
         <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-4 gap-6 text-sm">
               
               <div>
                 <h4 className="font-bold text-slate-500 mb-2 border-b pb-1">Process</h4>
                 {allocation.map((_, i) => <div key={i} className="py-1 font-bold text-slate-700">P{i}</div>)}
               </div>
               
               <div>
                 <h4 className="font-bold text-slate-500 mb-2 border-b pb-1">Allocation</h4>
                 {allocation.map((row, i) => <div key={i} className="py-1 font-medium text-slate-600">[{row.join(', ')}]</div>)}
               </div>

               <div>
                 <h4 className="font-bold text-slate-500 mb-2 border-b pb-1">Max Need</h4>
                 {maxNeed.map((row, i) => <div key={i} className="py-1 font-medium text-slate-600">[{row.join(', ')}]</div>)}
               </div>

               <div>
                 <h4 className="font-bold text-slate-500 mb-2 border-b pb-1">Need (Max-Alloc)</h4>
                 {needMatrix.map((row, i) => <div key={i} className="py-1 font-bold text-indigo-600">[{row.join(', ')}]</div>)}
               </div>

            </div>
         </div>

      </div>

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Activity size={40} className="text-pink-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Deadlock Escape</h2>
            <p className="text-slate-500 font-medium mb-8">Act as the OS Resource Manager. Avoid Deadlock using the Banker's Algorithm!</p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Review the incoming Resource Request.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Check if granting it leaves the system in a <b>Safe State</b> (Banker's Algorithm).</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Grant safe requests, Deny unsafe requests to score points.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(190,24,93)] hover:shadow-[0_4px_0_rgb(190,24,93)] hover:translate-y-1 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Simulator
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle size={40} className="text-rose-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Game Over!</h2>
            <p className="text-slate-500 font-medium mb-8 text-sm">{feedback?.msg || 'Deadlock occurred.'}</p>
            
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-pink-600">{score}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={initGame}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(15,23,42)] hover:shadow-[0_4px_0_rgb(15,23,42)] hover:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                Try Again
              </button>
              <button 
                onClick={() => onGameComplete(score)}
                className="flex-1 py-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(190,24,93)] hover:shadow-[0_4px_0_rgb(190,24,93)] hover:translate-y-1 transition-all"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Feedback Toast */}
      {feedback && gameState === 'playing' && (
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-in fade-in slide-in-from-top-4 ${feedback.isError ? 'bg-rose-500' : 'bg-emerald-500'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default BankersAlgorithmGame;
