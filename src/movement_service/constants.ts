export const MODULE_ADDRESS = "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189";

export const CONTRACT_MODULE = "MoveDAO-Contract-finalversion";

// Latest Movement Network endpoints (updated 2025)
export const NETWORK_CONFIG = {
  // Primary testnet endpoint with timeout settings
  fullnode: "https://full.testnet.movementinfra.xyz/v1",
  // GraphQL indexer endpoint
  indexer: "https://indexer.testnet.movementnetwork.xyz/v1/graphql", 
  // Network details
  chainId: 250,
  // Faucet endpoints
  faucet: "https://faucet.testnet.movementinfra.xyz/",
  faucetUI: "https://faucet.movementnetwork.xyz/",
  // Explorer
  explorer: "https://explorer.movementnetwork.xyz/?network=bardock+testnet",
  // Network status
  status: "https://status.movementnetwork.xyz/",
  // Client configuration
  requestTimeout: 30000, // 30 seconds
  retryAttempts: 3
};