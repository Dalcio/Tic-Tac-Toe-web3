"use client";

import { Game, GameState, PlayerStats } from "@/lib/types";
import { truncateAddress, GAME_STATE_LABELS } from "@/lib/config";

interface GameInfoProps {
  game: Game | null;
  currentAccount: string | null;
  playerStats: PlayerStats | null;
  openGames: number[];
  onCreateGame: () => void;
  onJoinGame: (gameId: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

/**
 * Game information panel showing current game state, player info, and actions
 */
export default function GameInfo({
  game,
  currentAccount,
  playerStats,
  openGames,
  onCreateGame,
  onJoinGame,
  onRefresh,
  isLoading,
}: GameInfoProps) {
  const isPlayer1 =
    currentAccount?.toLowerCase() === game?.player1?.toLowerCase();
  const isPlayer2 =
    currentAccount?.toLowerCase() === game?.player2?.toLowerCase();
  const isMyGame = isPlayer1 || isPlayer2;

  return (
    <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-6 min-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Game Info</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <svg
            className={`w-5 h-5 text-slate-400 ${isLoading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Player Stats */}
      {playerStats && (
        <div className="mb-6 p-3 bg-slate-900/50 rounded-lg">
          <h3 className="text-sm text-slate-400 mb-2">Your Stats</h3>
          <div className="flex gap-6">
            <div>
              <span className="text-2xl font-bold text-green-400">
                {playerStats.wins}
              </span>
              <span className="text-slate-400 text-sm ml-1">Wins</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-300">
                {playerStats.totalGames}
              </span>
              <span className="text-slate-400 text-sm ml-1">Games</span>
            </div>
          </div>
        </div>
      )}

      {/* Current Game Info */}
      {game ? (
        <div className="space-y-4">
          {/* Game ID and Status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Game ID</span>
            <span className="text-white font-mono">#{game.id}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Status</span>
            <span
              className={`
              px-2 py-1 rounded-full text-sm font-medium
              ${game.state === GameState.WaitingForPlayer ? "bg-yellow-500/20 text-yellow-400" : ""}
              ${game.state === GameState.InProgress ? "bg-cyan-500/20 text-cyan-400" : ""}
              ${game.state === GameState.Finished ? "bg-green-500/20 text-green-400" : ""}
              ${game.state === GameState.Draw ? "bg-slate-500/20 text-slate-400" : ""}
            `}
            >
              {GAME_STATE_LABELS[game.state]}
            </span>
          </div>

          {/* Players */}
          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-400 font-bold">X</span>
              <span
                className={`font-mono text-sm ${isPlayer1 ? "text-cyan-400" : "text-slate-300"}`}
              >
                {truncateAddress(game.player1)} {isPlayer1 && "(You)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-pink-400 font-bold">O</span>
              <span
                className={`font-mono text-sm ${isPlayer2 ? "text-pink-400" : "text-slate-300"}`}
              >
                {game.player2 === "0x0000000000000000000000000000000000000000"
                  ? "Waiting..."
                  : `${truncateAddress(game.player2)} ${isPlayer2 ? "(You)" : ""}`}
              </span>
            </div>
          </div>

          {/* Winner */}
          {game.state === GameState.Finished &&
            game.winner !== "0x0000000000000000000000000000000000000000" && (
              <div className="border-t border-slate-700 pt-4">
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-green-400 font-bold text-lg mb-1">
                    🎉 Winner!
                  </p>
                  <p className="text-slate-300 font-mono text-sm">
                    {truncateAddress(game.winner)}
                    {game.winner.toLowerCase() ===
                      currentAccount?.toLowerCase() && " (You!)"}
                  </p>
                  <p className="text-slate-400 text-xs mt-2">
                    Winner NFT has been minted!
                  </p>
                </div>
              </div>
            )}

          {/* Draw */}
          {game.state === GameState.Draw && (
            <div className="border-t border-slate-700 pt-4">
              <div className="text-center p-4 bg-slate-500/10 rounded-lg border border-slate-500/30">
                <p className="text-slate-300 font-bold text-lg">
                  🤝 It&apos;s a Draw!
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-slate-400 text-center py-4">No active game</p>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {/* Create new game */}
        {(!game ||
          game.state === GameState.Finished ||
          game.state === GameState.Draw) && (
          <button
            onClick={onCreateGame}
            disabled={isLoading}
            className={`
              w-full py-3 px-4 rounded-xl font-semibold
              bg-gradient-to-r from-cyan-500 to-blue-500
              hover:from-cyan-400 hover:to-blue-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            `}
          >
            {isLoading ? "Creating..." : "Create New Game"}
          </button>
        )}

        {/* Open games to join */}
        {openGames.length > 0 &&
          (!game || game.state !== GameState.InProgress) && (
            <div className="space-y-2">
              <p className="text-slate-400 text-sm">Open games to join:</p>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {openGames.map((gameId) => (
                  <button
                    key={gameId}
                    onClick={() => onJoinGame(gameId)}
                    disabled={isLoading}
                    className={`
                    w-full py-2 px-4 rounded-lg text-sm
                    bg-slate-700 hover:bg-slate-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                    flex items-center justify-between
                  `}
                  >
                    <span>Game #{gameId}</span>
                    <span className="text-cyan-400">Join →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
