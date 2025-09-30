interface FungibleAssetInfo {
  symbol: string;
  name: string;
  decimals: number;
  asset_type: string;
}

interface GraphQLResponse {
  data: {
    fungible_asset_metadata: FungibleAssetInfo[];
  };
}

const GRAPHQL_ENDPOINT = 'https://hasura.testnet.movementnetwork.xyz/v1/graphql/v1/graphql';

export const fetchFungibleAssetInfo = async (assetTypes: string[]): Promise<FungibleAssetInfo[]> => {
  const query = `
    query GetFungibleAssetInfo($in: [String!], $offset: Int) {
      fungible_asset_metadata(
        where: { asset_type: { _in: $in } }
        offset: $offset
        limit: 100
      ) {
        symbol
        name
        decimals
        asset_type
        __typename
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          in: assetTypes,
          offset: 0
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const result: GraphQLResponse = await response.json();
    return result.data.fungible_asset_metadata || [];
  } catch (error) {
    console.error('Failed to fetch fungible asset info:', error);
    return [];
  }
};

export const fetchSingleAssetInfo = async (assetType: string): Promise<FungibleAssetInfo | null> => {
  const results = await fetchFungibleAssetInfo([assetType]);
  return results.length > 0 ? results[0] : null;
};