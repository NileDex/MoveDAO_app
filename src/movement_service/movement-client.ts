import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { NETWORK_CONFIG } from "./constants.ts";

const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: NETWORK_CONFIG.fullnode,
  indexer: NETWORK_CONFIG.indexer,
});

const aptosClient = new Aptos(aptosConfig);

export { aptosClient };