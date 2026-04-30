import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RefreshCw, Zap, ShieldCheck, Video, FileText, Gamepad2, Landmark, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react';

const SCENARIOS = [
  {
    id: 1,
    title: 'Live Video Streaming',
    icon: <Video size={24} />,
    desc: 'You are broadcasting a live sports event to millions. Speed is critical; occasional frame drops are acceptable.',
    optimal: 'UDP',
    reason: 'UDP is faster. In live video, losing a small packet just causes a minor glitch, but waiting for TCP retransmission causes freezing (buffering).'
  },
  {
    id: 2,
    title: 'Banking Transaction',
    icon: <Landmark size={24} />,
    desc: 'Transferring $10,000 between accounts. Every single byte must arrive accurately and in order.',
    optimal: 'TCP',
    reason: 'TCP guarantees delivery and order. A lost packet in UDP could mean losing the transaction data entirely.'
  },
  {
    id: 3,
    title: 'Online Multiplayer FPS',
    icon: <Gamepad2 size={24} />,
    desc: 'Sending player coordinates 60 times a second. Need lowest possible latency.',
    optimal: 'UDP',
    reason: 'UDP is preferred for fast-paced games. If a position update is lost, the next one arriving a millisecond later makes the old one irrelevant.'
  },
  {
    id: 4,
    title: 'Email & File Download',
    icon: <FileText size={24} />,
    desc: 'Downloading a 50MB PDF document. The file cannot be corrupted.',
    optimal: 'TCP',
    reason: 'TCP ensures every part of the file arrives intact. UDP would result in a corrupted, unopenable file if packets drop.'
  }
];

