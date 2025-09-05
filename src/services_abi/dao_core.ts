export const ABI = {
  "address": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189",
  "name": "dao_core_file",
  "friends": [],
  "exposed_functions": [
    {
      "name": "add_dao_to_registry",
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
      "name": "check_and_init_registry",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer"
      ],
      "return": []
    },
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
      "name": "create_dao",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "vector<u8>",
        "vector<u8>",
        "vector<address>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "create_dao_launchpad",
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
      "name": "create_dao_mixed",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "vector<address>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "create_dao_with_urls",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "vector<address>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "create_image_from_data",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "vector<u8>"
      ],
      "return": [
        "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::ImageData"
      ]
    },
    {
      "name": "create_image_from_url",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "0x1::string::String"
      ],
      "return": [
        "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::ImageData"
      ]
    },
    {
      "name": "dao_exists",
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
      "name": "execute_dao_creation",
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
      "name": "finalize_council_created_dao",
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
      "name": "get_all_daos",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::DAOSummary>"
      ]
    },
    {
      "name": "get_council_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>",
        "u64"
      ]
    },
    {
      "name": "get_council_member_count",
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
      "name": "get_council_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>"
      ]
    },
    {
      "name": "get_dao_creation_proposal",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "u64",
        "address",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "u64",
        "u64",
        "u64",
        "bool",
        "bool"
      ]
    },
    {
      "name": "get_dao_creation_proposal_count",
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
      "name": "get_dao_info",
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
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "u64"
      ]
    },
    {
      "name": "get_dao_info_legacy",
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
        "vector<u8>",
        "vector<u8>",
        "u64"
      ]
    },
    {
      "name": "get_dao_info_with_subname",
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
        "0x1::string::String",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "u64"
      ]
    },
    {
      "name": "get_daos_created_by",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_daos_joined_by",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_daos_paginated",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64"
      ],
      "return": [
        "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::DAOSummary>"
      ]
    },
    {
      "name": "get_initial_council",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_subname_owner",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::string::String"
      ],
      "return": [
        "address"
      ]
    },
    {
      "name": "get_total_dao_count",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_total_subnames",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_treasury_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>"
      ]
    },
    {
      "name": "get_user_daos",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>",
        "vector<address>"
      ]
    },
    {
      "name": "has_voted_on_dao_creation",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64",
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "init_council_dao_creation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "u64"
      ],
      "return": []
    },
    {
      "name": "init_dao_registry",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer"
      ],
      "return": []
    },
    {
      "name": "is_council_member",
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
      "name": "is_dao_creation_registry_initialized",
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
      "name": "is_registry_functional",
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
      "name": "is_registry_initialized",
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
      "name": "is_subname_registry_initialized",
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
      "name": "is_subname_taken",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::string::String"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "manage_launchpad_whitelist",
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
      "name": "propose_dao_creation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "vector<u8>",
        "vector<u8>",
        "vector<address>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "propose_dao_creation_with_urls",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "vector<address>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "vote_on_dao_creation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64",
        "bool"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "CouncilDAOCreated",
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
          "name": "creating_council",
          "type": "address"
        },
        {
          "name": "proposal_id",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "yes_votes",
          "type": "u64"
        },
        {
          "name": "total_council_size",
          "type": "u64"
        }
      ]
    },
    {
      "name": "CouncilDAOCreationRegistry",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "proposals",
          "type": "vector<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::DAOCreationProposalData>"
        },
        {
          "name": "next_proposal_id",
          "type": "u64"
        },
        {
          "name": "voting_duration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAOCreated",
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
          "name": "creator",
          "type": "address"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "initial_council_size",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAOCreationProposal",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "proposal_id",
          "type": "u64"
        },
        {
          "name": "proposing_council",
          "type": "address"
        },
        {
          "name": "proposer",
          "type": "address"
        },
        {
          "name": "target_movedaoaddrxess",
          "type": "address"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAOCreationProposalData",
      "is_native": false,
      "abilities": [
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "proposer",
          "type": "address"
        },
        {
          "name": "target_movedaoaddrxess",
          "type": "address"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "logo",
          "type": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::ImageData"
        },
        {
          "name": "background",
          "type": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::ImageData"
        },
        {
          "name": "initial_council",
          "type": "vector<address>"
        },
        {
          "name": "min_stake_to_join",
          "type": "u64"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "voting_deadline",
          "type": "u64"
        },
        {
          "name": "yes_votes",
          "type": "u64"
        },
        {
          "name": "no_votes",
          "type": "u64"
        },
        {
          "name": "voted_members",
          "type": "vector<address>"
        },
        {
          "name": "executed",
          "type": "bool"
        },
        {
          "name": "approved",
          "type": "bool"
        }
      ]
    },
    {
      "name": "DAOInfo",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "logo",
          "type": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::ImageData"
        },
        {
          "name": "background",
          "type": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::dao_core_file::ImageData"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "council",
          "type": "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>"
        },
        {
          "name": "treasury",
          "type": "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::treasury::Treasury>"
        },
        {
          "name": "initial_council",
          "type": "vector<address>"
        }
      ]
    },
    {
      "name": "DAORegistered",
      "is_native": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "dao_address",
          "type": "address"
        },
        {
          "name": "registered_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAORegistry",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "dao_addresses",
          "type": "vector<address>"
        },
        {
          "name": "total_daos",
          "type": "u64"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAOSummary",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "address",
          "type": "address"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "ImageData",
      "is_native": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "is_url",
          "type": "bool"
        },
        {
          "name": "url",
          "type": "0x1::string::String"
        },
        {
          "name": "data",
          "type": "vector<u8>"
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
          "name": "movedaoaddrxess",
          "type": "address"
        },
        {
          "name": "creator",
          "type": "address"
        },
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
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "SubnameRegistry",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "used_subnames",
          "type": "0x1::simple_map::SimpleMap<0x1::string::String, address>"
        },
        {
          "name": "total_subnames",
          "type": "u64"
        }
      ]
    }
  ]
}