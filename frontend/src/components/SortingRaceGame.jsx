import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Trophy, Target, Zap, Clock, BarChart3, Info, X } from 'lucide-react';

const SortingRaceGame = ({ onGameComplete, algorithm = 'bubble', highScore = 0 }) => {
  const [gameState, setGameState] = useState('start'); // start, playing, paused, completed, failed
  const [playerProgress, setPlayerProgress] = useState(0);
  const [aiProgress, setAiProgress] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [playerSwaps, setPlayerSwaps] = useState(0);
  const [aiOperations, setAiOperations] = useState(0);
  const [time, setTime] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const aiStepRef = useRef(0);
  const aiArrayRef = useRef([]);

  // Generate random array based on level
  const generateArray = useCallback((level) => {
    const sizes = { 1: 5, 2: 6, 3: 8, 4: 10, 5: 12, 6: 15 };
    const size = sizes[level] || 15;
    const newArray = [];
    for (let i = 0; i < size; i++) {
      newArray.push(Math.floor(Math.random() * 20) + 1);
    }
    return newArray;
  }, []);

  // Generate initial array based on level
  const initialArray = useMemo(() => generateArray(1), [generateArray]);

  // Initialize game state based on level
  const [array, setArray] = useState(() => [...initialArray]);
  const [aiAlgorithm, setAiAlgorithm] = useState(algorithm);

  // Sorting algorithms
  const bubbleSort = (arr) => {
    const steps = [];
    const array = [...arr];
    for (let i = 0; i < array.length - 1; i++) {
      for (let j = 0; j < array.length - i - 1; j++) {
        steps.push({ type: 'compare', indices: [j, j + 1] });
        if (array[j] > array[j + 1]) {
          [array[j], array[j + 1]] = [array[j + 1], array[j]];
          steps.push({ type: 'swap', indices: [j, j + 1], array: [...array] });
        }
      }
    }
    return steps;
  };

  const selectionSort = (arr) => {
    const steps = [];
    const array = [...arr];
    for (let i = 0; i < array.length - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < array.length; j++) {
        steps.push({ type: 'compare', indices: [minIdx, j] });
        if (array[j] < array[minIdx]) {
          minIdx = j;
        }
      }
      if (minIdx !== i) {
        [array[i], array[minIdx]] = [array[minIdx], array[i]];
        steps.push({ type: 'swap', indices: [i, minIdx], array: [...array] });
      }
    }
    return steps;
  };

  const insertionSort = (arr) => {
    const steps = [];
    const array = [...arr];
    for (let i = 1; i < array.length; i++) {
      let key = array[i];
      let j = i - 1;
      while (j >= 0 && array[j] > key) {
        steps.push({ type: 'compare', indices: [j, j + 1] });
        array[j + 1] = array[j];
        j--;
      }
      array[j + 1] = key;
      steps.push({ type: 'insert', indices: [j + 1, i], array: [...array] });
    }
    return steps;
  };

  const quickSort = (arr) => {
    const steps = [];
    const array = [...arr];

    const partition = (low, high) => {
      const pivot = array[high];
      let i = low - 1;

      for (let j = low; j < high; j++) {
        steps.push({ type: 'compare', indices: [j, high] });
        if (array[j] < pivot) {
          i++;
          [array[i], array[j]] = [array[j], array[i]];
          steps.push({ type: 'swap', indices: [i, j], array: [...array] });
        }
      }
      [array[i + 1], array[high]] = [array[high], array[i + 1]];
      steps.push({ type: 'swap', indices: [i + 1, high], array: [...array] });
      return i + 1;
    };

    const quickSortHelper = (low, high) => {
      if (low < high) {
        const pi = partition(low, high);
        quickSortHelper(low, pi - 1);
        quickSortHelper(pi + 1, high);
      }
    };

    quickSortHelper(0, array.length - 1);
    return steps;
  };

  // Get AI algorithm steps
  const getAISteps = useCallback((algorithm, arr) => {
    switch (algorithm) {
      case 'bubble': return bubbleSort(arr);
      case 'selection': return selectionSort(arr);
      case 'insertion': return insertionSort(arr);
      case 'quick': return quickSort(arr);
      default: return bubbleSort(arr);
    }
  }, []);

  // Check if array is sorted
  const isSorted = (arr) => {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] > arr[i + 1]) return false;
    }
    return true;
  };

  // Handle bar click
  const handleBarClick = (index) => {
    if (gameState !== 'playing') return;

    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else if (prev.length < 2) {
        return [...prev, index];
      } else {
        return [prev[1], index];
      }
    });
  };

  // Perform swap
  const performSwap = () => {
    if (selectedIndices.length !== 2) return;

    const [i, j] = selectedIndices;
    const newArray = [...array];
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];

    setArray(newArray);
    setPlayerSwaps(prev => prev + 1);
    setSelectedIndices([]);

    // Calculate progress based on how sorted the array is
    const sortedness = calculateSortedness(newArray);
    setPlayerProgress(sortedness);

    // Check if player won
    if (isSorted(newArray)) {
      setGameState('completed');
      const efficiency = Math.max(0, 100 - (playerSwaps - optimalSwaps(array.length)) * 5);
      const timeBonus = Math.max(0, 100 - time * 2);
      const finalScore = Math.floor(efficiency + timeBonus + level * 10);
      setScore(finalScore);
      onGameComplete?.(finalScore);
    }
  };

  // Calculate how sorted an array is (0-100)
  const calculateSortedness = (arr) => {
    let correct = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] <= arr[i + 1]) correct++;
    }
    return (correct / (arr.length - 1)) * 100;
  };

  // Calculate optimal number of swaps for bubble sort
  const optimalSwaps = (n) => {
    return n * (n - 1) / 4; // Average case for bubble sort
  };

  // Get hint for next optimal swap
  const getHint = () => {
    for (let i = 0; i < array.length - 1; i++) {
      if (array[i] > array[i + 1]) {
        setFeedback({ type: 'hint', message: `Try swapping elements ${i + 1} and ${i + 2}` });
        setTimeout(() => setFeedback(null), 3000);
        return;
      }
    }
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = (currentTime) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      setTime(prev => prev + deltaTime / 1000);

      // AI progress
      const aiSteps = getAISteps(aiAlgorithm, aiArrayRef.current);
      if (aiStepRef.current < aiSteps.length) {
        const step = aiSteps[aiStepRef.current];
        if (step.type === 'swap' || step.type === 'insert') {
          aiArrayRef.current = step.array;
          setAiOperations(prev => prev + 1);
          setAiProgress((aiStepRef.current / aiSteps.length) * 100);
        }
        aiStepRef.current++;

        // Check if AI won
        if (isSorted(aiArrayRef.current)) {
          setGameState('failed');
          setFeedback({ type: 'loss', message: 'AI finished first! Try to be more efficient.' });
        }
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, aiAlgorithm, getAISteps]);

  const startGame = () => {
    const newArray = generateArray(level);
    setArray([...newArray]);
    aiArrayRef.current = [...newArray];
    setPlayerProgress(0);
    setAiProgress(0);
    setPlayerSwaps(0);
    setAiOperations(0);
    setTime(0);
    setSelectedIndices([]);
    aiStepRef.current = 0;
    setFeedback(null);
    setGameState('playing');
  };

  const pauseGame = () => {
    setGameState(gameState === 'playing' ? 'paused' : 'playing');
  };

  const resetGame = () => {
    setGameState('start');
    setLevel(1);
    const newArray = generateArray(1);
    setArray([...newArray]);
    aiArrayRef.current = [...newArray];
    setPlayerProgress(0);
    setAiProgress(0);
    setPlayerSwaps(0);
    setAiOperations(0);
    setTime(0);
    setSelectedIndices([]);
    aiStepRef.current = 0;
    setFeedback(null);
    setAiAlgorithm('bubble');
  };

  const nextLevel = () => {
    const newLevel = level + 1;
    setLevel(newLevel);
    const algorithms = ['bubble', 'selection', 'insertion', 'quick'];
    setAiAlgorithm(algorithms[Math.min(newLevel - 1, algorithms.length - 1)]);
    setGameState('start');
    const newArray = generateArray(newLevel);
    setArray([...newArray]);
    aiArrayRef.current = [...newArray];
    setPlayerProgress(0);
    setAiProgress(0);
    setPlayerSwaps(0);
    setAiOperations(0);
    setTime(0);
    setSelectedIndices([]);
    aiStepRef.current = 0;
    setFeedback(null);
  };

  const renderBars = () => {
    const maxValue = Math.max(...array);
    return array.map((value, index) => {
      const height = (value / maxValue) * 200;
      const isSelected = selectedIndices.includes(index);
      return (
        <div
          key={index}
          className={`relative cursor-pointer transition-all duration-200 ${
            isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          }`}
          onClick={() => handleBarClick(index)}
        >
          <div
            className="w-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t flex items-end justify-center text-white text-xs font-bold transition-all duration-300 hover:from-blue-700 hover:to-blue-500"
            style={{ height: `${height}px`, minHeight: '20px' }}
          >
            {value}
          </div>
          <div className="text-xs text-center mt-1">{index + 1}</div>
        </div>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Sorting Race</h2>
            <p className="text-gray-600">Level {level} • {aiAlgorithm.charAt(0).toUpperCase() + aiAlgorithm.slice(1)} Sort</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">High Score</div>
            <div className="text-lg font-bold text-gray-800">{highScore}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Current Score</div>
            <div className="text-lg font-bold text-blue-600">{score}</div>
          </div>
        </div>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-gray-600" />
          <div className="text-sm text-gray-600">Time</div>
          <div className="text-lg font-bold">{time.toFixed(1)}s</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-blue-600" />
          <div className="text-sm text-gray-600">Your Swaps</div>
          <div className="text-lg font-bold text-blue-600">{playerSwaps}</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-red-600" />
          <div className="text-sm text-gray-600">AI Operations</div>
          <div className="text-lg font-bold text-red-600">{aiOperations}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-1 text-green-600" />
          <div className="text-sm text-gray-600">Progress</div>
          <div className="text-lg font-bold text-green-600">{Math.round(playerProgress)}%</div>
        </div>
      </div>

      {/* Race Track */}
      <div className="relative mb-6 bg-gray-100 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="font-semibold text-blue-700">You</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="font-semibold text-red-700">AI ({aiAlgorithm})</span>
          </div>
        </div>

        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
            style={{ width: `${playerProgress}%` }}
          ></div>
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300 rounded-full"
            style={{ width: `${aiProgress}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>Start</span>
          <span>Finish</span>
        </div>
      </div>

      {/* Array Visualization */}
      <div className="mb-6">
        <div className="flex items-end justify-center gap-2 mb-4 min-h-[220px]">
          {renderBars()}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {gameState === 'start' && (
          <button
            onClick={startGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start Race
          </button>
        )}

        {gameState === 'playing' && (
          <>
            <button
              onClick={pauseGame}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
            <button
              onClick={performSwap}
              disabled={selectedIndices.length !== 2}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Swap Selected
            </button>
            <button
              onClick={getHint}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              Hint
            </button>
          </>
        )}

        {gameState === 'paused' && (
          <button
            onClick={pauseGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Resume
          </button>
        )}

        {(gameState === 'completed' || gameState === 'failed') && (
          <>
            <button
              onClick={gameState === 'completed' ? nextLevel : resetGame}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {gameState === 'completed' ? 'Next Level' : 'Try Again'}
            </button>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          feedback.type === 'hint' ? 'bg-blue-50 text-blue-800' :
          feedback.type === 'loss' ? 'bg-red-50 text-red-800' :
          'bg-green-50 text-green-800'
        }`}>
          {feedback.type === 'hint' && <Info className="w-5 h-5" />}
          {feedback.type === 'loss' && <X className="w-5 h-5" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">How to Play:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Click on bars to select them (select 2 to swap)</li>
          <li>• Race against the AI to sort the array first</li>
          <li>• More efficient sorting = higher score</li>
          <li>• Use hints if you get stuck</li>
        </ul>
      </div>
    </div>
  );
};

export default SortingRaceGame;