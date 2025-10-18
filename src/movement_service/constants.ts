export const MODULE_ADDRESS = "0x68a5b5caaa956e8f124cd2f01451c73886dc60b88797ba3da254263bd7a4818b";

export const CONTRACT_MODULE = "MoveDAO-official";

// Latest Movement Network endpoints (updated 2025)
export const NETWORK_CONFIG = {
  // Primary testnet endpoint with timeout settings
  fullnode: "https://testnet.movementnetwork.xyz/v1",
  // GraphQL indexer endpoint
  indexer: "https://hasura.testnet.movementnetwork.xyz/v1/graphql",
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