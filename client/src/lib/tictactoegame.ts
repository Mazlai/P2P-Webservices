// TicTacToe game logic utilities

export type Player = "X" | "O";
export type Cell = Player | null;
export type GameStatus = "pending" | "active" | "finished";
export type GameResult = "draw" | "x-wins" | "o-wins" | null;

export interface GameBoard {
  cells: Cell[];
  currentPlayer: Player;
  winner: GameResult;
  status: GameStatus;
}

export const createEmptyBoard = (): GameBoard => ({
  cells: Array(9).fill(null),
  currentPlayer: "X",
  winner: null,
  status: "pending",
});

/**
 * Check if there's a winner
 */
export const checkWinner = (cells: Cell[]): GameResult => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a] === "X" ? "x-wins" : "o-wins";
    }
  }

  // Check for draw
  if (cells.every((cell) => cell !== null)) {
    return "draw";
  }

  return null;
};

/**
 * Make a move on the board
 */
export const makeMove = (
  board: GameBoard,
  cellIndex: number,
  player: Player
): GameBoard => {
  // Validate move
  if (cellIndex < 0 || cellIndex > 8 || board.cells[cellIndex] !== null) {
    return board;
  }

  if (board.currentPlayer !== player) {
    return board;
  }

  const newCells = [...board.cells];
  newCells[cellIndex] = player;

  const winner = checkWinner(newCells);

  return {
    cells: newCells,
    currentPlayer: player === "X" ? "O" : "X",
    winner,
    status: winner !== null ? "finished" : "active",
  };
};

/**
 * Reset the board
 */
export const resetBoard = (): GameBoard => {
  return {
    ...createEmptyBoard(),
    status: "pending",
  };
};

/**
 * Check if the board is full
 */
export const isBoardFull = (cells: Cell[]): boolean => {
  return cells.every((cell) => cell !== null);
};

/**
 * Get game status message
 */
export const getGameStatusMessage = (board: GameBoard): string => {
  if (board.status === "pending") {
    return "Game not started";
  }

  if (board.winner === "x-wins") {
    return "X wins!";
  }

  if (board.winner === "o-wins") {
    return "O wins!";
  }

  if (board.winner === "draw") {
    return "Draw!";
  }

  return `${board.currentPlayer}'s turn`;
};
