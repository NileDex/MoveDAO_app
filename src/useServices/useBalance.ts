import { aptosClient } from '../movement_service/movement-client';

export class BalanceService {
  private static readonly APTOS_COIN_STORE_TYPE = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>';
  private static readonly APTOS_COIN_TYPE = '0x1::aptos_coin::AptosCoin';
  private static readonly OCTAS_TO_MOVE = 100000000; // 1e8 - Aptos/MOVE has 8 decimals (Octas)

  /**
   * Get wallet balance using multiple fallback methods
   */
  static async getWalletBalance(address: string): Promise<number> {
    if (!address) {
      console.warn('No address provided for balance check');
      return 0;
    }

    try {
      // Method 1: Try direct account resource query
      const balance = await this.getBalanceFromAccountResource(address);
      if (balance !== null) {
        console.log(`Balance from account resource: ${balance} MOVE`);
        return balance;
      }
    } catch (error) {
      console.log('Method 1 failed, trying method 2...', error);
    }

    try {
      // Method 2: Try view function call
      const balance = await this.getBalanceFromViewFunction(address);
      if (balance !== null) {
        console.log(`Balance from view function: ${balance} MOVE`);
        return balance;
      }
    } catch (error) {
      console.log('Method 2 failed, trying method 3...', error);
    }

    try {
      // Method 3: Try account resources list search
      const balance = await this.getBalanceFromAccountResources(address);
      if (balance !== null) {
        console.log(`Balance from account resources: ${balance} MOVE`);
        return balance;
      }
    } catch (error) {
      console.log('Method 3 failed, trying method 4...', error);
    }

    try {
      // Method 4: Try account info with coins
      const balance = await this.getBalanceFromAccountInfo(address);
      if (balance !== null) {
        console.log(`Balance from account info: ${balance} MOVE`);
        return balance;
      }
    } catch (error) {
      console.log('All balance fetching methods failed', error);
    }

    console.warn(`Unable to fetch balance for address ${address}`);
    return 0;
  }

  /**
   * Method 1: Get balance from account resource
   */
  private static async getBalanceFromAccountResource(address: string): Promise<number | null> {
    try {
      const resource = await aptosClient.getAccountResource({
        accountAddress: address,
        resourceType: this.APTOS_COIN_STORE_TYPE,
      });
      
      const value = (resource.data as any)?.coin?.value;
      if (value !== undefined && value !== null) {
        return Number(value) / this.OCTAS_TO_MOVE;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Method 2: Get balance using view function
   */
  private static async getBalanceFromViewFunction(address: string): Promise<number | null> {
    try {
      const result = await aptosClient.view({
        payload: {
          function: '0x1::coin::balance',
          typeArguments: [this.APTOS_COIN_TYPE],
          functionArguments: [address],
        },
      });
      
      if (result && result[0] !== undefined) {
        return Number(result[0]) / this.OCTAS_TO_MOVE;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Method 3: Get balance from account resources list
   */
  private static async getBalanceFromAccountResources(address: string): Promise<number | null> {
    try {
      const resources = await aptosClient.getAccountResources({
        accountAddress: address,
      });
      
      if (!Array.isArray(resources)) return null;
      
      // Look for AptosCoin store
      const aptosCoinStore: any = resources.find((resource: any) => 
        resource?.type === this.APTOS_COIN_STORE_TYPE
      );
      
      if ((aptosCoinStore as any)?.data?.coin?.value) {
        return Number((aptosCoinStore as any).data.coin.value) / this.OCTAS_TO_MOVE;
      }
      
      // Fallback: Look for any coin store with value
      const anyCoinStore: any = resources.find((resource: any) => 
        resource?.type?.startsWith('0x1::coin::CoinStore<') && 
        resource?.data?.coin?.value
      );
      
      if ((anyCoinStore as any)?.data?.coin?.value) {
        return Number((anyCoinStore as any).data.coin.value) / this.OCTAS_TO_MOVE;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Method 4: Get balance from account info
   */
  private static async getBalanceFromAccountInfo(address: string): Promise<number | null> {
    try {
      const accountInfo = await aptosClient.getAccountInfo({
        accountAddress: address,
      });
      
      // Check if account info has balance information
      if ((accountInfo as any)?.balance !== undefined) {
        return Number((accountInfo as any).balance) / this.OCTAS_TO_MOVE;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Register AptosCoin for an account if not already registered
   */
  static async ensureAptosCoinRegistered(
    address: string, 
    signAndSubmitTransaction: any
  ): Promise<boolean> {
    try {
      // Check if AptosCoin is already registered
      await aptosClient.getAccountResource({
        accountAddress: address,
        resourceType: this.APTOS_COIN_STORE_TYPE,
      });
      return true; // Already registered
    } catch {
      // Not registered, need to register
      try {
        const registerPayload = {
          function: '0x1::coin::register',
          typeArguments: [this.APTOS_COIN_TYPE],
          functionArguments: [],
        };
        
        const tx = await signAndSubmitTransaction({ payload: registerPayload });
        if (tx?.hash) {
          await aptosClient.waitForTransaction({ 
            transactionHash: tx.hash, 
            options: { checkSuccess: true } 
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to register AptosCoin:', error);
        return false;
      }
    }
  }

  /**
   * Check if account has sufficient balance for transaction
   */
  static async hasSufficientBalance(
    address: string, 
    requiredAmount: number, 
    gasReserve: number = 0.02
  ): Promise<{ sufficient: boolean; available: number; required: number }> {
    const balance = await this.getWalletBalance(address);
    const available = Math.max(0, balance - gasReserve);
    const required = requiredAmount;
    
    return {
      sufficient: available >= required,
      available,
      required
    };
  }

  /**
   * Format balance for display
   */
  static formatBalance(balance: number, decimals: number = 2): string {
    return balance.toFixed(decimals);
  }

  /**
   * Convert MOVE to Octas
   */
  static moveToOctas(moveAmount: number): string {
    return Math.floor(moveAmount * this.OCTAS_TO_MOVE).toString();
  }

  /**
   * Convert Octas to MOVE
   */
  static octasToMove(octasAmount: string | number): number {
    return Number(octasAmount) / this.OCTAS_TO_MOVE;
  }
}