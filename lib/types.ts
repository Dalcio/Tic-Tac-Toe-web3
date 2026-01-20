/**
 * TypeScript types for the TicTacToe Web3 game
 */

// ============ Blockchain Types ============

/**
 * Represents the state of a cell on the board
 * Maps to Solidity enum CellState
 */
export enum CellState {
  Empty = 0,
  X = 1,
  O = 2,
}

/**
 * Represents the current state of a game
 * Maps to Solidity enum GameState
 */
export enum GameState {
  WaitingForPlayer = 0,
  InProgress = 1,
  Finished = 2,
  Draw = 3,
}

/**
 * Represents a game from the smart contract
 */
export interface Game {
  id: number;
  player1: string;
  player2: string;
  board: CellState[];
  currentTurn: string;
  winner: string;
  state: GameState;
}

/**
 * Player statistics
 */
export interface PlayerStats {
  wins: number;
  totalGames: number;
}

// ============ Frontend State Types ============

/**
 * Wallet connection state
 */
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isCorrectNetwork: boolean;
}

/**
 * Supported networks
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Transaction state
 */
export interface TransactionState {
  isPending: boolean;
  hash: string | null;
  error: string | null;
}

// ============ Component Props Types ============

export interface BoardProps {
  board: CellState[];
  onCellClick: (position: number) => void;
  isMyTurn: boolean;
  disabled: boolean;
}

export interface CellProps {
  value: CellState;
  position: number;
  onClick: (position: number) => void;
  disabled: boolean;
}

export interface GameInfoProps {
  game: Game | null;
  currentAccount: string | null;
  onCreateGame: () => void;
  onJoinGame: (gameId: number) => void;
}

export interface WalletButtonProps {
  walletState: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

// ============ Hook Return Types ============

export interface UseWalletReturn {
  walletState: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UseContractReturn {
  createGame: () => Promise<number | null>;
  joinGame: (gameId: number) => Promise<boolean>;
  makeMove: (gameId: number, position: number) => Promise<boolean>;
  getGame: (gameId: number) => Promise<Game | null>;
  getOpenGames: () => Promise<number[]>;
  getPlayerStats: (address: string) => Promise<PlayerStats>;
  getPlayerGames: (address: string) => Promise<number[]>;
  isLoading: boolean;
  error: string | null;
}

// ============ Event Types ============

export interface GameCreatedEvent {
  gameId: number;
  player1: string;
}

export interface GameJoinedEvent {
  gameId: number;
  player2: string;
}

export interface MoveMadeEvent {
  gameId: number;
  player: string;
  position: number;
}

export interface GameWonEvent {
  gameId: number;
  winner: string;
}

export interface GameDrawEvent {
  gameId: number;
}
