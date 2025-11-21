import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import type { GameSession } from "../store/useStore";
import {
  sendGameMove,
  endGameSession as endGameSessionAPI,
  sendGameInvite as sendGameInviteAPI,
  acceptGameInvite as acceptGameInviteAPI,
} from "../services/peerService";
import { checkWinner, getGameStatusMessage } from "../lib/tictactoegame";

interface TicTacToeGameProps {
  session: GameSession;
  peerId: string;
}

export const TicTacToeGame: React.FC<TicTacToeGameProps> = ({
  session,
  peerId,
}) => {
  const { currentUser, updateGameSession, endGameSession } = useStore();

  // Determine if it's current player's turn
  const isCurrentPlayerTurn =
    session.currentPlayer ===
    (session.player1 === currentUser.id
      ? session.player1Symbol
      : session.player2Symbol);

  const handleCellClick = (cellIndex: number) => {
    if (session.status !== "active" || !isCurrentPlayerTurn) return;
    if (session.board[cellIndex] !== null) return;

    const symbol =
      session.player1 === currentUser.id
        ? session.player1Symbol
        : session.player2Symbol;

    // Update local state
    const newBoard = [...session.board];
    newBoard[cellIndex] = symbol;

    const nextPlayer = session.currentPlayer === "X" ? "O" : "X";
    const winner = checkWinner(newBoard);

    updateGameSession(session.id, {
      board: newBoard,
      currentPlayer: nextPlayer,
      status: winner ? "finished" : "active",
      winner: winner,
    });

    // Send move to peer
    sendGameMove(
      peerId,
      session.id,
      cellIndex,
      symbol,
      nextPlayer,
      winner ? "finished" : "active",
      winner
    );
  };

  const handleReset = () => {
    const newBoard = Array(9).fill(null);
    updateGameSession(session.id, {
      board: newBoard,
      currentPlayer: "X",
      status: "active",
      winner: null,
    });

    // Notify peer
    sendGameMove(peerId, session.id, -1, "X", "X", "active", null);
  };

  const handleEnd = () => {
    endGameSession(session.id);
    endGameSessionAPI(peerId, session.id, "game-ended");
  };

  const boardVariants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
  };

  const cellVariants = {
    initial: { scale: 0.8 },
    animate: { scale: 1 },
    hover: { scale: 1.08 },
  };

  const statusMessage = getGameStatusMessage({
    cells: session.board,
    currentPlayer: session.currentPlayer,
    winner: session.winner,
    status: session.status,
  });

  return (
    <div className="space-y-4">
      {/* Game Status */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-white">TicTacToe Game</h3>
        <p className="text-sm text-white/60">{statusMessage}</p>
        <p className="text-xs text-white/40">
          You are {session.player1 === currentUser.id ? "X" : "O"} •{" "}
          {isCurrentPlayerTurn ? (
            <span className="text-blue-400 font-semibold">Your Turn</span>
          ) : (
            <span className="text-white/60">Opponent's Turn</span>
          )}
        </p>
      </div>

      {/* Game Board */}
      <motion.div
        variants={boardVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-1 bg-white/5 p-3 rounded-lg border border-white/10 w-fit mx-auto"
      >
        <AnimatePresence>
          {session.board.map((cell, index) => (
            <motion.div
              key={index}
              variants={cellVariants}
              initial="initial"
              animate="animate"
              whileHover={
                !cell && isCurrentPlayerTurn && session.status === "active"
                  ? "hover"
                  : {}
              }
              onClick={() => handleCellClick(index)}
              className={`
                w-20 h-20 flex items-center justify-center rounded-lg font-bold text-6xl
                transition-colors
                ${
                  cell
                    ? "bg-white/10 text-white cursor-default"
                    : "bg-white/5 hover:bg-white/10"
                }
                ${
                  !cell && isCurrentPlayerTurn && session.status === "active"
                    ? "cursor-pointer"
                    : "cursor-not-allowed"
                }
              `}
            >
              {cell === "X" && (
                <span className="text-blue-400 leading-none">✕</span>
              )}
              {cell === "O" && (
                <span className="text-green-400 leading-none">●</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        <Button
          onClick={handleReset}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9 px-4"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
        <Button
          onClick={handleEnd}
          variant="outline"
          className="bg-white/10 border-white/20 text-white/70 hover:bg-white/20 text-sm h-9 px-4"
        >
          Close Game
        </Button>
      </div>
    </div>
  );
};

interface GameInvitationProps {
  peerId: string;
  peerUsername: string;
}

export const TicTacToeInvitation: React.FC<GameInvitationProps> = ({
  peerId,
  peerUsername,
}) => {
  const { gameInvites, acceptGameInvite, declineGameInvite } = useStore();
  const [loading, setLoading] = useState(false);

  // Find any pending invitations from this peer
  const pendingInvite = Array.from(gameInvites.values()).find(
    (inv) => inv.from === peerId && !inv.accepted
  );

  if (!pendingInvite) return null;

  const handleAccept = () => {
    setLoading(true);
    try {
      const session = acceptGameInvite(pendingInvite.id);
      // Notify peer that invitation was accepted
      acceptGameInviteAPI(
        peerId,
        pendingInvite.id,
        session.id,
        session.gameId,
        session.player1,
        session.player2
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    declineGameInvite(pendingInvite.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-r from-blue-600/20 to-green-600/20 border border-blue-500/30 rounded-lg p-3 space-y-3"
    >
      <div>
        <p className="text-sm font-semibold text-white">
          🎮 {peerUsername} invites you to play TicTacToe
        </p>
        <p className="text-xs text-white/60 mt-1">
          Will you accept the challenge?
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleAccept}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8"
        >
          Accept
        </Button>
        <Button
          onClick={handleDecline}
          disabled={loading}
          variant="outline"
          className="flex-1 bg-white/10 border-white/20 text-white/70 hover:bg-white/20 text-xs h-8"
        >
          Decline
        </Button>
      </div>
    </motion.div>
  );
};

interface GameInviteButtonProps {
  peerId: string;
  peerUsername: string;
}

export const SendGameInviteButton: React.FC<GameInviteButtonProps> = ({
  peerId,
  peerUsername,
}) => {
  const { sendGameInvite } = useStore();
  const [loading, setLoading] = useState(false);

  const handleSendInvite = () => {
    setLoading(true);
    try {
      const invite = sendGameInvite(peerId, peerUsername);
      sendGameInviteAPI(peerId, invite.id, invite.gameId);
      alert(`Game invite sent to ${peerUsername}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSendInvite}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
    >
      Play TicTacToe
    </Button>
  );
};