const ProtocolRaceGame = ({ onGameComplete, highScore = 0 }) => {
  const [gameState, setGameState] = useState('start'); // start, scenario, racing, result, gameover
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Race State
  const [tcpProgress, setTcpProgress] = useState(0);
  const [udpProgress, setUdpProgress] = useState(0);
  const [tcpPackets, setTcpPackets] = useState([]); // { id, x, type }
  const [udpPackets, setUdpPackets] = useState([]); // { id, x, visible }
  const [raceFinished, setRaceFinished] = useState(false);

  const raceTimerRef = useRef(null);
  const packetIdRef = useRef(0);

  const currentScenario = SCENARIOS[level];

  const initGame = () => {
    setGameState('scenario');
    setScore(0);
    setLevel(0);
    resetRaceState();
  };

  const resetRaceState = () => {
    setSelectedProtocol(null);
    setTcpProgress(0);
    setUdpProgress(0);
    setTcpPackets([]);
    setUdpPackets([]);
    setRaceFinished(false);
  };

  const startRace = (protocol) => {
    setSelectedProtocol(protocol);
    setGameState('racing');
    
    // Begin Race Loop
    let tcpSent = 0;
    let tcpAcked = 0;
    let udpSent = 0;

    const TCP_TOTAL = 20;
    const UDP_TOTAL = 20;

    raceTimerRef.current = setInterval(() => {
      // Move existing packets
      setTcpPackets(prev => {
        let updated = [];
        for (let p of prev) {
          if (p.type === 'data') {
             p.x += 2;
             if (p.x >= 100) {
                // Arrived, generate ACK
                updated.push({ id: packetIdRef.current++, x: 100, type: 'ack' });
             } else {
                updated.push(p);
             }
          } else if (p.type === 'ack') {
             p.x -= 3; // ACKs travel faster
             if (p.x <= 0) {
                tcpAcked++;
                setTcpProgress((tcpAcked / TCP_TOTAL) * 100);
             } else {
                updated.push(p);
             }
          }
        }
        return updated;
      });

      setUdpPackets(prev => {
        let updated = [];
        for (let p of prev) {
           if (!p.visible) continue;
           p.x += 4; // UDP is twice as fast visually
           if (p.x >= 100) {
              setUdpProgress(curr => curr + (100 / UDP_TOTAL));
           } else {
              updated.push(p);
           }
        }
        return updated;
      });

      // Spawn new packets
      if (tcpSent < TCP_TOTAL && Math.random() > 0.4) {
         setTcpPackets(prev => [...prev, { id: packetIdRef.current++, x: 0, type: 'data' }]);
         tcpSent++;
      }

      if (udpSent < UDP_TOTAL) {
         const drop = Math.random() < 0.2; // 20% UDP packet loss
         setUdpPackets(prev => [...prev, { id: packetIdRef.current++, x: 0, visible: !drop }]);
         udpSent++;
      }

    }, 50);
  };

  // Check race finish
  useEffect(() => {
    if (gameState === 'racing' && !raceFinished) {
      if (tcpProgress >= 100 || udpProgress >= 100) {
         setRaceFinished(true);
         clearInterval(raceTimerRef.current);
         setTimeout(() => evaluateChoice(), 1000);
      }
    }
  }, [tcpProgress, udpProgress, gameState, raceFinished]);

  const evaluateChoice = () => {
     setGameState('result');
     
     const isOptimal = selectedProtocol === currentScenario.optimal;
     
     if (isOptimal) {
        setScore(s => s + 100);
        showFeedback(`Correct! ${currentScenario.optimal} was the best choice. +100`, 'success');
     } else {
        setScore(s => Math.max(0, s - 50));
        showFeedback(`Incorrect! ${currentScenario.optimal} was needed here. -50`, 'error');
     }
  };

  const nextLevel = () => {
     if (level + 1 >= SCENARIOS.length) {
        setGameState('gameover');
     } else {
        setLevel(l => l + 1);
        setGameState('scenario');
        resetRaceState();
     }
  };

  const showFeedback = (msg, type = 'info') => {
    setFeedback({ msg, type });
  };

  return (
    <div className="relative flex flex-col bg-slate-50 min-h-[600px] rounded-3xl shadow-xl border border-slate-200 overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Protocol Race</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              TCP vs UDP Showdown
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scenario</span>
             <span className="text-2xl font-black text-slate-800">{level + 1} / {SCENARIOS.length}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
            <span className="text-2xl font-black text-sky-600">{score}</span>
          </div>
          <div className="flex items-center gap-2 border-l-2 border-slate-100 pl-6">
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
      <div className="flex-1 flex flex-col p-8 bg-slate-100 relative items-center justify-center">
         
         {gameState === 'scenario' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-2xl w-full text-center animate-in fade-in zoom-in duration-300">
               <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  {currentScenario.icon}
               </div>
               <h3 className="text-2xl font-black text-slate-800 mb-2">{currentScenario.title}</h3>
               <p className="text-slate-600 mb-8">{currentScenario.desc}</p>
               
               <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Choose Transport Protocol</h4>
               
               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => startRace('TCP')}
                    className="flex flex-col items-center justify-center p-6 border-2 border-indigo-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                  >
                     <ShieldCheck size={32} className="text-indigo-400 group-hover:text-indigo-600 mb-2" />
                     <span className="font-black text-xl text-indigo-900">TCP</span>
                     <span className="text-xs font-medium text-indigo-600/70 mt-1">Reliable, Ordered, Slower</span>
                  </button>
                  <button 
                    onClick={() => startRace('UDP')}
                    className="flex flex-col items-center justify-center p-6 border-2 border-amber-100 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all group"
                  >
                     <Zap size={32} className="text-amber-400 group-hover:text-amber-600 mb-2" />
                     <span className="font-black text-xl text-amber-900">UDP</span>
                     <span className="text-xs font-medium text-amber-600/70 mt-1">Fast, Lossy, Unordered</span>
                  </button>
               </div>
            </div>
         )}

         {(gameState === 'racing' || gameState === 'result') && (
            <div className="w-full max-w-3xl flex flex-col gap-6 animate-in fade-in">
               
               {/* Race Track UI */}
               <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-end mb-4">
                     <h3 className="font-black text-slate-800">Transmission Race</h3>
                     <span className="text-sm font-bold text-slate-400">Selected: <span className={selectedProtocol === 'TCP' ? 'text-indigo-600' : 'text-amber-600'}>{selectedProtocol}</span></span>
                  </div>

                  {/* TCP Track */}
                  <div className="mb-6 relative h-20 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center">
                     <div className="absolute left-2 font-black text-indigo-300 z-10 opacity-50">TCP</div>
                     
                     {/* Progress Bar BG */}
                     <div className="absolute top-0 left-0 bottom-0 bg-indigo-50 transition-all duration-200" style={{width: `${tcpProgress}%`}}></div>
                     
                     {/* Packets */}
                     {tcpPackets.map(p => (
                        <div 
                          key={p.id}
                          className={`absolute w-6 h-6 rounded-md shadow-sm border-2 flex items-center justify-center transition-all ease-linear
                             ${p.type === 'data' ? 'bg-indigo-500 border-indigo-600 text-white top-2' : 'bg-emerald-100 border-emerald-400 text-emerald-700 bottom-2 w-4 h-4 rounded-full'}
                          `}
                          style={{ left: `${p.x}%` }}
                        >
                        </div>
                     ))}
                  </div>

                  {/* UDP Track */}
                  <div className="relative h-20 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center">
                     <div className="absolute left-2 font-black text-amber-300 z-10 opacity-50">UDP</div>
                     
                     {/* Progress Bar BG */}
                     <div className="absolute top-0 left-0 bottom-0 bg-amber-50 transition-all duration-200" style={{width: `${udpProgress}%`}}></div>
                     
                     {/* Packets */}
                     {udpPackets.map(p => (
                        <div 
                          key={p.id}
                          className="absolute w-6 h-6 bg-amber-500 border-2 border-amber-600 rounded-md shadow-sm top-7 transition-all ease-linear"
                          style={{ left: `${p.x}%`, display: p.visible ? 'block' : 'none' }}
                        >
                        </div>
                     ))}
                  </div>

               </div>

               {/* Results UI */}
               {gameState === 'result' && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
                     <div className={`p-4 rounded-xl mb-4 border ${selectedProtocol === currentScenario.optimal ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                        <div className="flex items-center gap-3 mb-2">
                           {selectedProtocol === currentScenario.optimal ? <CheckCircle className="text-emerald-500" /> : <ShieldAlert className="text-rose-500" />}
                           <h4 className={`font-black text-lg ${selectedProtocol === currentScenario.optimal ? 'text-emerald-800' : 'text-rose-800'}`}>
                             {selectedProtocol === currentScenario.optimal ? 'Great Choice!' : 'Wrong Choice!'}
                           </h4>
                        </div>
                        <p className={`text-sm ${selectedProtocol === currentScenario.optimal ? 'text-emerald-700' : 'text-rose-700'}`}>
                           {currentScenario.reason}
                        </p>
                     </div>
                     <button 
                       onClick={nextLevel}
                       className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-[0_4px_0_rgb(15,23,42)] hover:translate-y-1 transition-all flex items-center justify-center gap-2"
                     >
                        Next Scenario <ArrowRight size={18} />
                     </button>
                  </div>
               )}

            </div>
         )}
         
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
            <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldCheck size={40} className="text-sky-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Protocol Race</h2>
            <p className="text-slate-500 font-medium mb-8">TCP vs UDP. Choose the right transport layer protocol for the job!</p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Read the scenario carefully.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600"><b>TCP</b> is highly reliable but has overhead (ACKs).</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600"><b>UDP</b> is blisteringly fast but drops packets occasionally.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(2,132,199)] hover:shadow-[0_4px_0_rgb(2,132,199)] hover:translate-y-1 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Showdown
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldCheck size={40} className="text-sky-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Simulation Complete!</h2>
            <p className="text-slate-500 font-medium mb-8 text-sm">You've evaluated all network scenarios.</p>
            
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
               <p className="text-xs font-bold text-slate-400 uppercase mb-1">Final Score</p>
               <p className="text-5xl font-black text-sky-600">{score}</p>
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
                className="flex-1 py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(2,132,199)] hover:shadow-[0_4px_0_rgb(2,132,199)] hover:translate-y-1 transition-all"
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

export default ProtocolRaceGame;
