/**
 * Configuration constants for the TicTacToe Web3 game
 */

import { NetworkConfig } from "./types";

// ============ Contract Configuration ============

/**
 * The deployed contract address
 * Update this after deploying the contract
 */
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

/**
 * Contract ABI - Generated from Hardhat compilation
 */
export const CONTRACT_ABI = [
  // Read functions
  "function gameCounter() view returns (uint256)",
  "function games(uint256) view returns (address player1, address player2, address currentTurn, address winner, uint8 state, uint256 createdAt, uint256 lastMoveAt)",
  "function getGame(uint256 gameId) view returns (address player1, address player2, uint8[9] board, address currentTurn, address winner, uint8 state)",
  "function getBoard(uint256 gameId) view returns (uint8[9])",
  "function getPlayerGames(address player) view returns (uint256[])",
  "function getOpenGames() view returns (uint256[])",
  "function getPlayerStats(address player) view returns (uint256 wins, uint256 totalGames)",
  "function playerWins(address) view returns (uint256)",
  "function playerGamesPlayed(address) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",

  // Write functions
  "function createGame() returns (uint256)",
  "function joinGame(uint256 gameId)",
  "function makeMove(uint256 gameId, uint8 position)",

  // Events
  "event GameCreated(uint256 indexed gameId, address indexed player1)",
  "event GameJoined(uint256 indexed gameId, address indexed player2)",
  "event MoveMade(uint256 indexed gameId, address indexed player, uint8 position)",
  "event GameWon(uint256 indexed gameId, address indexed winner)",
  "event GameDraw(uint256 indexed gameId)",
  "event WinnerNFTMinted(uint256 indexed tokenId, address indexed winner, uint256 indexed gameId)",
] as const;

// ============ Network Configuration ============

/**
 * Supported networks for the game
 */
export const NETWORKS: Record<number, NetworkConfig> = {
  // Localhost (Hardhat)
  31337: {
    chainId: 31337,
    name: "Localhost",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  // Ethereum Sepolia Testnet
  11155111: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  // Polygon Mumbai Testnet
  80001: {
    chainId: 80001,
    name: "Mumbai",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    blockExplorer: "https://mumbai.polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
  },
  // Polygon Amoy Testnet (newer)
  80002: {
    chainId: 80002,
    name: "Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    blockExplorer: "https://amoy.polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
  },
};

/**
 * Default network to use
 */
export const DEFAULT_CHAIN_ID = 31337; // Localhost for development

/**
 * Get network config by chain ID
 */
export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return NETWORKS[chainId];
}

/**
 * Check if a network is supported
 */
export function isNetworkSupported(chainId: number): boolean {
  return chainId in NETWORKS;
}

// ============ Game Constants ============

/**
 * Board size (3x3)
 */
export const BOARD_SIZE = 9;

/**
 * Winning combinations (indices for 3x3 board)
 */
export const WINNING_COMBINATIONS = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal
  [2, 4, 6], // Anti-diagonal
];

// ============ UI Constants ============

/**
 * Cell symbols
 */
export const CELL_SYMBOLS = {
  0: "", // Empty
  1: "X",
  2: "O",
} as const;

/**
 * Game state labels
 */
export const GAME_STATE_LABELS = {
  0: "Waiting for Player",
  1: "In Progress",
  2: "Finished",
  3: "Draw",
} as const;

/**
 * Truncate address for display
 */
export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format balance for display
 */
export function formatBalance(balance: string): string {
  const num = parseFloat(balance);
  return num.toFixed(4);
}
