// ABI of FeeReceiptRegistry (contracts/FeeReceiptRegistry.sol), copied from the compiled artifact.
export const feeReceiptRegistryAbi = [
  {
    "type": "function",
    "name": "getReceipt",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "receipt",
        "type": "tuple",
        "internalType": "struct FeeReceiptRegistry.Receipt",
        "components": [
          {
            "name": "author",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "timestamp",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "srcDomain",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "dstDomain",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "service",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "forwarded",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalFee",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "receiptCount",
    "inputs": [],
    "outputs": [
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "receiptCountOf",
    "inputs": [
      {
        "name": "author",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "receiptIdsOf",
    "inputs": [
      {
        "name": "author",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "record",
    "inputs": [
      {
        "name": "srcDomain",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "dstDomain",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "service",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "forwarded",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalFee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "routeCount",
    "inputs": [
      {
        "name": "src",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "dst",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "FeeRecorded",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "author",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "srcDomain",
        "type": "uint32",
        "indexed": true,
        "internalType": "uint32"
      },
      {
        "name": "dstDomain",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "service",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "forwarded",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "FeeExceedsAmount",
    "inputs": [
      {
        "name": "totalFee",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidService",
    "inputs": [
      {
        "name": "service",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReceiptNotFound",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SameDomain",
    "inputs": [
      {
        "name": "domain",
        "type": "uint32",
        "internalType": "uint32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  }
] as const
