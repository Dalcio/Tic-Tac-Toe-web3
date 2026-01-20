"use client";

import { CellState } from "@/lib/types";
import { CELL_SYMBOLS } from "@/lib/config";

interface BoardProps {
  board: CellState[];
  onCellClick: (position: number) => void;
  isMyTurn: boolean;
  disabled: boolean;
  winningCells?: number[];
}

interface CellProps {
  value: CellState;
  position: number;
  onClick: (position: number) => void;
  disabled: boolean;
  isWinning: boolean;
}

/**
 * Individual cell component
 */
function Cell({ value, position, onClick, disabled, isWinning }: CellProps) {
  const symbol = CELL_SYMBOLS[value];
  const isEmpty = value === CellState.Empty;

  const cellClasses = [
    "w-24 h-24 md:w-28 md:h-28",
    "flex items-center justify-center",
    "text-4xl md:text-5xl font-bold",
    "border-2 border-cyan-500/30",
    "transition-all duration-200",
    "rounded-lg",
    isEmpty && !disabled ? "hover:bg-cyan-500/10 cursor-pointer" : "",
    disabled || !isEmpty ? "cursor-not-allowed" : "",
    value === CellState.X ? "text-cyan-400" : "",
    value === CellState.O ? "text-pink-400" : "",
    isWinning ? "bg-green-500/20 border-green-400" : "bg-slate-800/50",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={cellClasses}
      onClick={() => isEmpty && !disabled && onClick(position)}
      disabled={disabled || !isEmpty}
      aria-label={`Cell ${position + 1}, ${symbol || "empty"}`}
    >
      {symbol && (
        <span className={`${isWinning ? "animate-pulse" : ""}`}>{symbol}</span>
      )}
    </button>
  );
}

/**
 * Game board component - 3x3 grid
 */
export default function Board({
  board,
  onCellClick,
  isMyTurn,
  disabled,
  winningCells = [],
}: BoardProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Turn indicator */}
      <div
        className={`
        text-lg font-medium px-4 py-2 rounded-full
        ${
          isMyTurn && !disabled
            ? "bg-cyan-500/20 text-cyan-400 animate-pulse"
            : "bg-slate-700/50 text-slate-400"
        }
      `}
      >
        {disabled
          ? "Game not active"
          : isMyTurn
            ? "🎯 Your turn!"
            : "⏳ Waiting for opponent..."}
      </div>

      {/* Board grid */}
      <div className="grid grid-cols-3 gap-2 p-4 bg-slate-900/50 rounded-xl border border-cyan-500/20">
        {board.map((cell, index) => (
          <Cell
            key={index}
            value={cell}
            position={index}
            onClick={onCellClick}
            disabled={disabled || !isMyTurn}
            isWinning={winningCells.includes(index)}
          />
        ))}
      </div>

      {/* Board legend */}
      <div className="flex gap-6 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">X</span>
          <span>= Player 1</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-pink-400 font-bold">O</span>
          <span>= Player 2</span>
        </div>
      </div>
    </div>
  );
}
