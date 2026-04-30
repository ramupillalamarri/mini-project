import React, { useState, useEffect } from 'react';
import { FiPlus, FiMinus } from 'lucide-react';

const StackAttackGame = ({ onGameComplete }) => {
  const [stack, setStack] = useState([]);
  const [enemy, setEnemy] = useState(null);
  const [expression, setExpression] = useState('');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    startGame();
  }, []);

  const startGame = () => {
    setEnemy(generateEnemy());
    setExpression(generateExpression());
    setStack([]);
    setScore(0);
    setGameOver(false);
  };

  const generateEnemy = () => {
    const enemies = [
      { name: 'Goblin', health: 10 },
      { name: 'Orc', health: 20 },
      { name: 'Troll', health: 30 },
    ];
    return enemies[Math.floor(Math.random() * enemies.length)];
  };

  const generateExpression = () => {
    const operators = ['+', '-', '*', '/'];
    const numbers = [1, 2, 3, 4, 5];
    const expression = `${numbers[Math.floor(Math.random() * numbers.length)]} ${numbers[Math.floor(Math.random() * numbers.length)]} ${operators[Math.floor(Math.random() * operators.length)]}`;
    return expression;
  };

  const pushItem = (item) => {
    setStack([...stack, item]);
  };

  const popItem = () => {
    if (stack.length > 0) {
      const item = stack[stack.length - 1];
      setStack(stack.slice(0, -1));
      return item;
    }
    return null;
  };

  const evaluateExpression = () => {
    const tokens = expression.split(' ');
    const stack = [];
    for (const token of tokens) {
      if (!isNaN(token)) {
        stack.push(parseInt(token));
      } else {
        const b = stack.pop();
        const a = stack.pop();
        let result;
        switch (token) {
          case '+':
            result = a + b;
            break;
          case '-':
            result = a - b;
            break;
          case '*':
            result = a * b;
            break;
          case '/':
            result = a / b;
            break;
          default:
            break;
        }
        stack.push(result);
      }
    }
    return stack[0];
  };

  const attackEnemy = () => {
    const item = popItem();
    if (item) {
      if (enemy.health > 0) {
        enemy.health -= item;
        setEnemy({ ...enemy });
        setScore(score + 1);
      } else {
        setGameOver(true);
        onGameComplete(score);
      }
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === ' ') {
      attackEnemy();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      {gameOver ? (
        <div className="text-3xl font-bold">Game Over! Your score: {score}</div>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <div className="text-3xl font-bold mb-4">Level {level}</div>
          <div className="text-2xl font-bold mb-4">Enemy: {enemy?.name} ({enemy?.health} HP)</div>
          <div className="text-2xl font-bold mb-4">Expression: {expression}</div>
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="text-2xl font-bold">Stack:</div>
            <div className="flex flex-col items-center justify-center">
              {stack.map((item, index) => (
                <div key={index} className="bg-gray-200 p-2 mb-2">{item}</div>
              ))}
            </div>
          </div>
          <div className="flex flex-row items-center justify-center mb-4">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => pushItem(5)}
            >
              Push 5
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mx-4"
              onClick={() => pushItem(3)}
            >
              Push 3
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={attackEnemy}
            >
              Attack
            </button>
          </div>
          <div className="text-2xl font-bold mb-4">Score: {score}</div>
        </div>
      )}
    </div>
  );
};

export default StackAttackGame;