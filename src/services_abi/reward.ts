export const ABI = {
  "address": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189",
  "name": "rewards",
  "friends": [],
  "exposed_functions": [
    {
      "name": "claim_rewards",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address"
      ],
      "return": []
    },
    {
      "name": "claim_rewards_internal",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "distribute_proposal_creation_reward",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "distribute_staking_rewards",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "vector<address>",
        "vector<u64>"
      ],
      "return": []
    },
    {
      "name": "distribute_successful_proposal_reward",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "distribute_voting_reward",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "get_pending_rewards",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::rewards::PendingReward>"
      ]
    },
    {
      "name": "get_reward_config",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u64",
        "u64",
        "u64",
        "u64",
        "u64",
        "bool"
      ]
    },
    {
      "name": "get_total_claimable",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_total_claimed",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "initialize_rewards",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "is_rewards_enabled",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_rewards_initialized",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "reward_proposal_creation",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "reward_proposal_success",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "reward_staking",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "reward_voting",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "toggle_rewards",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "bool"
      ],
      "return": []
    },
    {
      "name": "update_reward_config",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64",
        "u64",
        "u64",
        "u64"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "PendingReward",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "recipient",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "reward_type",
          "type": "u8"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "claimed",
          "type": "bool"
        },
        {
          "name": "proposal_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "RewardClaimed",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "recipient",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "reward_type",
          "type": "u8"
        },
        {
          "name": "claimed_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "RewardConfig",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "voting_reward_per_vote",
          "type": "u64"
        },
        {
          "name": "proposal_creation_reward",
          "type": "u64"
        },
        {
          "name": "successful_proposal_reward",
          "type": "u64"
        },
        {
          "name": "staking_yield_rate",
          "type": "u64"
        },
        {
          "name": "last_staking_distribution",
          "type": "u64"
        },
        {
          "name": "staking_distribution_interval",
          "type": "u64"
        },
        {
          "name": "total_rewards_distributed",
          "type": "u64"
        },
        {
          "name": "enabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "RewardDistributed",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "recipient",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "reward_type",
          "type": "u8"
        },
        {
          "name": "proposal_id",
          "type": "u64"
        },
        {
          "name": "distributed_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "RewardTracker",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "pending_rewards",
          "type": "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::rewards::PendingReward>"
        },
        {
          "name": "claimed_rewards",
          "type": "0x1::simple_map::SimpleMap<address, u64>"
        },
        {
          "name": "next_reward_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "StakingRewardsDistributed",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "total_amount",
          "type": "u64"
        },
        {
          "name": "total_recipients",
          "type": "u64"
        },
        {
          "name": "distributed_at",
          "type": "u64"
        }
      ]
    }
  ]
}