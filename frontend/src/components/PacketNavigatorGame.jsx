import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, Network, Route, ShieldAlert, CheckCircle, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NODES = [
  { id: 'R1', x: 60, y: 175, ip: '192.168.1.1' },
  { id: 'R2', x: 200, y: 60, ip: '10.0.0.1' },
  { id: 'R3', x: 200, y: 290, ip: '172.16.0.1' },
  { id: 'R4', x: 400, y: 110, ip: '10.0.1.1' },
  { id: 'R5', x: 400, y: 290, ip: '172.16.1.1' },
  { id: 'R6', x: 540, y: 175, ip: '192.168.2.1' },
];

const INITIAL_EDGES = [
  { id: 'e1', from: 'R1', to: 'R2', cost: 2, congested: false },
  { id: 'e2', from: 'R1', to: 'R3', cost: 4, congested: false },
  { id: 'e3', from: 'R2', to: 'R4', cost: 3, congested: false },
  { id: 'e4', from: 'R3', to: 'R4', cost: 1, congested: false },
  { id: 'e5', from: 'R3', to: 'R5', cost: 5, congested: false },
  { id: 'e6', from: 'R4', to: 'R6', cost: 2, congested: false },
  { id: 'e7', from: 'R5', to: 'R6', cost: 2, congested: false },
];

