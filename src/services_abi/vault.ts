export const ABI = {
    "address": "0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189",
    "name": "vault",
    "friends": [],
    "exposed_functions": [
      {
        "name": "create_vault",
        "visibility": "public",
        "is_entry": true,
        "is_view": false,
        "generic_type_params": [],
        "params": [
          "&signer",
          "0x1::object::Object<0x1::fungible_asset::Metadata>"
        ],
        "return": []
      },
      {
        "name": "create_vault_with_return",
        "visibility": "public",
        "is_entry": false,
        "is_view": false,
        "generic_type_params": [],
        "params": [
          "&signer",
          "0x1::object::Object<0x1::fungible_asset::Metadata>"
        ],
        "return": [
          "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::vault::Vault>"
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
          "0x1::object::Object<0x8d5583a22574889575196d064ed454e2a7e0d811ec8fc3fcbeabc30349347189::vault::Vault>",
          "u64"
        ],
        "return": []
      },
      {
        "name": "get_metadata",
        "visibility": "public",
        "is_entry": false,
        "is_view": true,
        "generic_type_params": [],
        "params": [
          "address"
        ],
        "return": [
          "0x1::object::Object<0x1::fungible_asset::Metadata>"
        ]
      },
      {
        "name": "set_strategy",
        "visibility": "public",
        "is_entry": true,
        "is_view": false,
        "generic_type_params": [],
        "params": [
          "&signer",
          "address",
          "address"
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
      }
    ],
    "structs": [
      {
        "name": "Vault",
        "is_native": false,
        "abilities": [
          "key"
        ],
        "generic_type_params": [],
        "fields": [
          {
            "name": "metadata",
            "type": "0x1::object::Object<0x1::fungible_asset::Metadata>"
          },
          {
            "name": "total_assets",
            "type": "u64"
          },
          {
            "name": "idle_assets",
            "type": "u64"
          },
          {
            "name": "strategy",
            "type": "0x1::option::Option<address>"
          },
          {
            "name": "manager",
            "type": "address"
          }
        ]
      },
      {
        "name": "VaultController",
        "is_native": false,
        "abilities": [
          "key"
        ],
        "generic_type_params": [],
        "fields": [
          {
            "name": "extend_ref",
            "type": "0x1::object::ExtendRef"
          }
        ]
      }
    ]
  }