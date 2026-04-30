import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RefreshCw, Network, Route, ShieldAlert, CheckCircle, Activity, Info } from 'lucide-react';

const NODES = [
  { id: 'R1', x: 50, y: 150, ip: '192.168.1.1' },
  { id: 'R2', x: 200, y: 50, ip: '10.0.0.1' },
  { id: 'R3', x: 200, y: 250, ip: '172.16.0.1' },
  { id: 'R4', x: 400, y: 100, ip: '10.0.1.1' },
  { id: 'R5', x: 400, y: 250, ip: '172.16.1.1' },
  { id: 'R6', x: 550, y: 150, ip: '192.168.2.1' },
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

const PacketNavigatorGame = ({ onGameComplete, highScore = 0 }) => {
  const [gameState, setGameState] = useState('start'); // start, playing, gameover
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [currentNode, setCurrentNode] = useState('R1');
  const [path, setPath] = useState(['R1']);
  const [destinationNode, setDestinationNode] = useState('R6');
  const [feedback, setFeedback] = useState(null);

  const [packetPos, setPacketPos] = useState({ x: 50, y: 150 });
  const [isAnimating, setIsAnimating] = useState(false);

  const timerRef = useRef(null);

  const initGame = () => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    startLevel(1);
  };

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
    
    // Ensure at least one congested edge for visual if lvl > 1
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
    // Basic Dijkstra to verify if player took the optimal path
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
          const alt = dist[u] + (edge.congested ? edge.cost * 3 : edge.cost); // Penalty for congestion
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
    
    // Simple CSS transition handling via state
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
    <div className="relative flex flex-col bg-slate-50 min-h-[600px] rounded-3xl shadow-xl border border-slate-200 overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <Route size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Packet Navigator</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Level {level} | Routing Challenge
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</span>
             <span className={`text-2xl font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>{timeLeft}s</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
            <span className="text-2xl font-black text-violet-600">{score}</span>
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
      <div className="flex-1 flex flex-col p-6 bg-slate-100 relative">
         
         <div className="flex justify-between items-center mb-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
               <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Target IP</span>
                  <p className="text-lg font-black text-slate-800">{destObj?.ip}</p>
               </div>
               <div className="h-8 w-px bg-slate-200"></div>
               <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Subnet</span>
                  <p className="text-lg font-black text-slate-800">255.255.255.0</p>
               </div>
            </div>
            
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-indigo-800 text-sm font-medium flex items-center gap-2">
               <Info size={18} />
               Click adjacent routers to route the packet. Avoid loops and congestion!
            </div>
         </div>

         {/* SVG Graph Area */}
         <div className="flex-1 bg-white rounded-2xl shadow-inner border-2 border-slate-200 relative overflow-hidden flex items-center justify-center">
            
            <svg width="600" height="350" viewBox="0 0 600 350" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 overflow-visible">
               
               {/* Edges */}
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
                       stroke={edge.congested ? "#f97316" : (isPath ? "#6366f1" : "#cbd5e1")} 
                       strokeWidth={isPath ? "6" : "3"}
                       className={`transition-all duration-300 ${edge.congested ? 'animate-pulse' : ''}`}
                     />
                     {/* Cost Badge */}
                     <rect 
                        x={(fromNode.x + toNode.x)/2 - 12} 
                        y={(fromNode.y + toNode.y)/2 - 12} 
                        width="24" height="24" rx="4" 
                        fill={edge.congested ? "#ffedd5" : "white"}
                        stroke={edge.congested ? "#f97316" : "#cbd5e1"}
                        strokeWidth="2"
                     />
                     <text 
                        x={(fromNode.x + toNode.x)/2} 
                        y={(fromNode.y + toNode.y)/2 + 4} 
                        textAnchor="middle" 
                        fontSize="12" 
                        fontWeight="bold"
                        fill={edge.congested ? "#c2410c" : "#64748b"}
                     >
                        {edge.congested ? edge.cost * 3 : edge.cost}
                     </text>
                   </g>
                 );
               })}

               {/* Nodes */}
               {NODES.map(node => (
                 <g 
                   key={node.id} 
                   transform={`translate(${node.x}, ${node.y})`}
                   className={`cursor-pointer transition-transform hover:scale-110 ${currentNode === node.id ? 'scale-110' : ''}`}
                   onClick={() => handleNodeClick(node.id)}
                 >
                   <circle 
                     r="22" 
                     fill={node.id === destinationNode ? "#dcfce7" : (path.includes(node.id) ? "#e0e7ff" : "white")} 
                     stroke={node.id === destinationNode ? "#22c55e" : (currentNode === node.id ? "#4f46e5" : "#94a3b8")} 
                     strokeWidth="4" 
                   />
                   <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{node.id}</text>
                   <text x="0" y="38" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">{node.ip}</text>
                 </g>
               ))}

               {/* Moving Packet */}
               {(gameState === 'playing' || gameState === 'gameover') && (
                 <g 
                   className="transition-all ease-in-out duration-500"
                   style={{ transform: `translate(${packetPos.x}px, ${packetPos.y}px)` }}
                 >
                    <rect x="-12" y="-12" width="24" height="24" rx="4" fill="#4f46e5" shadow="lg" />
                    <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">PKT</text>
                 </g>
               )}

            </svg>

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
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Network size={40} className="text-indigo-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Packet Navigator</h2>
            <p className="text-slate-500 font-medium mb-8">Act as the Routing Protocol. Deliver the packet to its destination!</p>
            
            <div className="space-y-3 mb-8 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Click adjacent routers to move the packet forward.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Avoid <b>orange congested links</b>; they cost extra time!</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">Never revisit a router. Routing loops will drop the packet.</p>
              </div>
            </div>

            <button 
              onClick={initGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(67,56,202)] hover:shadow-[0_4px_0_rgb(67,56,202)] hover:translate-y-1 transition-all text-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Routing
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldAlert size={40} className="text-rose-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Transmission Failed</h2>
            <p className="text-slate-500 font-medium mb-8 text-sm">{feedback?.msg || 'Packet Dropped.'}</p>
            
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-indigo-600">{score}</p>
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
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-[0_8px_0_rgb(67,56,202)] hover:shadow-[0_4px_0_rgb(67,56,202)] hover:translate-y-1 transition-all"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Feedback Toast */}
      {feedback && gameState === 'playing' && (
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-lg text-white z-40 animate-in fade-in slide-in-from-top-4 ${feedback.type === 'error' ? 'bg-rose-500' : feedback.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
          {feedback.msg}
        </div>
      )}

    </div>
  );
};

export default PacketNavigatorGame;