const PacketNavigatorGame = ({ onGameComplete, highScore = 0, autoStart = false }) => {
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'start'); // start, playing, gameover, paused
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [currentNode, setCurrentNode] = useState('R1');
  const [path, setPath] = useState(['R1']);
  const [destinationNode, setDestinationNode] = useState('R6');
  const [feedback, setFeedback] = useState(null);

  const [packetPos, setPacketPos] = useState({ x: 60, y: 175 });
  const [isAnimating, setIsAnimating] = useState(false);

  const timerRef = useRef(null);

  const initGame = () => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    startLevel(1);
  };

  useEffect(() => {
    if (autoStart) {
      initGame();
    }
  }, []);

  const startLevel = (lvl) => {
    setCurrentNode('R1');
    setPath(['R1']);
    setPacketPos({ x: NODES.find(n => n.id === 'R1').x, y: NODES.find(n => n.id === 'R1').y });
    setTimeLeft(Math.max(20, 60 - lvl * 5));
    setIsAnimating(false);
    
    // Randomize congestion based on level
    const newEdges = INITIAL_EDGES.map(edge => ({
      ...edge,
      cost: edge.cost + Math.floor(Math.random() * lvl),
      congested: Math.random() < (lvl * 0.1) // 10% chance per level
    }));
    
    // Ensure at least one congested edge if lvl > 1
    if (lvl > 1 && !newEdges.some(e => e.congested)) {
       newEdges[Math.floor(Math.random() * newEdges.length)].congested = true;
    }

    setEdges(newEdges);

    // Randomize destination (R4, R5, or R6)
    const dests = ['R4', 'R5', 'R6'];
    setDestinationNode(dests[Math.floor(Math.random() * dests.length)]);
  };

  // Timer loop
  useEffect(() => {
    if (gameState === 'playing' && !isAnimating) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleGameOver("Time's Up! The packet dropped.");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, isAnimating]);

  const showFeedback = (msg, type = 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleGameOver = (reason) => {
    setGameState('gameover');
    showFeedback(reason, 'error');
  };

  const calculateShortestPathCost = (start, end) => {
    const dist = {};
    const unvisited = new Set(NODES.map(n => n.id));
    
    NODES.forEach(n => dist[n.id] = Infinity);
    dist[start] = 0;

    while (unvisited.size > 0) {
      let u = null;
      for (let node of unvisited) {
        if (u === null || dist[node] < dist[u]) u = node;
      }
      if (dist[u] === Infinity) break;
      unvisited.delete(u);

      const neighbors = edges.filter(e => e.from === u || e.to === u);
      for (let edge of neighbors) {
        const v = edge.from === u ? edge.to : edge.from;
        if (unvisited.has(v)) {
          const alt = dist[u] + (edge.congested ? edge.cost * 3 : edge.cost);
          if (alt < dist[v]) {
            dist[v] = alt;
          }
        }
      }
    }
    return dist[end];
  };

  const handleNodeClick = (nodeId) => {
    if (gameState !== 'playing' || isAnimating) return;

    // Check if connected
    const connectedEdge = edges.find(e => 
      (e.from === currentNode && e.to === nodeId) || 
      (e.to === currentNode && e.from === nodeId)
    );

    if (!connectedEdge) {
      showFeedback('No direct link to that router!', 'error');
      return;
    }

    if (path.includes(nodeId)) {
      handleGameOver('Routing Loop Detected! Packet Dropped.');
      return;
    }

    // Animate packet
    const targetNode = NODES.find(n => n.id === nodeId);
    setIsAnimating(true);
    
    setPacketPos({ x: targetNode.x, y: targetNode.y });

    setTimeout(() => {
      setIsAnimating(false);
      setCurrentNode(nodeId);
      setPath(prev => [...prev, nodeId]);

      if (nodeId === destinationNode) {
        // Level complete
        const actualCost = calculateActualCost([...path, nodeId]);
        const optimalCost = calculateShortestPathCost('R1', destinationNode);
        
        let points = 50 + timeLeft;
        if (actualCost === optimalCost) {
          points += 50; // Optimal path bonus
          showFeedback('Packet Delivered! Optimal Route Used (+50 Bonus)', 'success');
        } else {
          showFeedback('Packet Delivered! But route was not optimal.', 'info');
        }
        
        setScore(s => s + points);
        setTimeout(() => {
          setLevel(l => l + 1);
          startLevel(level + 1);
        }, 2500);
      }
    }, 500); // Animation duration
  };

  const calculateActualCost = (currentPath) => {
    let total = 0;
    for (let i = 0; i < currentPath.length - 1; i++) {
      const edge = edges.find(e => 
        (e.from === currentPath[i] && e.to === currentPath[i+1]) || 
        (e.to === currentPath[i] && e.from === currentPath[i+1])
      );
      total += (edge.congested ? edge.cost * 3 : edge.cost);
    }
    return total;
  };

  const destObj = NODES.find(n => n.id === destinationNode);

  return (
    <div className="relative flex flex-col bg-slate-950 min-h-[600px] rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden select-none text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-10" />

      {/* Top Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-indigo-500/10 px-8 py-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Route size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-indigo-200">Packet Navigator</h2>
            <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-wider">
              Level {level} | Routing Challenge
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</span>
             <span className={`text-2xl font-black ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>{timeLeft}s</span>
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
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-rose-950/20 hover:text-rose-455 text-slate-400 rounded-xl transition-all hover:scale-105"
              title="Exit Game"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 flex flex-col p-6 bg-slate-950/20 relative">
         
         <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-indigo-550/10 shadow-lg flex items-center gap-4">
               <div>
                  <span className="text-xxs font-bold text-indigo-400 uppercase">Target IP Address</span>
                  <p className="text-base font-black text-slate-200">{destObj?.ip}</p>
               </div>
               <div className="h-8 w-px bg-slate-800"></div>
               <div>
                  <span className="text-xxs font-bold text-indigo-400 uppercase">Subnet Mask</span>
                  <p className="text-base font-black text-slate-200">255.255.255.0</p>
               </div>
            </div>
            
            <div className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-500/10 text-indigo-200/90 text-xs sm:text-sm font-medium flex items-center gap-2 max-w-md">
               <Info size={18} className="text-indigo-400 shrink-0" />
               <span>Analyze edge costs (weights). Select adjacent routers to build the lowest-cost path.</span>
            </div>
         </div>

         {/* SVG Graph Area (Fully Responsive Wrapper) */}
         <div className="flex-1 bg-slate-950/80 rounded-2xl shadow-2xl border border-indigo-500/10 relative overflow-hidden flex items-center justify-center p-4">
            
            <div className="w-full h-full max-h-[400px] flex items-center justify-center">
              <svg 
                viewBox="0 0 600 350" 
                className="w-full h-full max-w-[600px] max-h-[350px] overflow-visible"
              >
                 
                 {/* Links (Edges) */}
                 {edges.map(edge => {
                   const fromNode = NODES.find(n => n.id === edge.from);
                   const toNode = NODES.find(n => n.id === edge.to);
                   
                   const isPath = path.includes(edge.from) && path.includes(edge.to) && 
                                 Math.abs(path.indexOf(edge.from) - path.indexOf(edge.to)) === 1;

                   return (
                     <g key={edge.id}>
                       <line 
                         x1={fromNode.x} y1={fromNode.y} 
                         x2={toNode.x} y2={toNode.y} 
                         stroke={edge.congested ? "#f97316" : (isPath ? "#818cf8" : "#334155")} 
                         strokeWidth={isPath ? "6" : "3"}
                         className={`transition-all duration-300 ${edge.congested ? 'animate-pulse' : ''}`}
                       />
                       
                       {/* Cost Badge */}
                       <g transform={`translate(${(fromNode.x + toNode.x)/2 - 12}, ${(fromNode.y + toNode.y)/2 - 12})`}>
                         <rect 
                            width="24" height="24" rx="6" 
                            fill={edge.congested ? "#431407" : "#0f172a"}
                            stroke={edge.congested ? "#ea580c" : "#1e293b"}
                            strokeWidth="2"
                         />
                         <text 
                            x="12" y="16" 
                            textAnchor="middle" 
                            fontSize="11" 
                            fontWeight="bold"
                            className="font-mono"
                            fill={edge.congested ? "#f97316" : "#cbd5e1"}
                         >
                            {edge.congested ? edge.cost * 3 : edge.cost}
                         </text>
                       </g>
                     </g>
                   );
                 })}

                 {/* Nodes */}
                 {NODES.map(node => {
                   const isDest = node.id === destinationNode;
                   const isVisited = path.includes(node.id);
                   const isCurrent = currentNode === node.id;
                   
                   let circleColor = "#0f172a";
                   let strokeColor = "#1e293b";
                   
                   if (isDest) {
                     circleColor = "rgba(16,185,129,0.1)";
                     strokeColor = "#10b981";
                   } else if (isCurrent) {
                     circleColor = "rgba(99,102,241,0.2)";
                     strokeColor = "#6366f1";
                   } else if (isVisited) {
                     circleColor = "rgba(129,140,248,0.1)";
                     strokeColor = "#4f46e5";
                   }

                   return (
                     <g 
                       key={node.id} 
                       transform={`translate(${node.x}, ${node.y})`}
                       className={`cursor-pointer transition-transform duration-300 hover:scale-105`}
                       onClick={() => handleNodeClick(node.id)}
                     >
                       {isCurrent && (
                         <circle 
                           r="26" 
                           fill="none" 
                           stroke="#6366f1" 
                           strokeWidth="2" 
                           className="animate-ping opacity-30"
                         />
                       )}
                       <circle 
                         r="21" 
                         fill={circleColor} 
                         stroke={strokeColor} 
                         strokeWidth="3.5" 
                       />
                       <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#f1f5f9">{node.id}</text>
                       <text x="0" y="34" textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8" className="font-mono">{node.ip}</text>
                     </g>
                   );
                 })}

                 {/* Moving Packet (Framer Motion replacement logic or styled transform) */}
                 {(gameState === 'playing' || gameState === 'gameover') && (
                   <g 
                     className="transition-all ease-out duration-500"
                     style={{ transform: `translate(${packetPos.x}px, ${packetPos.y}px)` }}
                   >
                      <circle r="8" fill="#6366f1" className="animate-pulse" />
                      <circle r="4" fill="#a5b4fc" />
                   </g>
                 )}

              </svg>
            </div>

         </div>
      </div>

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative">
            <button
              onClick={() => onGameComplete(score)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-indigo-400">
              <Network size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">Packet Navigator</h2>
            <p className="text-slate-400 font-medium mb-8">Dijkstra Routing Challenge. Deliver the packets along the shortest path!</p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-950/60 p-4 rounded-xl border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Click adjacent routers to route the packet to the Target IP.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Avoid orange congested paths; their costs are multiplied by 3!</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <p>Avoid loop patterns. Revisiting a router drops the packet.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Routing
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-450">
              <ShieldAlert size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-100 mb-2">Link Failure</h2>
            <p className="text-slate-400 font-medium mb-8 text-sm">{feedback?.msg || 'Packet Dropped.'}</p>
            
            <div className="bg-slate-950 border border-indigo-950 rounded-xl p-6 mb-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-indigo-400">{score}</p>
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
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-fade-in ${feedback.type === 'error' ? 'bg-rose-600 border border-rose-500/25' : feedback.type === 'success' ? 'bg-emerald-600 border border-emerald-500/25' : 'bg-indigo-600 border border-indigo-500/25'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default PacketNavigatorGame;
