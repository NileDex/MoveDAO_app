export const ABI = {
  "address": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189",
  "name": "platform_stats",
  "friends": [],
  "exposed_functions": [
    {
      "name": "are_stats_complete",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "bool"
      ]
    },
    {
      "name": "get_all_dao_addresses",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_all_dao_stats",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::platform_stats::DAOStats>"
      ]
    },
    {
      "name": "get_dao_detailed_stats",
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
      "name": "get_dao_stats",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::platform_stats::DAOStats"
      ]
    },
    {
      "name": "get_multiple_dao_stats",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "vector<address>"
      ],
      "return": [
        "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::platform_stats::DAOStats>"
      ]
    },
    {
      "name": "get_platform_overview",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64",
        "u64",
        "u64",
        "u64",
        "u64"
      ]
    },
    {
      "name": "get_platform_stats",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::platform_stats::PlatformStatsData"
      ]
    },
    {
      "name": "get_stats_status",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "vector<u8>"
      ]
    },
    {
      "name": "get_total_daos",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    }
  ],
  "structs": [
    {
      "name": "DAOStats",
      "is_native": false,
      "abilities": [
        "copy",
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
          "name": "active_proposals",
          "type": "u64"
        },
        {
          "name": "total_proposals",
          "type": "u64"
        },
        {
          "name": "total_members",
          "type": "u64"
        },
        {
          "name": "total_votes",
          "type": "u64"
        }
      ]
    },
    {
      "name": "PlatformStatsData",
      "is_native": false,
      "abilities": [
        "copy",
        "drop"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "total_daos",
          "type": "u64"
        },
        {
          "name": "total_proposals",
          "type": "u64"
        },
        {
          "name": "active_proposals",
          "type": "u64"
        },
        {
          "name": "total_votes_cast",
          "type": "u64"
        },
        {
          "name": "total_community_members",
          "type": "u64"
        }
      ]
    }
  ]
}