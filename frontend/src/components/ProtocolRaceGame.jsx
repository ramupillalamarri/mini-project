import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, Zap, ShieldCheck, Video, FileText, Gamepad2, Landmark, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const ProtocolRaceGame = ({ onGameComplete, highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'scenario' : 'start'); // start, scenario, racing, result, gameover
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
    setTcpProgress(0);
    setUdpProgress(0);
    setTcpPackets([]);
    setUdpPackets([]);
    setRaceFinished(false);
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

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
             p.x += 2.5;
             if (p.x >= 100) {
                updated.push({ id: packetIdRef.current++, x: 100, type: 'ack' });
             } else {
                updated.push(p);
             }
          } else if (p.type === 'ack') {
             p.x -= 3.5; // ACKs travel faster
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
           p.x += 4.5; // UDP is twice as fast visually
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
         const drop = Math.random() < 0.15; // 15% UDP packet loss
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
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Zap size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-sky-200">Protocol Race</h2>
            <p className="text-xs font-bold text-sky-400/70 uppercase tracking-wider">
              TCP vs UDP Showdown
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scenario</span>
             <span className="text-2xl font-black text-slate-200">{level + 1} / {SCENARIOS.length}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</span>
            <span className="text-2xl font-black text-sky-400">{score}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
            <button
              onClick={() => setGameState(prev => prev === 'racing' ? 'paused' : 'racing')}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-355 rounded-xl transition-all"
              disabled={gameState !== 'racing' && gameState !== 'paused'}
            >
              {gameState === 'racing' ? <Pause size={20} /> : <Play size={20} />}
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
      <div className="flex-1 flex flex-col p-6 bg-slate-950/20 relative items-center justify-center">
         
         {gameState === 'scenario' && (
            <div className="bg-slate-900/80 p-8 rounded-2xl shadow-2xl border border-indigo-500/20 max-w-2xl w-full text-center animate-in fade-in zoom-in duration-300">
               <div className="w-16 h-16 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/5">
                  {currentScenario.icon}
               </div>
               <h3 className="text-2xl font-bold text-slate-100 mb-2">{currentScenario.title}</h3>
               <p className="text-slate-400 text-sm leading-relaxed mb-8">{currentScenario.desc}</p>
               
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Choose Transport Protocol</h4>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => startRace('TCP')}
                    className="flex flex-col items-center justify-center p-6 border border-indigo-550/10 bg-slate-950/40 rounded-xl hover:border-indigo-500 hover:bg-indigo-950/20 transition-all group"
                  >
                     <ShieldCheck size={32} className="text-indigo-400 group-hover:text-indigo-300 mb-2" />
                     <span className="font-bold text-lg text-indigo-200">TCP</span>
                     <span className="text-[10px] font-medium text-indigo-400 mt-1">Reliable, Ordered, Slower</span>
                  </button>
                  <button 
                    onClick={() => startRace('UDP')}
                    className="flex flex-col items-center justify-center p-6 border border-amber-550/10 bg-slate-950/40 rounded-xl hover:border-amber-500 hover:bg-amber-950/20 transition-all group"
                  >
                     <Zap size={32} className="text-amber-400 group-hover:text-amber-300 mb-2" />
                     <span className="font-bold text-lg text-amber-200">UDP</span>
                     <span className="text-[10px] font-medium text-amber-450 mt-1">Fast, Lossy, Unordered</span>
                  </button>
               </div>
            </div>
         )}

         {(gameState === 'racing' || gameState === 'result') && (
            <div className="w-full max-w-3xl flex flex-col gap-6 animate-in fade-in">
               
               {/* Race Track UI */}
               <div className="bg-slate-900/60 rounded-2xl p-6 shadow-2xl border border-indigo-500/10">
                  <div className="flex justify-between items-end mb-6">
                     <h3 className="font-bold text-indigo-350">Transmission Speed Track</h3>
                     <span className="text-xs font-semibold text-slate-500">Selected: <span className={selectedProtocol === 'TCP' ? 'text-indigo-400' : 'text-amber-400'}>{selectedProtocol}</span></span>
                  </div>

                  {/* TCP Runway Track */}
                  <div className="mb-6 relative h-20 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center shadow-inner">
                     <div className="absolute left-4 font-mono font-black text-indigo-500/20 z-10 text-xl tracking-widest select-none">TCP TRACK</div>
                     
                     {/* Progress Fill */}
                     <div className="absolute top-0 left-0 bottom-0 bg-indigo-500/5 transition-all duration-200" style={{width: `${tcpProgress}%`}}></div>
                     
                     {/* Horizontal lane dashes */}
                     <div className="absolute inset-0 flex items-center justify-between px-2 opacity-5 pointer-events-none">
                       {Array.from({length: 15}).map((_, i) => <div key={i} className="h-0.5 w-4 bg-white"></div>)}
                     </div>

                     {/* Packets */}
                     {tcpPackets.map(p => {
                        const isData = p.type === 'data';
                        return (
                          <div 
                            key={p.id}
                            className={`absolute w-7 h-7 rounded border shadow-md flex items-center justify-center transition-all duration-100 ease-linear
                               ${isData ? 'bg-indigo-600 border-indigo-400 text-white top-2' : 'bg-emerald-600 border-emerald-400 text-white bottom-2 w-5 h-5 rounded-full'}
                            `}
                            style={{ left: `${p.x}%` }}
                          >
                            <span className="text-[8px] font-bold font-mono">{isData ? 'DATA' : 'ACK'}</span>
                          </div>
                        );
                     })}
                  </div>

                  {/* UDP Runway Track */}
                  <div className="relative h-20 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center shadow-inner">
                     <div className="absolute left-4 font-mono font-black text-amber-500/20 z-10 text-xl tracking-widest select-none">UDP TRACK</div>
                     
                     {/* Progress Fill */}
                     <div className="absolute top-0 left-0 bottom-0 bg-amber-500/5 transition-all duration-200" style={{width: `${udpProgress}%`}}></div>
                     
                     {/* Horizontal lane dashes */}
                     <div className="absolute inset-0 flex items-center justify-between px-2 opacity-5 pointer-events-none">
                       {Array.from({length: 15}).map((_, i) => <div key={i} className="h-0.5 w-4 bg-white"></div>)}
                     </div>

                     {/* Packets */}
                     {udpPackets.map(p => (
                        <div 
                          key={p.id}
                          className="absolute w-7 h-7 bg-amber-600 border border-amber-400 rounded shadow-md top-6 flex items-center justify-center transition-all duration-100 ease-linear"
                          style={{ left: `${p.x}%`, display: p.visible ? 'flex' : 'none' }}
                        >
                          <span className="text-[8px] font-bold font-mono">DATA</span>
                        </div>
                     ))}
                  </div>

               </div>

               {/* Results UI */}
               {gameState === 'result' && (
                  <div className="bg-slate-900/60 rounded-2xl p-6 shadow-2xl border border-indigo-500/10 animate-in slide-in-from-bottom-4">
                     <div className={`p-4 rounded-xl mb-4 border ${selectedProtocol === currentScenario.optimal ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-205' : 'bg-rose-955/20 border-rose-500/30 text-rose-205'}`}>
                        <div className="flex items-center gap-3 mb-2">
                           {selectedProtocol === currentScenario.optimal ? <CheckCircle className="text-emerald-400" /> : <ShieldAlert className="text-rose-450" />}
                           <h4 className={`font-black text-lg ${selectedProtocol === currentScenario.optimal ? 'text-emerald-300' : 'text-rose-350'}`}>
                             {selectedProtocol === currentScenario.optimal ? 'Optimal Protocol Choice!' : 'Sub-Optimal Protocol Choice!'}
                           </h4>
                        </div>
                        <p className={`text-sm leading-relaxed ${selectedProtocol === currentScenario.optimal ? 'text-emerald-200/80' : 'text-rose-200/80'}`}>
                           {currentScenario.reason}
                        </p>
                      </div>
                      <button 
                        onClick={nextLevel}
                        className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700 hover:translate-x-0.5"
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
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-350 hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-sky-500/10 border border-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-sky-400">
              <Zap size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Protocol Race</h2>
            <p className="text-slate-400 font-medium mb-8">TCP vs UDP. Choose the correct transport protocol for each real-world scenario!</p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-sky-400 mt-0.5 shrink-0" />
                <p>Read the application requirement scenario description.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-sky-400 mt-0.5 shrink-0" />
                <p><b>TCP</b> offers reliability via ACKs but is slower due to handshakes.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-sky-400 mt-0.5 shrink-0" />
                <p><b>UDP</b> offers raw execution speed but might experience packet dropouts.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Showdown
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-sky-500/10 border border-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-sky-400">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">Simulation Complete!</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">All transport layer races completed.</p>
            
            <div className="bg-slate-950 border border-indigo-950 rounded-xl p-6 mb-8">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
               <p className="text-5xl font-black text-sky-400">{score}</p>
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
                className="flex-1 py-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Feedback Toast */}
      {feedback && (gameState === 'scenario' || gameState === 'result') && (
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-fade-in ${feedback.type === 'error' ? 'bg-rose-600 border border-rose-500/25' : 'bg-emerald-600 border border-emerald-500/25'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default ProtocolRaceGame;
