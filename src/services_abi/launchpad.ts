export const ABI = {
  "address": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189",
  "name": "launchpad",
  "friends": [],
  "exposed_functions": [
    {
      "name": "add_single_to_whitelist",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "u8",
        "u64"
      ],
      "return": []
    },
    {
      "name": "add_to_whitelist",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "vector<address>",
        "vector<u8>",
        "vector<u64>"
      ],
      "return": []
    },
    {
      "name": "advance_phase",
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
      "name": "claim_vested_tokens",
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
      "name": "create_launchpad",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64",
        "bool"
      ],
      "return": []
    },
    {
      "name": "create_vesting_schedule",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "u64",
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "emergency_pause",
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
      "name": "emergency_resume",
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
      "name": "get_launchpad_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "u64",
        "u8",
        "bool"
      ]
    },
    {
      "name": "get_purchase_history",
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
      "name": "get_sale_stats",
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
        "u64"
      ]
    },
    {
      "name": "get_timeline",
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
        "u64"
      ]
    },
    {
      "name": "get_vesting_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u64",
        "u64",
        "u64"
      ]
    },
    {
      "name": "get_whitelist_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u8",
        "u64",
        "bool"
      ]
    },
    {
      "name": "is_whitelisted",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "phase_ended",
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
      "name": "phase_presale",
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
      "name": "phase_public_sale",
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
      "name": "phase_setup",
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
      "name": "phase_whitelist",
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
      "name": "purchase_tokens",
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
      "name": "tier_bronze",
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
      "name": "tier_gold",
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
      "name": "tier_platinum",
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
      "name": "tier_silver",
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
      "name": "update_kyc_status",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "bool"
      ],
      "return": []
    },
    {
      "name": "update_timeline",
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
        "u64",
        "u64"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "LaunchpadConfig",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "project_name",
          "type": "0x1::string::String"
        },
        {
          "name": "token_name",
          "type": "0x1::string::String"
        },
        {
          "name": "total_supply",
          "type": "u64"
        },
        {
          "name": "price_per_token",
          "type": "u64"
        },
        {
          "name": "whitelist_start",
          "type": "u64"
        },
        {
          "name": "presale_start",
          "type": "u64"
        },
        {
          "name": "public_sale_start",
          "type": "u64"
        },
        {
          "name": "sale_end",
          "type": "u64"
        },
        {
          "name": "presale_allocation",
          "type": "u64"
        },
        {
          "name": "public_allocation",
          "type": "u64"
        },
        {
          "name": "team_allocation",
          "type": "u64"
        },
        {
          "name": "vesting_start",
          "type": "u64"
        },
        {
          "name": "vesting_cliff_months",
          "type": "u64"
        },
        {
          "name": "vesting_duration_months",
          "type": "u64"
        },
        {
          "name": "current_phase",
          "type": "u8"
        },
        {
          "name": "tokens_sold",
          "type": "u64"
        },
        {
          "name": "funds_raised",
          "type": "u64"
        },
        {
          "name": "is_active",
          "type": "bool"
        },
        {
          "name": "kyc_required",
          "type": "bool"
        }
      ]
    },
    {
      "name": "LaunchpadCreated",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedaoaddrx",
          "type": "address"
        },
        {
          "name": "project_name",
          "type": "0x1::string::String"
        },
        {
          "name": "total_supply",
          "type": "u64"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "LockupConfig",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "lockup_duration",
          "type": "u64"
        },
        {
          "name": "release_percentage",
          "type": "u64"
        }
      ]
    },
    {
      "name": "LockupSettings",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "tier_lockups",
          "type": "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::launchpad::LockupConfig>"
        },
        {
          "name": "default_lockup",
          "type": "u64"
        }
      ]
    },
    {
      "name": "PhaseChanged",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "old_phase",
          "type": "u8"
        },
        {
          "name": "new_phase",
          "type": "u8"
        },
        {
          "name": "changed_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "Purchase",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "buyer",
          "type": "address"
        },
        {
          "name": "amount_tokens",
          "type": "u64"
        },
        {
          "name": "amount_paid",
          "type": "u64"
        },
        {
          "name": "purchase_time",
          "type": "u64"
        },
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "phase",
          "type": "u8"
        }
      ]
    },
    {
      "name": "PurchaseHistory",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "purchases",
          "type": "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::launchpad::Purchase>"
        },
        {
          "name": "total_purchases",
          "type": "u64"
        },
        {
          "name": "buyer_allocations",
          "type": "0x1::simple_map::SimpleMap<address, u64>"
        }
      ]
    },
    {
      "name": "TokenReserve",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "available_tokens",
          "type": "u64"
        },
        {
          "name": "reserved_for_presale",
          "type": "u64"
        },
        {
          "name": "reserved_for_public",
          "type": "u64"
        },
        {
          "name": "reserved_for_team",
          "type": "u64"
        },
        {
          "name": "funds_collected",
          "type": "0x1::coin::Coin<0x1::aptos_coin::AptosCoin>"
        }
      ]
    },
    {
      "name": "TokensClaimed",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "beneficiary",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "claimed_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "TokensPurchased",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "buyer",
          "type": "address"
        },
        {
          "name": "amount_tokens",
          "type": "u64"
        },
        {
          "name": "amount_paid",
          "type": "u64"
        },
        {
          "name": "phase",
          "type": "u8"
        },
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "purchase_time",
          "type": "u64"
        }
      ]
    },
    {
      "name": "VestingSchedule",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "beneficiary",
          "type": "address"
        },
        {
          "name": "total_amount",
          "type": "u64"
        },
        {
          "name": "claimed_amount",
          "type": "u64"
        },
        {
          "name": "start_time",
          "type": "u64"
        },
        {
          "name": "cliff_duration",
          "type": "u64"
        },
        {
          "name": "vesting_duration",
          "type": "u64"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "VestingScheduleCreated",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "beneficiary",
          "type": "address"
        },
        {
          "name": "total_amount",
          "type": "u64"
        },
        {
          "name": "start_time",
          "type": "u64"
        },
        {
          "name": "cliff_duration",
          "type": "u64"
        },
        {
          "name": "vesting_duration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "VestingStorage",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "schedules",
          "type": "0x1::simple_map::SimpleMap<address, 0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::launchpad::VestingSchedule>"
        },
        {
          "name": "total_vested",
          "type": "u64"
        },
        {
          "name": "total_claimed",
          "type": "u64"
        }
      ]
    },
    {
      "name": "Whitelist",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "entries",
          "type": "0x1::simple_map::SimpleMap<address, 0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::launchpad::WhitelistEntry>"
        },
        {
          "name": "total_whitelisted",
          "type": "u64"
        }
      ]
    },
    {
      "name": "WhitelistAdded",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "participant",
          "type": "address"
        },
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "max_allocation",
          "type": "u64"
        },
        {
          "name": "added_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "WhitelistEntry",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "participant",
          "type": "address"
        },
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "max_allocation",
          "type": "u64"
        },
        {
          "name": "kyc_verified",
          "type": "bool"
        },
        {
          "name": "added_at",
          "type": "u64"
        }
      ]
    }
  ]
}