# DeFiStorage - Decentralized File Storage Marketplace

A decentralized file storage marketplace built on the Stacks blockchain using Clarity smart contracts. DeFiStorage enables users to rent storage space from providers in a trustless, transparent manner with built-in dispute resolution and reputation systems.

## Features

### Core Functionality
- **Provider Registration**: Storage providers can register with space allocation, pricing, and reputation tracking
- **Storage Listings**: Create and manage storage offerings with customizable terms
- **Automated Payments**: Secure payment processing with 0.5% platform fees
- **File Metadata Storage**: Store file information including hash, size, name, and encryption keys
- **Dispute Resolution**: Contract owner arbitration system for resolving conflicts
- **Reputation System**: Dynamic reputation scoring based on contract outcomes

### Data Structures
- `storage-providers`: Provider information with space, pricing, and reputation
- `storage-listings`: Available storage offerings with terms and conditions
- `storage-contracts`: Active storage agreements between users and providers
- `file-metadata`: File information with cryptographic hashes and metadata

## Smart Contract Architecture

### Error Codes
- `100`: Provider not found
- `101`: Insufficient storage space
- `102`: Invalid payment amount
- `103`: Contract not found
- `104`: Unauthorized access
- `105`: Listing not available
- `106`: File not found
- `107`: Dispute already resolved

### Public Functions

#### Provider Management
- `register-provider(space, price-per-gb)`: Register as a storage provider
- `update-provider-info(space, price-per-gb)`: Update provider information
- `get-provider-info(provider)`: Retrieve provider details

#### Storage Listings
- `create-listing(space-gb, price-per-gb, duration-days)`: Create storage offering
- `update-listing(listing-id, space-gb, price-per-gb, duration-days)`: Update listing
- `get-listing(listing-id)`: Retrieve listing details

#### Storage Contracts
- `purchase-storage(listing-id, space-gb)`: Purchase storage from a listing
- `complete-contract(contract-id)`: Mark contract as completed
- `get-contract(contract-id)`: Retrieve contract details

#### File Management
- `store-file-metadata(contract-id, file-hash, file-size, file-name, encryption-key)`: Store file information
- `get-file-metadata(file-id)`: Retrieve file metadata

#### Dispute Resolution
- `create-dispute(contract-id, reason)`: Create a dispute for a contract
- `resolve-dispute(dispute-id, resolution)`: Resolve dispute (contract owner only)

## Usage Examples

### Register as Storage Provider
```clarity
(contract-call? .defi-storage register-provider u1000 u50) ;; 1TB space at 50 STX per GB
```

### Create Storage Listing
```clarity
(contract-call? .defi-storage create-listing u100 u45 u30) ;; 100GB for 30 days at 45 STX/GB
```

### Purchase Storage
```clarity
(contract-call? .defi-storage purchase-storage u1 u50) ;; Purchase 50GB from listing #1
```

### Store File Metadata
```clarity
(contract-call? .defi-storage store-file-metadata
  u1
  0x1234567890abcdef
  u1048576
  "document.pdf"
  0xabcdef1234567890)
```

## Development

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) for Clarity development
- [Stacks CLI](https://docs.stacks.co/docs/write-smart-contracts/cli-wallet-quickstart) for deployment

### Setup
1. Clone the repository
2. Install dependencies: `clarinet check`
3. Run tests: `clarinet test`

### Testing
The project includes comprehensive unit tests covering:
- Provider registration and management
- Storage listing operations
- Purchase and payment flows
- File metadata handling
- Dispute resolution
- Error conditions and edge cases

### Deployment
1. Configure deployment settings in `settings/Devnet.toml`
2. Deploy to testnet: `clarinet deploy --testnet`
3. Deploy to mainnet: `clarinet deploy --mainnet`

## Security Considerations

- All payments are handled atomically to prevent partial failures
- Provider reputation affects their ability to receive new contracts
- Dispute resolution provides recourse for unsatisfied parties
- File metadata is stored on-chain for transparency and immutability
- Platform fees are automatically collected to ensure sustainability

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For questions and support, please open an issue on GitHub.
