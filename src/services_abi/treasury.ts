export const ABI = {
  "address": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189",
  "name": "treasury",
  "friends": [
    "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file"
  ],
  "exposed_functions": [
    {
      "name": "allows_public_deposits",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "can_withdraw_amount",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>",
        "u64"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "deposit",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "deposit_to_object",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "get_balance",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_balance_from_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_daily_withdrawal_status",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>"
      ],
      "return": [
        "u64",
        "u64",
        "u64"
      ]
    },
    {
      "name": "get_treasury_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>"
      ],
      "return": [
        "u64",
        "u64",
        "u64",
        "u64",
        "address",
        "bool"
      ]
    },
    {
      "name": "init_treasury",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer"
      ],
      "return": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>"
      ]
    },
    {
      "name": "set_public_deposits",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>",
        "bool"
      ],
      "return": []
    },
    {
      "name": "withdraw",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "withdraw_from_object",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "withdraw_rewards_from_object",
      "visibility": "friend",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>",
        "u64"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "ReentrancyGuard",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "locked",
          "type": "bool"
        }
      ]
    },
    {
      "name": "Treasury",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "balance",
          "type": "0x1::coin::Coin<0x1::aptos_coin::AptosCoin>"
        },
        {
          "name": "daily_withdrawal_limit",
          "type": "u64"
        },
        {
          "name": "last_withdrawal_day",
          "type": "u64"
        },
        {
          "name": "daily_withdrawn",
          "type": "u64"
        },
        {
          "name": "movedaoaddrxess",
          "type": "address"
        },
        {
          "name": "allow_public_deposits",
          "type": "bool"
        },
        {
          "name": "last_major_withdrawal_time",
          "type": "u64"
        }
      ]
    },
    {
      "name": "TreasuryDepositEvent",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedaoaddrxess",
          "type": "address"
        },
        {
          "name": "depositor",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "new_balance",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        },
        {
          "name": "transaction_hash",
          "type": "vector<u8>"
        }
      ]
    },
    {
      "name": "TreasuryRewardWithdrawalEvent",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedaoaddrxess",
          "type": "address"
        },
        {
          "name": "recipient",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "remaining_balance",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        },
        {
          "name": "transaction_hash",
          "type": "vector<u8>"
        }
      ]
    },
    {
      "name": "TreasuryWithdrawalEvent",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedaoaddrxess",
          "type": "address"
        },
        {
          "name": "withdrawer",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "remaining_balance",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        },
        {
          "name": "transaction_hash",
          "type": "vector<u8>"
        }
      ]
    }
  ]
}