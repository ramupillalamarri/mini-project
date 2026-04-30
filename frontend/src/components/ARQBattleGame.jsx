import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RefreshCw, Activity, CheckCircle, ShieldAlert, Settings } from 'lucide-react';

const ARQBattleGame = ({ onGameComplete }) => {
  const [gameState, setGameState] = useState('start'); // start, playing, paused, gameover
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
  
  // Packets in flight: { id, seq, type: 'data'|'ack'|'nack', x: 0-100, status: 'normal'|'corrupt'|'lost', direction: 1|-1 }
  const [inFlight, setInFlight] = useState([]);
  
  // Stats
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

    // Set timeout (3000ms)
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
      status: 'normal' // ACKs don't fail in this simple simulation
    }]);
  };

  const handleReceiveData = (p) => {
     if (p.status === 'corrupt') {
        if (mode === 'SR') {
          sendAck(p.seq, 'nack');
        }
        return; // Discard corrupt
     }

     if (mode === 'SAW' || mode === 'GBN') {
        if (p.seq === receiverExpected) {
           setReceiverExpected(r => r + 1);
           sendAck(p.seq + 1); // Cumulative ACK (expecting next)
           setStats(s => ({ ...s, delivered: s.delivered + 1 }));
           setScore(s => s + 10);
        } else {
           // Discard out of order, resend ACK for what we expect
           sendAck(receiverExpected);
        }
     } else if (mode === 'SR') {
        if (p.seq >= receiverExpected && p.seq < receiverExpected + windowSize) {
           sendAck(p.seq); // Individual ACK
           setReceiverBuffer(prev => {
              const newBuf = [...prev, p.seq];
              // Slide window if we have the expected
              let newExp = receiverExpected;
              let deliveredCount = 0;
              while (newBuf.includes(newExp) || newExp === p.seq) {
                 if (newExp === p.seq) deliveredCount++; // newly delivered
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
           // Cumulative ACK logic: everything before p.seq is ACKed
           for (let i = base; i < p.seq; i++) {
              delete timeoutsRef.current[i];
           }
           setBase(p.seq);
        }
     } else if (mode === 'SR') {
        if (p.type === 'nack') {
           // Fast retransmit
           sendPacket(p.seq, true);
        } else {
           // Individual ACK
           delete timeoutsRef.current[p.seq];
           if (p.seq === base) {
              // Slide base forward past any already-ACKed packets
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
    setScore(s => Math.max(0, s - 5)); // Penalty

    if (mode === 'SAW' || mode === 'GBN') {
       // Retransmit all from base to nextSeqNum-1
       for (let i = base; i < nextSeqNum; i++) {
          sendPacket(i, true);
       }
    } else if (mode === 'SR') {
       // Retransmit only the timed-out packet
       sendPacket(seq, true);
    }
  };

  // Main Physics/Protocol Loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        // 1. Send new packets if window allows
        if (nextSeqNum < base + getEffectiveWindow()) {
          sendPacket(nextSeqNum);
          setNextSeqNum(n => n + 1);
        }

        // 2. Update packets in flight
        setInFlight(prev => {
          let updated = [];
          for (let p of prev) {
             if (p.status === 'lost' && p.x > 30 && p.x < 70) {
               // Visually disappears in the middle
               continue; 
             }
             
             let newX = p.x + (p.direction * CHANNEL_SPEED);
             
             if (p.direction === 1 && newX >= 100) {
                // Arrived at receiver
                handleReceiveData(p);
                continue;
             } else if (p.direction === -1 && newX <= 0) {
                // Arrived at sender
                handleReceiveAck(p);
                continue;
             }

             updated.push({ ...p, x: newX });
          }
          return updated;
        });

        // 3. Check timeouts
        const now = Date.now();
        for (let seq in timeoutsRef.current) {
           if (now > timeoutsRef.current[seq]) {
              handleTimeout(parseInt(seq));
           }
        }

      }, 50); // 20 FPS
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, base, nextSeqNum, receiverExpected, receiverBuffer, mode, inFlight, getEffectiveWindow, sendPacket, handleReceiveData, handleReceiveAck, handleTimeout]);

  const handleGameOver = () => {
    setGameState('gameover');
  };

  // Timer loop
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleGameOver();
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
    <div className="relative flex flex-col bg-slate-50 min-h-[600px] rounded-3xl shadow-xl border border-slate-200 overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
            <Activity size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">ARQ Battle</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {mode === 'SAW' ? 'Stop & Wait' : mode === 'GBN' ? 'Go-Back-N' : 'Selective Repeat'} Protocol
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</span>
             <span className={`text-2xl font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>{timeLeft}s</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
            <span className="text-2xl font-black text-violet-600">{score}</span>
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
      <div className="flex-1 flex flex-col p-6 bg-slate-100 relative">
         
         {/* Stats and Controls */}
         <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                 <span className="text-xs font-bold text-slate-400 uppercase block">Throughput</span>
                 <span className="text-lg font-black text-slate-800">{stats.delivered} PKTs</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                 <span className="text-xs font-bold text-slate-400 uppercase block">Retransmissions</span>
                 <span className="text-lg font-black text-rose-600">{stats.retransmissions}</span>
              </div>
            </div>

            <div className="flex gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm items-center">
              <Settings size={18} className="text-slate-400 ml-2" />
              <select 
                value={mode} 
                onChange={e => setMode(e.target.value)}
                disabled={gameState === 'playing'}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="SAW">Stop-and-Wait</option>
                <option value="GBN">Go-Back-N</option>
                <option value="SR">Selective Repeat</option>
              </select>
              {mode !== 'SAW' && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                   <span className="text-xs font-bold text-slate-500">Window:</span>
                   <input 
                     type="range" min="2" max="8" value={windowSize} 
                     onChange={e => setWindowSize(parseInt(e.target.value))}
                     disabled={gameState === 'playing'}
                     className="w-20"
                   />
                   <span className="text-sm font-bold text-slate-700">{windowSize}</span>
                </div>
              )}
            </div>
         </div>

         {/* ARQ Visualization Area */}
         <div className="flex-1 bg-white rounded-2xl shadow-inner border-2 border-slate-200 relative overflow-hidden flex flex-col justify-center px-12 py-8">
            
            <div className="flex justify-between items-center w-full h-40 relative">
               
               {/* Sender */}
               <div className="w-24 h-full bg-slate-50 rounded-xl border-2 border-slate-300 flex flex-col items-center justify-center relative z-10">
                  <span className="font-black text-slate-700 mb-2">SENDER</span>
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    Base: {base}
                  </div>
                  <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 mt-1">
                    Next: {nextSeqNum}
                  </div>
               </div>

               {/* Channel Background Line */}
               <div className="absolute top-1/2 left-24 right-24 h-0.5 bg-slate-200 -translate-y-1/2"></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Unreliable Channel
               </div>

               {/* Packets in flight */}
               {inFlight.map(p => (
                 <div 
                   key={p.id}
                   className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-xs rounded shadow-sm border transition-all
                     ${p.type === 'data' ? 
                         p.status === 'corrupt' ? 'bg-rose-100 border-rose-400 text-rose-700' : 
                         p.status === 'lost' ? 'bg-slate-200 border-slate-300 text-slate-400 opacity-50 blur-[2px]' : 
                         'bg-emerald-100 border-emerald-400 text-emerald-700' 
                       : p.type === 'nack' ? 'bg-orange-100 border-orange-400 text-orange-700 rounded-full'
                       : 'bg-indigo-100 border-indigo-400 text-indigo-700 rounded-full'}
                   `}
                   style={{ 
                      left: `calc(96px + ${p.x}% * calc(100% - 192px) / 100)`, // Interpolate between sender (96px) and receiver
                      width: p.type === 'data' ? '32px' : '24px',
                      height: p.type === 'data' ? '32px' : '24px',
                      marginTop: p.type === 'data' ? '-24px' : '24px' // ACKs travel on lower lane
                   }}
                 >
                   {p.type === 'data' ? `P${p.seq}` : p.type === 'nack' ? `N${p.seq}` : `A${p.seq}`}
                 </div>
               ))}

               {/* Receiver */}
               <div className="w-24 h-full bg-slate-50 rounded-xl border-2 border-slate-300 flex flex-col items-center justify-center relative z-10">
                  <span className="font-black text-slate-700 mb-2">RECEIVER</span>
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                    Exp: {receiverExpected}
                  </div>
                  {mode === 'SR' && receiverBuffer.length > 0 && (
                    <div className="text-[10px] font-bold text-slate-500 mt-1 text-center">
                      Buf: [{receiverBuffer.join(',')}]
                    </div>
                  )}
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
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Activity size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">ARQ Battle</h2>
            <p className="text-slate-500 font-medium mb-8">Manage reliable data transmission over a lossy channel!</p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Select a protocol: Stop-and-Wait, Go-Back-N, or Selective Repeat.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Watch how it handles <b>lost</b> and <b>corrupt</b> packets automatically.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Score points for high throughput and efficiency.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(5,150,105)] hover:shadow-[0_4px_0_rgb(5,150,105)] hover:translate-y-1 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Transmission
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldAlert size={40} className="text-slate-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Time's Up!</h2>
            <p className="text-slate-500 font-medium mb-8 text-sm">Transmission window closed.</p>
            
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100 flex justify-between">
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Delivered</p>
                  <p className="text-2xl font-black text-emerald-600">{stats.delivered}</p>
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Retries</p>
                  <p className="text-2xl font-black text-rose-600">{stats.retransmissions}</p>
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Score</p>
                  <p className="text-2xl font-black text-indigo-600">{score}</p>
               </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={initGame}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(15,23,42)] hover:shadow-[0_4px_0_rgb(15,23,42)] hover:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                Try Again
              </button>
              <button 
                onClick={() => onGameComplete(score)}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(5,150,105)] hover:shadow-[0_4px_0_rgb(5,150,105)] hover:translate-y-1 transition-all"
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
