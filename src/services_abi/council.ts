export const ABI = {
  "address": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189",
  "name": "council",
  "friends": [],
  "exposed_functions": [
    {
      "name": "add_council_member",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address"
      ],
      "return": []
    },
    {
      "name": "add_council_member_to_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>",
        "address"
      ],
      "return": []
    },
    {
      "name": "get_council_members",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_council_members_from_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_member_count_from_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "init_council",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "vector<address>",
        "u64",
        "u64"
      ],
      "return": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>"
      ]
    },
    {
      "name": "is_council_member",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
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
      "name": "is_council_member_in_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>",
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "remove_council_member",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address"
      ],
      "return": []
    },
    {
      "name": "remove_council_member_from_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::council::CouncilConfig>",
        "address"
      ],
      "return": []
    },
    {
      "name": "replace_council_member",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "CouncilConfig",
      "is_native": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "members",
          "type": "0x1::table::Table<address, bool>"
        },
        {
          "name": "member_count",
          "type": "u64"
        },
        {
          "name": "min_members",
          "type": "u64"
        },
        {
          "name": "max_members",
          "type": "u64"
        }
      ]
    }
  ]
}