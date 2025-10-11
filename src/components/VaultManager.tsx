import React, { useState } from 'react';
import { Vault, Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Eye, Settings, AlertCircle, RotateCcw } from 'lucide-react';
import { useVault } from '../hooks/useVault';

interface VaultManagerProps {
  daoId: string;
  treasuryObject?: string;
}

const VaultManager: React.FC<VaultManagerProps> = ({ daoId, treasuryObject }) => {
  const {
    vaults,
    isLoading,
    error,
    isAdmin,
    createVault,
    depositToVault,
    withdrawFromVault,
    setVaultStrategy,
    refreshData,
    toTokenAmount,
    fromTokenAmount,
    KNOWN_TOKENS
  } = useVault(daoId, treasuryObject);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedVault, setSelectedVault] = useState<any>(null);
  const [createTokenAddress, setCreateTokenAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleCreateVault = async () => {
    if (!createTokenAddress.trim()) {
      setModalError('Please enter a token metadata address');
      return;
    }

    try {
      setIsProcessing(true);
      setModalError(null);
      await createVault(createTokenAddress.trim());
      setShowCreateModal(false);
      setCreateTokenAddress('');
    } catch (error: any) {
      setModalError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedVault || !depositAmount) {
      setModalError('Please enter a valid amount');
      return;
    }

    try {
      setIsProcessing(true);
      setModalError(null);
      const amount = parseFloat(depositAmount);
      await depositToVault(selectedVault.address, amount, selectedVault.decimals);
      setShowDepositModal(false);
      setDepositAmount('');
      setSelectedVault(null);
    } catch (error: any) {
      setModalError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedVault || !withdrawAmount) {
      setModalError('Please enter a valid amount');
      return;
    }

    try {
      setIsProcessing(true);
      setModalError(null);
      const amount = parseFloat(withdrawAmount);
      await withdrawFromVault(selectedVault.address, amount, selectedVault.decimals);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setSelectedVault(null);
    } catch (error: any) {
      setModalError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openDepositModal = (vault: any) => {
    setSelectedVault(vault);
    setShowDepositModal(true);
    setModalError(null);
  };

  const openWithdrawModal = (vault: any) => {
    setSelectedVault(vault);
    setShowWithdrawModal(true);
    setModalError(null);
  };

  const getKnownTokenInfo = (metadataAddress: string): any => {
    return (KNOWN_TOKENS as any)[metadataAddress as any];
  };


  // Remove loading animation completely

  return (
    <div className="bg-transparent">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <Vault className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">DAO Vaults</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => refreshData()}
            className="flex items-center space-x-2 bg-gray-700/50 hover:bg-gray-600/70 text-white px-3 py-2 rounded-lg transition-all duration-200 border border-gray-600/30"
            title="Refresh vault data"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm">Refresh</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-blue-600/80 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-200 border border-blue-500/30"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Create Vault</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        </div>
      )}

      {vaults.length === 0 ? (
        <div className="text-center py-12 px-4">
          <Vault className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h4 className="text-base font-medium text-white mb-2">No Vaults Created</h4>
          <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
            {isAdmin
              ? "Create your first vault to manage FA tokens like USDC and USDT."
              : "No vaults have been created by the DAO admins yet."
            }
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600/80 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium"
            >
              Create First Vault
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Token</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Vault</th>
                  <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden xl:table-cell">FA Address</th>
                  <th className="text-right py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Total</th>
                  <th className="text-right py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Available</th>
                  <th className="text-right py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden 2xl:table-cell">Strategy</th>
                  <th className="text-right py-3 px-2 sm:px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {vaults.map((vault) => {
                  const knownToken = getKnownTokenInfo(vault.metadata);
                  const tokenSymbol = vault.tokenSymbol || knownToken?.symbol || 'UNKNOWN';
                  const tokenName = vault.tokenName || knownToken?.name || 'Unknown Token';
                  const strategicAssets = vault.totalAssets - vault.idleAssets;

                  return (
                    <tr key={vault.address} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                            knownToken ? 'bg-blue-600/80' : 'bg-gray-600/80'
                          }`}>
                            {tokenSymbol.slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium text-sm">{tokenSymbol}</div>
                            <div className="text-gray-400 text-xs truncate">{tokenName}</div>
                            {vault.strategy && (
                              <div className="flex items-center space-x-1 mt-0.5">
                                <TrendingUp className="w-3 h-3 text-blue-400" />
                                <span className="text-blue-400 text-xs">Active</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Mobile info */}
                        <div className="mt-2 lg:hidden space-y-1">
                          <div className="text-gray-500 text-xs font-mono">
                            <div>Vault: {vault.address.slice(0, 8)}...{vault.address.slice(-6)}</div>
                            <div className="xl:hidden">FA: {vault.metadata.slice(0, 8)}...{vault.metadata.slice(-6)}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-green-400 md:hidden">Available: {vault.idleAssets.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            {strategicAssets > 0 && (
                              <span className="text-blue-400 xl:hidden">Strategy: {strategicAssets.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                        <div className="text-gray-300 font-mono text-xs">
                          {vault.address.slice(0, 8)}...{vault.address.slice(-6)}
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(vault.address)}
                          className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                          title="Copy vault address"
                        >
                          Copy
                        </button>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden xl:table-cell">
                        <div className="text-gray-300 font-mono text-xs">
                          {vault.metadata.slice(0, 8)}...{vault.metadata.slice(-6)}
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(vault.metadata)}
                          className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                          title="Copy FA address"
                        >
                          Copy
                        </button>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        <div className="text-white font-medium text-sm">
                          {vault.totalAssets.toLocaleString(undefined, {
                            maximumFractionDigits: 2
                          })}
                        </div>
                        {tokenSymbol !== 'UNKNOWN' && (
                          <div className="text-gray-400 text-xs">{tokenSymbol}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right hidden md:table-cell">
                        <div className="text-green-400 font-medium text-sm">
                          {vault.idleAssets.toLocaleString(undefined, {
                            maximumFractionDigits: 2
                          })}
                        </div>
                        {tokenSymbol !== 'UNKNOWN' && (
                          <div className="text-gray-400 text-xs">{tokenSymbol}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right hidden 2xl:table-cell">
                        <div className="text-blue-400 font-medium text-sm">
                          {strategicAssets.toLocaleString(undefined, {
                            maximumFractionDigits: 2
                          })}
                        </div>
                        {tokenSymbol !== 'UNKNOWN' && (
                          <div className="text-gray-400 text-xs">{tokenSymbol}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex justify-end space-x-1">
                          <button
                            onClick={() => openDepositModal(vault)}
                            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
                            title="Deposit"
                          >
                            <ArrowDownRight className="w-4 h-4 text-green-400" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => openWithdrawModal(vault)}
                              className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
                              title="Withdraw"
                            >
                              <ArrowUpRight className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Vault Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create New Vault</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Token Metadata Address</label>
                <input
                  type="text"
                  value={createTokenAddress}
                  onChange={(e) => setCreateTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Enter the metadata address for the FA token (e.g., USDC, USDT)
                </p>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  <strong>Note:</strong> Enter the metadata address for the FA token you want to create a vault for.
                  You can get this from your network's token registry or deployment information.
                </p>
              </div>

              {modalError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{modalError}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateTokenAddress('');
                    setModalError(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVault}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-2 rounded-lg transition-colors"
                >
                  {isProcessing ? 'Creating...' : 'Create Vault'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && selectedVault && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Deposit to {selectedVault.tokenSymbol} Vault
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Amount</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  min="0"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Amount in {selectedVault.tokenSymbol} tokens
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Balance:</span>
                  <span className="text-white">
                    {selectedVault.totalAssets.toLocaleString()} {selectedVault.tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Available:</span>
                  <span className="text-green-400">
                    {selectedVault.idleAssets.toLocaleString()} {selectedVault.tokenSymbol}
                  </span>
                </div>
              </div>

              {modalError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{modalError}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositAmount('');
                    setSelectedVault(null);
                    setModalError(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={isProcessing || !depositAmount}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white py-2 rounded-lg transition-colors"
                >
                  {isProcessing ? 'Depositing...' : 'Deposit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && selectedVault && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Withdraw from {selectedVault.tokenSymbol} Vault
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Amount</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  min="0"
                  max={selectedVault.idleAssets}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Amount in {selectedVault.tokenSymbol} tokens (max: {selectedVault.idleAssets.toLocaleString()})
                </p>
              </div>

              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  <strong>Admin Only:</strong> Only DAO admins can withdraw from vaults.
                </p>
              </div>

              {modalError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{modalError}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                    setSelectedVault(null);
                    setModalError(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isProcessing || !withdrawAmount}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white py-2 rounded-lg transition-colors"
                >
                  {isProcessing ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultManager;