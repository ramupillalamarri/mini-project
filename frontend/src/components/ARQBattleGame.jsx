import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, Activity, CheckCircle, ShieldAlert, Settings, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ARQBattleGame = ({ onGameComplete, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, paused, gameover
  const [mode, setMode] = useState('GBN'); // SAW, GBN, SR
  const [windowSize, setWindowSize] = useState(4);
  const [errorRate] = useState(0.2);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  // ARQ State
  const [base, setBase] = useState(0);
  const [nextSeqNum, setNextSeqNum] = useState(0);
  const [receiverExpected, setReceiverExpected] = useState(0);
  const [receiverBuffer, setReceiverBuffer] = useState([]); // for SR
  
  const [inFlight, setInFlight] = useState([]);
  const [stats, setStats] = useState({ sent: 0, retransmissions: 0, delivered: 0 });

  const gameLoopRef = useRef(null);
  const timerRef = useRef(null);
  const timeoutsRef = useRef({}); // track timeout for each packet seq
  const packetIdCounter = useRef(0);

  const CHANNEL_SPEED = 2; // % per tick (50 ticks to cross)

  const initGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(60);
    setBase(0);
    setNextSeqNum(0);
    setReceiverExpected(0);
    setReceiverBuffer([]);
    setInFlight([]);
    setStats({ sent: 0, retransmissions: 0, delivered: 0 });
    timeoutsRef.current = {};
    packetIdCounter.current = 0;
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  const getEffectiveWindow = () => {
    if (mode === 'SAW') return 1;
    return windowSize;
  };

  const sendPacket = (seq, isRetransmission = false) => {
    let status = 'normal';
    const rand = Math.random();
    if (rand < errorRate / 2) status = 'lost';
    else if (rand < errorRate) status = 'corrupt';

    setInFlight(prev => [...prev, {
      id: packetIdCounter.current++,
      seq,
      type: 'data',
      x: 0,
      direction: 1,
      status
    }]);

    timeoutsRef.current[seq] = Date.now() + 3000;
    setStats(s => ({ ...s, sent: s.sent + 1, retransmissions: s.retransmissions + (isRetransmission ? 1 : 0) }));
  };

  const sendAck = (seq, type = 'ack') => {
    setInFlight(prev => [...prev, {
      id: packetIdCounter.current++,
      seq,
      type,
      x: 100,
      direction: -1,
      status: 'normal'
    }]);
  };

  const handleReceiveData = (p) => {
     if (p.status === 'corrupt') {
        if (mode === 'SR') {
          sendAck(p.seq, 'nack');
        }
        return;
     }

     if (mode === 'SAW' || mode === 'GBN') {
        if (p.seq === receiverExpected) {
            setReceiverExpected(r => r + 1);
            sendAck(p.seq + 1);
            setStats(s => ({ ...s, delivered: s.delivered + 1 }));
            setScore(s => s + 10);
        } else {
            sendAck(receiverExpected);
        }
     } else if (mode === 'SR') {
        if (p.seq >= receiverExpected && p.seq < receiverExpected + windowSize) {
           sendAck(p.seq);
           setReceiverBuffer(prev => {
              const newBuf = [...prev, p.seq];
              let newExp = receiverExpected;
              let deliveredCount = 0;
              while (newBuf.includes(newExp) || newExp === p.seq) {
                 if (newExp === p.seq) deliveredCount++;
                 else if (newBuf.includes(newExp)) deliveredCount++;
                 
                 const index = newBuf.indexOf(newExp);
                 if (index > -1) newBuf.splice(index, 1);
                 newExp++;
              }
              
              if (deliveredCount > 0) {
                 setReceiverExpected(newExp);
                 setStats(s => ({ ...s, delivered: s.delivered + deliveredCount }));
                 setScore(s => s + (10 * deliveredCount));
              }
              return newBuf;
           });
        }
     }
  };

  const handleReceiveAck = (p) => {
     if (mode === 'SAW' || mode === 'GBN') {
        if (p.seq > base) {
            for (let i = base; i < p.seq; i++) {
               delete timeoutsRef.current[i];
            }
            setBase(p.seq);
        }
     } else if (mode === 'SR') {
        if (p.type === 'nack') {
            sendPacket(p.seq, true);
        } else {
            delete timeoutsRef.current[p.seq];
            if (p.seq === base) {
               let newBase = base + 1;
               while (!timeoutsRef.current[newBase] && newBase < nextSeqNum) {
                  newBase++;
               }
               setBase(newBase);
            }
        }
     }
  };

  const handleTimeout = (seq) => {
    delete timeoutsRef.current[seq];
    setScore(s => Math.max(0, s - 5));

    if (mode === 'SAW' || mode === 'GBN') {
       for (let i = base; i < nextSeqNum; i++) {
          sendPacket(i, true);
       }
    } else if (mode === 'SR') {
       sendPacket(seq, true);
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        // Send new packets if window allows
        if (nextSeqNum < base + getEffectiveWindow()) {
          sendPacket(nextSeqNum);
          setNextSeqNum(n => n + 1);
        }

        // Update packets in flight
        setInFlight(prev => {
          let updated = [];
          for (let p of prev) {
             if (p.status === 'lost' && p.x > 30 && p.x < 70) {
                continue; 
             }
             
             let newX = p.x + (p.direction * CHANNEL_SPEED);
             
             if (p.direction === 1 && newX >= 100) {
                handleReceiveData(p);
                continue;
             } else if (p.direction === -1 && newX <= 0) {
                handleReceiveAck(p);
                continue;
             }

             updated.push({ ...p, x: newX });
          }
          return updated;
        });

        // Check timeouts
        const now = Date.now();
        for (let seq in timeoutsRef.current) {
           if (now > timeoutsRef.current[seq]) {
              handleTimeout(parseInt(seq));
           }
        }

      }, 50);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, base, nextSeqNum, receiverExpected, receiverBuffer, mode, inFlight, getEffectiveWindow, sendPacket, handleReceiveData, handleReceiveAck, handleTimeout]);

  // Timer loop
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setGameState('gameover');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  return (
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Activity size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-emerald-300">ARQ Battle</h2>
            <p className="text-xs font-bold text-emerald-450/70 uppercase tracking-wider">
              {mode === 'SAW' ? 'Stop & Wait' : mode === 'GBN' ? 'Go-Back-N' : 'Selective Repeat'} Protocol
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</span>
             <span className={`text-2xl font-black ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>{timeLeft}s</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</span>
            <span className="text-2xl font-black text-violet-400">{score}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
             <button
              onClick={() => setGameState(prev => prev === 'playing' ? 'paused' : 'playing')}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-355 rounded-xl transition-all"
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
      <div className="flex-1 flex flex-col p-6 bg-slate-950/20 relative">
         
         {/* Stats and Controls */}
         <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
            <div className="flex gap-4">
              <div className="bg-slate-900/60 px-4 py-2.5 rounded-xl border border-indigo-500/10 shadow-lg">
                 <span className="text-[10px] font-bold text-slate-500 uppercase block">Throughput</span>
                 <span className="text-base font-black text-slate-200">{stats.delivered} Packets</span>
              </div>
              <div className="bg-slate-900/60 px-4 py-2.5 rounded-xl border border-indigo-500/10 shadow-lg">
                 <span className="text-[10px] font-bold text-slate-500 uppercase block">Retransmissions</span>
                 <span className="text-base font-black text-rose-500">{stats.retransmissions}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-2 rounded-xl border border-indigo-550/10 shadow-lg">
              <Settings size={18} className="text-slate-500 ml-2" />
              <select 
                value={mode} 
                onChange={e => setMode(e.target.value)}
                disabled={gameState === 'playing'}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-350 outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="SAW">Stop-and-Wait</option>
                <option value="GBN">Go-Back-N</option>
                <option value="SR">Selective Repeat</option>
              </select>
              {mode !== 'SAW' && (
                <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                   <span className="text-xs font-bold text-slate-500">Window:</span>
                   <input 
                     type="range" min="2" max="8" value={windowSize} 
                     onChange={e => setWindowSize(parseInt(e.target.value))}
                     disabled={gameState === 'playing'}
                     className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="text-xs font-bold text-slate-350">{windowSize}</span>
                </div>
              )}
            </div>
         </div>

         {/* ARQ Visualization Area (Scalable Responsive SVG) */}
         <div className="flex-1 bg-slate-950/80 rounded-2xl shadow-2xl border border-indigo-500/10 relative overflow-hidden flex flex-col justify-center p-4">
            
            <div className="w-full h-full max-h-[300px] flex items-center justify-center">
              <svg 
                viewBox="0 0 600 200" 
                className="w-full h-full max-w-[600px] max-h-[200px] overflow-visible"
              >
                {/* Network Pipeline Channels */}
                <line x1="110" y1="70" x2="490" y2="70" stroke="#1e293b" strokeWidth="6" />
                <line x1="110" y1="130" x2="490" y2="130" stroke="#1e293b" strokeWidth="6" />
                
                <text x="300" y="45" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b" letterSpacing="2">
                  DATA CHANNEL (UPPER)
                </text>
                <text x="300" y="165" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b" letterSpacing="2">
                  ACK CHANNEL (LOWER)
                </text>

                {/* SENDER SERVER */}
                <g transform="translate(10, 20)">
                  <rect width="100" height="160" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="3" />
                  <rect width="100" height="30" rx="10" fill="#1e293b" />
                  <text x="50" y="20" textAnchor="middle" fontSize="10" fontWeight="black" fill="#cbd5e1">SENDER</text>
                  
                  {/* Indicators */}
                  <rect x="15" y="45" width="70" height="40" rx="6" fill="#020617" stroke="#1e293b" />
                  <text x="25" y="60" fontSize="9" fontWeight="bold" fill="#10b981">Base: {base}</text>
                  <text x="25" y="75" fontSize="9" fontWeight="bold" fill="#3b82f6">Next: {nextSeqNum}</text>
                  
                  {/* blinking LED */}
                  <circle cx="50" cy="120" r="6" fill={gameState === 'playing' ? '#3b82f6' : '#64748b'} className="animate-pulse" />
                </g>

                {/* RECEIVER SERVER */}
                <g transform="translate(490, 20)">
                  <rect width="100" height="160" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="3" />
                  <rect width="100" height="30" rx="10" fill="#1e293b" />
                  <text x="50" y="20" textAnchor="middle" fontSize="10" fontWeight="black" fill="#cbd5e1">RECEIVER</text>
                  
                  {/* Indicators */}
                  <rect x="15" y="45" width="70" height="40" rx="6" fill="#020617" stroke="#1e293b" />
                  <text x="25" y="68" fontSize="10" fontWeight="bold" fill="#818cf8">Expected: {receiverExpected}</text>
                  
                  {/* Blinking LED */}
                  <circle cx="50" cy="120" r="6" fill={gameState === 'playing' ? '#10b981' : '#64748b'} className="animate-pulse" />
                </g>

                {/* Packets Rendering inside SVG */}
                {inFlight.map(p => {
                  const isData = p.type === 'data';
                  const xPos = 110 + (p.x / 100) * 380;
                  const yPos = isData ? 70 : 130;

                  let color = "#818cf8";
                  let border = "#4f46e5";
                  let label = `A${p.seq}`;

                  if (isData) {
                    label = `P${p.seq}`;
                    if (p.status === 'corrupt') {
                      color = "#f43f5e";
                      border = "#be123c";
                    } else if (p.status === 'lost') {
                      color = "#64748b";
                      border = "#475569";
                    } else {
                      color = "#10b981";
                      border = "#047857";
                    }
                  } else if (p.type === 'nack') {
                    label = `N${p.seq}`;
                    color = "#f97316";
                    border = "#ea580c";
                  }

                  return (
                    <g key={p.id} transform={`translate(${xPos}, ${yPos})`}>
                      <rect 
                        x="-15" 
                        y="-15" 
                        width="30" 
                        height="30" 
                        rx="6" 
                        fill={color} 
                        stroke={border} 
                        strokeWidth="2.5"
                        opacity={p.status === 'lost' && p.x > 30 ? 0.3 : 1}
                      />
                      <text 
                        x="0" 
                        y="4" 
                        textAnchor="middle" 
                        fontSize="10" 
                        fontWeight="bold" 
                        fill="#ffffff"
                        opacity={p.status === 'lost' && p.x > 30 ? 0.3 : 1}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

              </svg>
            </div>

         </div>
      </div>

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative text-white">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-350 hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-emerald-400">
              <Activity size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">ARQ Battle</h2>
            <p className="text-slate-400 font-medium mb-8">Manage reliable data transmission over a lossy channel!</p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                <p>Select GBN (Go-Back-N) or SR (Selective Repeat) windowing rules.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                <p>Verify how sliding windows recover lost or corrupt packet frames.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                <p>Gain score points for high successful transmission output rates.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Transmission
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center mx-auto mb-6 shadow-inner text-emerald-450">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">Time's Up!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">Transmission window closed.</p>
            
            <div className="bg-slate-950 border border-indigo-950 rounded-xl p-6 mb-8 flex justify-between">
               <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Delivered</p>
                  <p className="text-2xl font-black text-emerald-400">{stats.delivered}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Retries</p>
                  <p className="text-2xl font-black text-rose-500">{stats.retransmissions}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Score</p>
                  <p className="text-2xl font-black text-indigo-400">{score}</p>
               </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={initGame}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <RotateCcw size={20} />
                Try Again
              </button>
              <button 
                onClick={() => onGameComplete(score)}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
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

export default ARQBattleGame;
