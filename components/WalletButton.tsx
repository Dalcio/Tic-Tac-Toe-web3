"use client";

import { WalletState } from "@/lib/types";
import { truncateAddress, formatBalance, NETWORKS } from "@/lib/config";

interface WalletButtonProps {
  walletState: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchNetwork: (chainId: number) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Wallet connection button and status display
 */
export default function WalletButton({
  walletState,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
  isLoading,
  error,
}: WalletButtonProps) {
  const { isConnected, address, chainId, balance, isCorrectNetwork } =
    walletState;
  const network = chainId ? NETWORKS[chainId] : null;

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onConnect}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded-xl font-semibold
            bg-gradient-to-r from-cyan-500 to-blue-500
            hover:from-cyan-400 hover:to-blue-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            flex items-center gap-2
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Connect Wallet
            </>
          )}
        </button>
        {error && (
          <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Wallet info card */}
      <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4 min-w-[280px]">
        {/* Address */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">Address</span>
          <span className="text-cyan-400 font-mono">
            {truncateAddress(address || "")}
          </span>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">Balance</span>
          <span className="text-white font-medium">
            {formatBalance(balance || "0")}{" "}
            {network?.nativeCurrency.symbol || "ETH"}
          </span>
        </div>

        {/* Network */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Network</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isCorrectNetwork ? "bg-green-400" : "bg-yellow-400"}`}
            />
            <span
              className={`text-sm ${isCorrectNetwork ? "text-green-400" : "text-yellow-400"}`}
            >
              {network?.name || `Chain ${chainId}`}
            </span>
          </div>
        </div>
      </div>

      {/* Network warning */}
      {!isCorrectNetwork && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
          <p className="text-yellow-400 text-sm mb-2">
            ⚠️ Please switch to a supported network
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => onSwitchNetwork(31337)}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Localhost
            </button>
            <button
              onClick={() => onSwitchNetwork(11155111)}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Sepolia
            </button>
            <button
              onClick={() => onSwitchNetwork(80002)}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Amoy
            </button>
          </div>
        </div>
      )}

      {/* Disconnect button */}
      <button
        onClick={onDisconnect}
        className="text-slate-400 hover:text-red-400 text-sm transition-colors"
      >
        Disconnect
      </button>

      {error && (
        <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
      )}
    </div>
  );
}
