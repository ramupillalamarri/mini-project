import React, { useState, useEffect } from 'react';

const TreeClimberGame = ({ onGameComplete }) => {
  // Game state
  const [tree, setTree] = useState({ value: null, left: null, right: null });
  const [fallingNode, setFallingNode] = useState(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameMode, setGameMode] = useState('climb');
  const [practiceMode, setPracticeMode] = useState(false);

  // Node insertion logic
  const insertNode = (node, tree) => {
    if (tree.value === null) {
      return { value: node, left: null, right: null };
    }

    if (node < tree.value) {
      return { value: tree.value, left: insertNode(node, tree.left), right: tree.right };
    } else {
      return { value: tree.value, left: tree.left, right: insertNode(node, tree.right) };
    }
  };

  // AVL tree balancing logic
  const balanceTree = (tree) => {
    const height = (tree) => {
      if (tree === null) return 0;
      return 1 + Math.max(height(tree.left), height(tree.right));
    };

    const balanceFactor = (tree) => {
      if (tree === null) return 0;
      return height(tree.left) - height(tree.right);
    };

    if (balanceFactor(tree) > 1) {
      if (balanceFactor(tree.left) < 0) {
        // Left-Right rotation
        return {
          value: tree.left.value,
          left: {
            value: tree.left.left.value,
            left: tree.left.left.left,
            right: tree.left.left.right,
          },
          right: {
            value: tree.value,
            left: tree.left.right,
            right: tree.right,
          },
        };
      } else {
        // Left rotation
        return {
          value: tree.left.value,
          left: tree.left.left,
          right: {
            value: tree.value,
            left: tree.left.right,
            right: tree.right,
          },
        };
      }
    } else if (balanceFactor(tree) < -1) {
      if (balanceFactor(tree.right) > 0) {
        // Right-Left rotation
        return {
          value: tree.right.value,
          left: {
            value: tree.value,
            left: tree.left,
            right: tree.right.left,
          },
          right: {
            value: tree.right.right.value,
            left: tree.right.right.left,
            right: tree.right.right.right,
          },
        };
      } else {
        // Right rotation
        return {
          value: tree.right.value,
          left: {
            value: tree.value,
            left: tree.left,
            right: tree.right.left,
          },
          right: tree.right.right,
        };
      }
    }

    return tree;
  };

  // Red-Black tree logic
  const recolorTree = (tree) => {
    if (tree === null) return null;

    if (tree.left !== null && tree.left.color === 'red' && tree.right !== null && tree.right.color === 'red') {
      // Recolor nodes
      return {
        value: tree.value,
        left: { value: tree.left.value, color: 'black', left: tree.left.left, right: tree.left.right },
        right: { value: tree.right.value, color: 'black', left: tree.right.left, right: tree.right.right },
      };
    }

    return tree;
  };

  // Game loop
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (fallingNode === null) {
        setFallingNode(Math.floor(Math.random() * 100));
      }

      if (gameMode === 'climb' && level >= 7) {
        // AVL tree balancing
        setTree(balanceTree(tree));
      } else if (gameMode === 'climb' && level >= 10) {
        // Red-Black tree logic
        setTree(recolorTree(tree));
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [fallingNode, tree, gameMode, level]);

  // Handle node insertion
  const handleInsertNode = (node) => {
    if (tree.value === null) {
      setTree({ value: node, left: null, right: null });
    } else {
      setTree(insertNode(node, tree));
    }

    setFallingNode(null);
    setScore(score + 1);
  };

  // Handle incorrect insertion
  const handleIncorrectInsertion = () => {
    setLives(lives - 1);
    setFallingNode(null);
  };

  // Handle game completion
  const handleGameComplete = () => {
    onGameComplete(score);
  };

  // Render tree
  const renderTree = (tree) => {
    if (tree === null) return null;

    return (
      <div className="flex flex-col items-center">
        <div className="bg-gray-200 p-2 rounded">{tree.value}</div>
        <div className="flex justify-around w-full">
          {renderTree(tree.left)}
          {renderTree(tree.right)}
        </div>
      </div>
    );
  };

  // Render falling node
  const renderFallingNode = () => {
    if (fallingNode === null) return null;

    return (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-200 p-2 rounded">
        {fallingNode}
      </div>
    );
  };

  // Render game UI
  return (
    <div className="min-h-[600px] w-full flex flex-col items-center justify-center relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in">
      {renderTree(tree)}
      {renderFallingNode()}
      <div className="flex justify-around w-full mt-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => handleInsertNode(fallingNode)}
        >
          Insert Node
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleIncorrectInsertion}
        >
          Incorrect Insertion
        </button>
      </div>
      <div className="flex justify-around w-full mt-4">
        <div className="text-lg font-bold">Score: {score}</div>
        <div className="text-lg font-bold">Lives: {lives}</div>
        <div className="text-lg font-bold">Level: {level}</div>
      </div>
      {lives === 0 && (
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4"
          onClick={handleGameComplete}
        >
          Game Over! Submit Score
        </button>
      )}
    </div>
  );
};

export default TreeClimberGame;