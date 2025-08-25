export const ABI = {
  "address": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189",
  "name": "activity_tracker",
  "friends": [],
  "exposed_functions": [
    {
      "name": "emit_activity",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "u8",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "vector<u8>",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "emit_dao_created",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "0x1::string::String",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "emit_member_joined",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "emit_member_left",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "emit_proposal_created",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "0x1::string::String",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "emit_proposal_voted",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "0x1::string::String",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "emit_stake_activity",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "u64",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "emit_unstake_activity",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address",
        "u64",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "get_activity_by_id",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64"
      ],
      "return": [
        "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::activity_tracker::ActivityRecord"
      ]
    },
    {
      "name": "get_dao_activities",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<u64>"
      ]
    },
    {
      "name": "get_total_activities",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_user_activities",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<u64>"
      ]
    },
    {
      "name": "initialize",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "ActivityEvent",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "activity_id",
          "type": "u64"
        },
        {
          "name": "dao_address",
          "type": "address"
        },
        {
          "name": "activity_type",
          "type": "u8"
        },
        {
          "name": "user_address",
          "type": "address"
        },
        {
          "name": "title",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "metadata",
          "type": "vector<u8>"
        },
        {
          "name": "timestamp",
          "type": "u64"
        },
        {
          "name": "transaction_hash",
          "type": "vector<u8>"
        },
        {
          "name": "block_number",
          "type": "u64"
        }
      ]
    },
    {
      "name": "ActivityRecord",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "dao_address",
          "type": "address"
        },
        {
          "name": "activity_type",
          "type": "u8"
        },
        {
          "name": "user_address",
          "type": "address"
        },
        {
          "name": "title",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "metadata",
          "type": "vector<u8>"
        },
        {
          "name": "timestamp",
          "type": "u64"
        },
        {
          "name": "transaction_hash",
          "type": "vector<u8>"
        },
        {
          "name": "block_number",
          "type": "u64"
        }
      ]
    },
    {
      "name": "ActivityStore",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "activities",
          "type": "0x1::table::Table<u64, 0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::activity_tracker::ActivityRecord>"
        },
        {
          "name": "dao_activities",
          "type": "0x1::table::Table<address, vector<u64>>"
        },
        {
          "name": "user_activities",
          "type": "0x1::table::Table<address, vector<u64>>"
        },
        {
          "name": "next_activity_id",
          "type": "u64"
        },
        {
          "name": "total_activities",
          "type": "u64"
        }
      ]
    },
    {
      "name": "GlobalActivityTracker",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "tracker",
          "type": "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::activity_tracker::ActivityStore>"
        }
      ]
    }
  ]
}