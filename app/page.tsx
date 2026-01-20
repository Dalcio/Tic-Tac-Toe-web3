"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/useWallet";
import { useContract } from "@/lib/useContract";
import { Game, CellState, GameState, PlayerStats } from "@/lib/types";
import { CONTRACT_ADDRESS, WINNING_COMBINATIONS } from "@/lib/config";
import Board from "@/components/Board";
import WalletButton from "@/components/WalletButton";
import GameInfo from "@/components/GameInfo";

/**
 * Main TicTacToe Game Page
 * Handles wallet connection, game state, and player interactions
 */
export default function Home() {
  // Wallet hook
  const {
    walletState,
    connect,
    disconnect,
    switchNetwork,
    isLoading: walletLoading,
    error: walletError,
  } = useWallet();

  // Contract hook
  const {
    createGame,
    joinGame,
    makeMove,
    getGame,
    getOpenGames,
    getPlayerStats,
    isLoading: contractLoading,
    error: contractError,
  } = useContract();

  // Local state
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [openGames, setOpenGames] = useState<number[]>([]);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Combined loading state
  const isLoading = walletLoading || contractLoading;

  /**
   * Check for winning combination and return winning cells
   */
  const findWinningCells = useCallback(
    (board: CellState[], winner: CellState): number[] => {
      for (const combo of WINNING_COMBINATIONS) {
        if (
          board[combo[0]] === winner &&
          board[combo[1]] === winner &&
          board[combo[2]] === winner
        ) {
          return combo;
        }
      }
      return [];
    },
    [],
  );

  /**
   * Refresh game data
   */
  const refreshGameData = useCallback(async () => {
    if (!walletState.isConnected || !walletState.address) return;

    try {
      // Get player stats
      const stats = await getPlayerStats(walletState.address);
      setPlayerStats(stats);

      // Get open games
      const games = await getOpenGames();
      setOpenGames(games);

      // Refresh current game if exists
      if (currentGame) {
        const updatedGame = await getGame(currentGame.id);
        if (updatedGame) {
          setCurrentGame(updatedGame);

          // Check for winning cells
          if (updatedGame.state === GameState.Finished) {
            const isPlayer1Winner =
              updatedGame.winner.toLowerCase() ===
              updatedGame.player1.toLowerCase();
            const winnerMark = isPlayer1Winner ? CellState.X : CellState.O;
            const cells = findWinningCells(updatedGame.board, winnerMark);
            setWinningCells(cells);
          }
        }
      }
    } catch (err) {
      console.error("Error refreshing game data:", err);
    }
  }, [
    walletState.isConnected,
    walletState.address,
    currentGame,
    getPlayerStats,
    getOpenGames,
    getGame,
    findWinningCells,
  ]);

  /**
   * Handle creating a new game
   */
  const handleCreateGame = async () => {
    const gameId = await createGame();
    if (gameId !== null) {
      const game = await getGame(gameId);
      setCurrentGame(game);
      setWinningCells([]);
      setNotification(`Game #${gameId} created! Waiting for opponent...`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  /**
   * Handle joining a game
   */
  const handleJoinGame = async (gameId: number) => {
    const success = await joinGame(gameId);
    if (success) {
      const game = await getGame(gameId);
      setCurrentGame(game);
      setWinningCells([]);
      setNotification(`Joined game #${gameId}! Game started.`);
      setTimeout(() => setNotification(null), 3000);
      refreshGameData();
    }
  };

  /**
   * Handle making a move
   */
  const handleCellClick = async (position: number) => {
    if (!currentGame || currentGame.state !== GameState.InProgress) return;

    const success = await makeMove(currentGame.id, position);
    if (success) {
      // Refresh game state
      const updatedGame = await getGame(currentGame.id);
      if (updatedGame) {
        setCurrentGame(updatedGame);

        // Check if game ended
        if (updatedGame.state === GameState.Finished) {
          const isWinner =
            updatedGame.winner.toLowerCase() ===
            walletState.address?.toLowerCase();
          const isPlayer1Winner =
            updatedGame.winner.toLowerCase() ===
            updatedGame.player1.toLowerCase();
          const winnerMark = isPlayer1Winner ? CellState.X : CellState.O;
          const cells = findWinningCells(updatedGame.board, winnerMark);
          setWinningCells(cells);

          if (isWinner) {
            setNotification("🎉 Congratulations! You won! NFT minted!");
          } else {
            setNotification("Game over! Better luck next time.");
          }
          setTimeout(() => setNotification(null), 5000);
          refreshGameData();
        } else if (updatedGame.state === GameState.Draw) {
          setNotification("It's a draw! Well played.");
          setTimeout(() => setNotification(null), 3000);
        }
      }
    }
  };

  /**
   * Determine if it's the current player's turn
   */
  const isMyTurn = useCallback(() => {
    if (!currentGame || !walletState.address) return false;
    return (
      currentGame.currentTurn.toLowerCase() ===
      walletState.address.toLowerCase()
    );
  }, [currentGame, walletState.address]);

  /**
   * Poll for game updates (for multiplayer sync)
   */
  useEffect(() => {
    if (!currentGame || currentGame.state !== GameState.InProgress) return;

    const interval = setInterval(async () => {
      const updatedGame = await getGame(currentGame.id);
      if (
        updatedGame &&
        JSON.stringify(updatedGame) !== JSON.stringify(currentGame)
      ) {
        setCurrentGame(updatedGame);

        // Check if game ended
        if (updatedGame.state === GameState.Finished) {
          const isWinner =
            updatedGame.winner.toLowerCase() ===
            walletState.address?.toLowerCase();
          const isPlayer1Winner =
            updatedGame.winner.toLowerCase() ===
            updatedGame.player1.toLowerCase();
          const winnerMark = isPlayer1Winner ? CellState.X : CellState.O;
          const cells = findWinningCells(updatedGame.board, winnerMark);
          setWinningCells(cells);

          if (isWinner) {
            setNotification("🎉 Congratulations! You won! NFT minted!");
          } else {
            setNotification("Game over! Your opponent won.");
          }
          setTimeout(() => setNotification(null), 5000);
          refreshGameData();
        } else if (updatedGame.state === GameState.Draw) {
          setNotification("It's a draw!");
          setTimeout(() => setNotification(null), 3000);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [
    currentGame,
    getGame,
    walletState.address,
    findWinningCells,
    refreshGameData,
  ]);

  /**
   * Initial data load when wallet connects
   */
  useEffect(() => {
    if (walletState.isConnected && walletState.address) {
      refreshGameData();
    }
  }, [walletState.isConnected, walletState.address, refreshGameData]);

  // Check if contract is configured
  const isContractConfigured = CONTRACT_ADDRESS && CONTRACT_ADDRESS.length > 0;

  return (
    <main className="min-h-screen py-8 px-4">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Web3 Tic-Tac-Toe
            </h1>
            <p className="text-slate-400 mt-1">Play on-chain, win NFTs!</p>
          </div>

          <WalletButton
            walletState={walletState}
            onConnect={connect}
            onDisconnect={disconnect}
            onSwitchNetwork={switchNetwork}
            isLoading={walletLoading}
            error={walletError}
          />
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="max-w-6xl mx-auto mb-4">
          <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4 text-center text-cyan-400">
            {notification}
          </div>
        </div>
      )}

      {/* Contract Error */}
      {contractError && (
        <div className="max-w-6xl mx-auto mb-4">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center text-red-400">
            {contractError}
          </div>
        </div>
      )}

      {/* Contract not configured warning */}
      {!isContractConfigured && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-6 text-center">
            <h2 className="text-yellow-400 font-bold text-lg mb-2">
              ⚠️ Contract Not Configured
            </h2>
            <p className="text-slate-300 mb-4">
              Please deploy the smart contract and set the contract address in
              your environment variables.
            </p>
            <div className="bg-slate-800 rounded-lg p-4 text-left font-mono text-sm text-slate-400">
              <p className="mb-2"># 1. Start local Hardhat node:</p>
              <p className="text-cyan-400 mb-4">npm run node</p>
              <p className="mb-2">
                # 2. Deploy contract (in another terminal):
              </p>
              <p className="text-cyan-400 mb-4">npm run deploy:localhost</p>
              <p className="mb-2"># 3. Add to .env.local:</p>
              <p className="text-cyan-400">
                NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      {walletState.isConnected &&
      isContractConfigured &&
      walletState.isCorrectNetwork ? (
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start justify-center gap-8">
            {/* Game Board */}
            <div className="flex-shrink-0">
              <Board
                board={currentGame?.board || Array(9).fill(CellState.Empty)}
                onCellClick={handleCellClick}
                isMyTurn={isMyTurn()}
                disabled={
                  !currentGame ||
                  currentGame.state !== GameState.InProgress ||
                  isLoading
                }
                winningCells={winningCells}
              />
            </div>

            {/* Game Info Panel */}
            <GameInfo
              game={currentGame}
              currentAccount={walletState.address}
              playerStats={playerStats}
              openGames={openGames}
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
              onRefresh={refreshGameData}
              isLoading={isLoading}
            />
          </div>
        </div>
      ) : (
        // Not connected state
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-8">
            <div className="text-6xl mb-6">🎮</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Welcome to Web3 Tic-Tac-Toe!
            </h2>
            <p className="text-slate-400 mb-6">
              Connect your wallet to start playing. Create a game and challenge
              your friends, or join an existing game. Winners receive a unique
              NFT!
            </p>
            <ul className="text-slate-300 text-left max-w-md mx-auto mb-6 space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span>
                Play Tic-Tac-Toe on the blockchain
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span>
                All moves are recorded on-chain
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span>
                Winners receive an exclusive NFT
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span>
                Track your wins and game history
              </li>
            </ul>
            {!walletState.isConnected && (
              <button
                onClick={connect}
                disabled={walletLoading}
                className={`
                  px-8 py-4 rounded-xl font-bold text-lg
                  bg-gradient-to-r from-cyan-500 to-blue-500
                  hover:from-cyan-400 hover:to-blue-400
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 glow
                `}
              >
                {walletLoading ? "Connecting..." : "Connect Wallet to Play"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-16 text-center text-slate-500 text-sm">
        <p>Built with Next.js, ethers.js, and Solidity</p>
        <p className="mt-1">
          Contract:{" "}
          {isContractConfigured ? (
            <span className="font-mono text-cyan-400">
              {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
            </span>
          ) : (
            <span className="text-yellow-400">Not deployed</span>
          )}
        </p>
      </footer>
    </main>
  );
}
