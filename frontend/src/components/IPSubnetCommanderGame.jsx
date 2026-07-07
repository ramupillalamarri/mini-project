import React, { useState, useEffect } from 'react';
import { Award, Check, AlertTriangle, ArrowRight, RotateCcw, Play, Pause, X } from 'lucide-react';

const IPSubnetCommanderGame = ({ onGameComplete }) => {
  const [score, setScore] = useState(0);
  const [movesRemaining, setMovesRemaining] = useState(10);
  const [isPaused, setIsPaused] = useState(false);
  const [packets, setPackets] = useState([]);
  const [gateA, setGateA] = useState('192.168.1.0/24');
  const [gateB, setGateB] = useState('10.0.0.0/8');
  const [currentPacket, setCurrentPacket] = useState(null);
  const [levelComplete, setLevelComplete] = useState(false);

  useEffect(() => {
    generatePackets();
  }, []);

  const generatePackets = () => {
    const newPackets = [];
    for (let i = 0; i < 5; i++) {
      const packet = {
        id: i,
        destination: getRandomIP(),
      };
      newPackets.push(packet);
    }
    setPackets(newPackets);
  };

  const getRandomIP = () => {
    const ipParts = [];
    for (let i = 0; i < 4; i++) {
      ipParts.push(Math.floor(Math.random() * 256));
    }
    return ipParts.join('.');
  };

  const inspectPacket = (packet) => {
    setCurrentPacket(packet);
  };

  const routePacket = (gate) => {
    if (currentPacket) {
      const packetDestination = currentPacket.destination;
      const gatePrefix = gate.split('/')[0];
      const gateCidr = parseInt(gate.split('/')[1]);
      const packetParts = packetDestination.split('.');
      const gateParts = gatePrefix.split('.');
      let match = true;
      for (let i = 0; i < gateCidr / 8; i++) {
        if (packetParts[i] !== gateParts[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        setScore(score + 10);
        setPackets(packets.filter((packet) => packet.id !== currentPacket.id));
        setCurrentPacket(null);
      } else {
        setMovesRemaining(movesRemaining - 1);
        setCurrentPacket(null);
      }
      if (packets.length - 1 === 0) {
        setLevelComplete(true);
      }
    }
  };

  const restartGame = () => {
    setScore(0);
    setMovesRemaining(10);
    setIsPaused(false);
    setPackets([]);
    setGateA('192.168.1.0/24');
    setGateB('10.0.0.0/8');
    setCurrentPacket(null);
    setLevelComplete(false);
    generatePackets();
  };

  const pauseGame = () => {
    setIsPaused(!isPaused);
  };

  const exitGame = () => {
    onGameComplete(score);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-emerald-500 flex flex-col">
      <header className="flex justify-between items-center p-4 border-b border-emerald-500">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-2">IP Subnet Commander</h1>
          <h2 className="text-lg font-bold">Level 1</h2>
        </div>
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <Award className="mr-2" size={20} />
            <span>Score: {score}</span>
          </div>
          <div className="flex items-center mr-4">
            <ArrowRight className="mr-2" size={20} />
            <span>Moves Remaining: {movesRemaining}</span>
          </div>
          <button
            className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded mr-2"
            onClick={exitGame}
          >
            <X size={20} className="mr-2" />
            Exit
          </button>
          <button
            className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded mr-2"
            onClick={pauseGame}
          >
            {isPaused ? <Play size={20} className="mr-2" /> : <Pause size={20} className="mr-2" />}
            {isPaused ? 'Play' : 'Pause'}
          </button>
          <button
            className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
            onClick={restartGame}
          >
            <RotateCcw size={20} className="mr-2" />
            Restart
          </button>
        </div>
      </header>
      <main className="flex-1 flex justify-center items-center">
        {isPaused && (
          <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center">
            <h1 className="text-2xl font-bold">Game Paused</h1>
          </div>
        )}
        <div className="flex justify-center items-center w-full h-full">
          <div className="flex-1 h-full overflow-y-auto">
            {packets.map((packet) => (
              <div
                key={packet.id}
                className="bg-slate-900 p-4 mb-4 cursor-pointer"
                onClick={() => inspectPacket(packet)}
              >
                <h2 className="text-lg font-bold">Packet {packet.id + 1}</h2>
                <p>Destination: {packet.destination}</p>
              </div>
            ))}
          </div>
          <div className="flex-1 h-full flex flex-col justify-center items-center">
            <h1 className="text-2xl font-bold mb-4">Routing Gates</h1>
            <div className="flex justify-center items-center mb-4">
              <div className="bg-slate-900 p-4 mr-4">
                <h2 className="text-lg font-bold">Gate A</h2>
                <p>{gateA}</p>
              </div>
              <div className="bg-slate-900 p-4">
                <h2 className="text-lg font-bold">Gate B</h2>
                <p>{gateB}</p>
              </div>
            </div>
            {currentPacket && (
              <div className="flex justify-center items-center">
                <button
                  className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded mr-4"
                  onClick={() => routePacket(gateA)}
                >
                  Route to Gate A
                </button>
                <button
                  className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
                  onClick={() => routePacket(gateB)}
                >
                  Route to Gate B
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 h-full flex flex-col justify-center items-center">
            <h1 className="text-2xl font-bold mb-4">Actions</h1>
            {currentPacket && (
              <div className="flex justify-center items-center">
                <button
                  className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
                  onClick={() => inspectPacket(currentPacket)}
                >
                  Inspect Packet
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      {levelComplete && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-slate-900 p-4 flex flex-col justify-center items-center">
            <h1 className="text-2xl font-bold mb-4">Level Complete!</h1>
            <p>Score: {score}</p>
            <div className="flex justify-center items-center">
              <button
                className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded mr-4"
                onClick={restartGame}
              >
                Try Again
              </button>
              <button
                className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
                onClick={exitGame}
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

export default IPSubnetCommanderGame;