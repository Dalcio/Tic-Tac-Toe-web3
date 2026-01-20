"use client";

import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, formatEther } from "ethers";
import { WalletState, UseWalletReturn } from "./types";
import { NETWORKS, DEFAULT_CHAIN_ID, isNetworkSupported } from "./config";

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        callback: (...args: unknown[]) => void,
      ) => void;
    };
  }
}

/**
 * Custom hook for wallet connection management
 * Handles MetaMask connection, network switching, and account changes
 */
export function useWallet(): UseWalletReturn {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: null,
    isCorrectNetwork: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update wallet state with current account info
   */
  const updateWalletState = useCallback(async (address: string) => {
    if (!window.ethereum) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setWalletState({
        isConnected: true,
        address,
        chainId,
        balance: formatEther(balance),
        isCorrectNetwork: isNetworkSupported(chainId),
      });
    } catch (err) {
      console.error("Error updating wallet state:", err);
    }
  }, []);

  /**
   * Handle account changes from MetaMask
   */
  const handleAccountsChanged = useCallback(
    (accounts: unknown) => {
      const accountList = accounts as string[];
      if (accountList.length === 0) {
        // User disconnected
        setWalletState({
          isConnected: false,
          address: null,
          chainId: null,
          balance: null,
          isCorrectNetwork: false,
        });
      } else {
        updateWalletState(accountList[0]);
      }
    },
    [updateWalletState],
  );

  /**
   * Handle chain/network changes from MetaMask
   */
  const handleChainChanged = useCallback(() => {
    // Reload the page on chain change as recommended by MetaMask
    window.location.reload();
  }, []);

  /**
   * Connect wallet
   */
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install MetaMask to play.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request account access
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts.length > 0) {
        await updateWalletState(accounts[0]);
      }
    } catch (err) {
      const error = err as { code?: number; message?: string };
      if (error.code === 4001) {
        setError(
          "Connection rejected. Please approve the connection in MetaMask.",
        );
      } else {
        setError(error.message || "Failed to connect wallet");
      }
    } finally {
      setIsLoading(false);
    }
  }, [updateWalletState]);

  /**
   * Disconnect wallet (client-side only)
   */
  const disconnect = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
      balance: null,
      isCorrectNetwork: false,
    });
  }, []);

  /**
   * Switch to a different network
   */
  const switchNetwork = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      setError("MetaMask is not installed");
      return;
    }

    const network = NETWORKS[chainId];
    if (!network) {
      setError("Network not supported");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError) {
      const error = switchError as { code?: number };
      // Error code 4902 means the network hasn't been added to MetaMask
      if (error.code === 4902) {
        try {
          // Add the network
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: network.blockExplorer
                  ? [network.blockExplorer]
                  : [],
                nativeCurrency: network.nativeCurrency,
              },
            ],
          });
        } catch (addError) {
          const err = addError as { message?: string };
          setError(err.message || "Failed to add network");
        }
      } else {
        const err = switchError as { message?: string };
        setError(err.message || "Failed to switch network");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if already connected on mount
   */
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
        })) as string[];

        if (accounts.length > 0) {
          await updateWalletState(accounts[0]);
        }
      } catch (err) {
        console.error("Error checking connection:", err);
      }
    };

    checkConnection();
  }, [updateWalletState]);

  /**
   * Set up event listeners for account and chain changes
   */
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [handleAccountsChanged, handleChainChanged]);

  return {
    walletState,
    connect,
    disconnect,
    switchNetwork,
    isLoading,
    error,
  };
}
