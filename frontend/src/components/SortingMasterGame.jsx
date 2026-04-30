import React, { useState, useEffect } from 'react';

const SortingMasterGame = ({ onGameComplete }) => {
  const [numbers, setNumbers] = useState([]);
  const [score, setScore] = useState(0);
  const [sorted, setSorted] = useState(false);

  useEffect(() => {
    generateNumbers();
  }, []);

  const generateNumbers = () => {
    const nums = [];
    for (let i = 0; i < 10; i++) {
      nums.push(Math.floor(Math.random() * 100));
    }
    setNumbers(nums);
  };

  const swap = (i, j) => {
    const newNumbers = [...numbers];
    [newNumbers[i], newNumbers[j]] = [newNumbers[j], newNumbers[i]];
    setNumbers(newNumbers);
  };

  const checkSorted = () => {
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    if (JSON.stringify(numbers) === JSON.stringify(sortedNumbers)) {
      setScore(score + 1);
      setSorted(true);
      setTimeout(() => {
        generateNumbers();
        setSorted(false);
      }, 1000);
    }
  };

  const handleGameComplete = () => {
    onGameComplete(score);
  };

  return (
    <div className="min-h-[600px] w-full flex flex-col items-center justify-center relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in">
      <h1 className="text-3xl font-bold mb-4">Sorting Master Game</h1>
      <div className="flex flex-wrap justify-center mb-4">
        {numbers.map((num, i) => (
          <div
            key={i}
            className="bg-gray-200 p-4 m-2 border border-gray-400 rounded-lg cursor-pointer"
          >
            {num}
          </div>
        ))}
      </div>
      <div className="flex justify-center mb-4">
        {numbers.map((num, i) => (
          <button
            key={i}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mx-2"
            onClick={() => swap(i, (i + 1) % numbers.length)}
          >
            Swap with next
          </button>
        ))}
      </div>
      <button
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
        onClick={checkSorted}
      >
        Check if sorted
      </button>
      {sorted && <p className="text-2xl font-bold mb-4">Correct! 🎉</p>}
      <p className="text-2xl font-bold mb-4">Score: {score}</p>
      <button
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleGameComplete}
      >
        Game Complete
      </button>
    </div>
  );
};

export default SortingMasterGame;