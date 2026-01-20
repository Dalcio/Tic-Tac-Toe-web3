"use client";

import { useState, useCallback, useMemo } from "react";
import { BrowserProvider, Contract } from "ethers";
import {
  Game,
  CellState,
  GameState,
  PlayerStats,
  UseContractReturn,
} from "./types";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./config";

/**
 * Custom hook for interacting with the TicTacToe smart contract
 */
export function useContract(): UseContractReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get contract instance with signer for write operations
   */
  const getContractWithSigner = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error(
        "Contract address not configured. Please deploy the contract first.",
      );
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, []);

  /**
   * Get contract instance with provider for read operations
   */
  const getContractWithProvider = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error(
        "Contract address not configured. Please deploy the contract first.",
      );
    }

    const provider = new BrowserProvider(window.ethereum);
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  }, []);

  /**
   * Create a new game
   * @returns The new game ID or null on error
   */
  const createGame = useCallback(async (): Promise<number | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = await getContractWithSigner();
      const tx = await contract.createGame();
      const receipt = await tx.wait();

      // Find the GameCreated event to get the game ID
      const event = receipt.logs.find(
        (log: { fragment?: { name: string } }) =>
          log.fragment?.name === "GameCreated",
      );

      if (event && event.args) {
        return Number(event.args[0]);
      }

      // Fallback: get the game counter
      const gameCounter = await contract.gameCounter();
      return Number(gameCounter) - 1;
    } catch (err) {
      const error = err as { reason?: string; message?: string };
      setError(error.reason || error.message || "Failed to create game");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContractWithSigner]);

  /**
   * Join an existing game
   * @param gameId The ID of the game to join
   * @returns True if successful, false otherwise
   */
  const joinGame = useCallback(
    async (gameId: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const contract = await getContractWithSigner();
        const tx = await contract.joinGame(gameId);
        await tx.wait();
        return true;
      } catch (err) {
        const error = err as { reason?: string; message?: string };
        setError(error.reason || error.message || "Failed to join game");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getContractWithSigner],
  );

  /**
   * Make a move in a game
   * @param gameId The ID of the game
   * @param position The position to place the mark (0-8)
   * @returns True if successful, false otherwise
   */
  const makeMove = useCallback(
    async (gameId: number, position: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const contract = await getContractWithSigner();
        const tx = await contract.makeMove(gameId, position);
        await tx.wait();
        return true;
      } catch (err) {
        const error = err as { reason?: string; message?: string };

        // Parse common errors
        let errorMessage =
          error.reason || error.message || "Failed to make move";

        if (errorMessage.includes("NotYourTurn")) {
          errorMessage = "It's not your turn!";
        } else if (errorMessage.includes("CellNotEmpty")) {
          errorMessage = "This cell is already occupied!";
        } else if (errorMessage.includes("GameNotInProgress")) {
          errorMessage = "The game is not in progress!";
        } else if (errorMessage.includes("NotAPlayer")) {
          errorMessage = "You are not a player in this game!";
        }

        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getContractWithSigner],
  );

  /**
   * Get game details
   * @param gameId The ID of the game
   * @returns Game data or null on error
   */
  const getGame = useCallback(
    async (gameId: number): Promise<Game | null> => {
      try {
        const contract = await getContractWithProvider();
        const result = await contract.getGame(gameId);

        // Parse the result
        const [player1, player2, board, currentTurn, winner, state] = result;

        // Convert board array
        const boardArray: CellState[] = board.map(
          (cell: bigint) => Number(cell) as CellState,
        );

        return {
          id: gameId,
          player1,
          player2,
          board: boardArray,
          currentTurn,
          winner,
          state: Number(state) as GameState,
        };
      } catch (err) {
        console.error("Error getting game:", err);
        return null;
      }
    },
    [getContractWithProvider],
  );

  /**
   * Get all open games waiting for a player
   * @returns Array of game IDs
   */
  const getOpenGames = useCallback(async (): Promise<number[]> => {
    try {
      const contract = await getContractWithProvider();
      const games = await contract.getOpenGames();
      return games.map((id: bigint) => Number(id));
    } catch (err) {
      console.error("Error getting open games:", err);
      return [];
    }
  }, [getContractWithProvider]);

  /**
   * Get player statistics
   * @param address Player's address
   * @returns Player stats
   */
  const getPlayerStats = useCallback(
    async (address: string): Promise<PlayerStats> => {
      try {
        const contract = await getContractWithProvider();
        const [wins, totalGames] = await contract.getPlayerStats(address);
        return {
          wins: Number(wins),
          totalGames: Number(totalGames),
        };
      } catch (err) {
        console.error("Error getting player stats:", err);
        return { wins: 0, totalGames: 0 };
      }
    },
    [getContractWithProvider],
  );

  /**
   * Get all games for a player
   * @param address Player's address
   * @returns Array of game IDs
   */
  const getPlayerGames = useCallback(
    async (address: string): Promise<number[]> => {
      try {
        const contract = await getContractWithProvider();
        const games = await contract.getPlayerGames(address);
        return games.map((id: bigint) => Number(id));
      } catch (err) {
        console.error("Error getting player games:", err);
        return [];
      }
    },
    [getContractWithProvider],
  );

  return useMemo(
    () => ({
      createGame,
      joinGame,
      makeMove,
      getGame,
      getOpenGames,
      getPlayerStats,
      getPlayerGames,
      isLoading,
      error,
    }),
    [
      createGame,
      joinGame,
      makeMove,
      getGame,
      getOpenGames,
      getPlayerStats,
      getPlayerGames,
      isLoading,
      error,
    ],
  );
}
