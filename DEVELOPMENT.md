# DeFiStorage Development Guide

## Project Structure

```
defi-storage/
├── contracts/
│   └── DeFiStorage.clar          # Main smart contract
├── tests/
│   └── defi-storage_test.ts      # Comprehensive test suite
├── settings/
│   ├── Devnet.toml              # Local development configuration
│   └── Testnet.toml             # Testnet deployment configuration
├── Clarinet.toml                # Project configuration
├── README.md                    # Project documentation
├── LICENSE                      # MIT License
└── DEVELOPMENT.md               # This file

```

## Smart Contract Architecture

### Core Data Structures

1. **storage-providers**: Maps provider principals to their information
   - `total-space`: Total storage capacity in GB
   - `available-space`: Currently available space in GB
   - `price-per-gb`: Price per GB in microSTX
   - `reputation-score`: Reputation percentage (0-100)
   - `total-contracts`: Total number of contracts
   - `successful-contracts`: Number of successfully completed contracts
   - `is-active`: Whether the provider is active

2. **storage-listings**: Maps listing IDs to storage offerings
   - `provider`: Provider's principal
   - `space-gb`: Available space in GB
   - `price-per-gb`: Price per GB in microSTX
   - `duration-days`: Contract duration in days
   - `is-active`: Whether the listing is active
   - `created-at`: Block height when created

3. **storage-contracts**: Maps contract IDs to storage agreements
   - `listing-id`: Associated listing ID
   - `provider`: Provider's principal
   - `buyer`: Buyer's principal
   - `space-gb`: Purchased space in GB
   - `total-price`: Total price in microSTX
   - `platform-fee`: Platform fee in microSTX
   - `start-block`: Contract start block height
   - `duration-days`: Contract duration in days
   - `is-completed`: Whether the contract is completed
   - `is-disputed`: Whether the contract is disputed

4. **file-metadata**: Maps file IDs to file information
   - `contract-id`: Associated contract ID
   - `file-hash`: SHA-256 hash of the file
   - `file-size`: File size in bytes
   - `file-name`: File name (ASCII string)
   - `encryption-key`: Encryption key for the file
   - `uploaded-at`: Block height when uploaded
   - `uploader`: Principal who uploaded the file

5. **disputes**: Maps dispute IDs to dispute information
   - `contract-id`: Associated contract ID
   - `complainant`: Principal who created the dispute
   - `reason`: Reason for the dispute
   - `is-resolved`: Whether the dispute is resolved
   - `resolution`: Resolution details (optional)
   - `created-at`: Block height when created

### Key Functions

#### Provider Management
- `register-provider`: Register as a storage provider
- `update-provider-info`: Update provider information
- `get-provider-info`: Get provider details

#### Listing Management
- `create-listing`: Create a storage listing
- `update-listing`: Update listing details
- `cancel-listing`: Cancel a listing
- `get-listing`: Get listing details

#### Contract Management
- `purchase-storage`: Purchase storage from a listing
- `complete-contract`: Mark a contract as completed
- `get-contract`: Get contract details

#### File Management
- `store-file-metadata`: Store file metadata
- `get-file-metadata`: Get file metadata

#### Dispute Resolution
- `create-dispute`: Create a dispute
- `resolve-dispute`: Resolve a dispute (owner only)
- `get-dispute`: Get dispute details

#### Administrative Functions
- `deactivate-provider`: Deactivate a provider (owner only)
- `reactivate-provider`: Reactivate a provider (owner only)
- `get-platform-stats`: Get platform statistics

### Error Codes

- `100`: Provider not found
- `101`: Insufficient storage space
- `102`: Invalid payment amount
- `103`: Contract not found
- `104`: Unauthorized access
- `105`: Listing not available
- `106`: File not found
- `107`: Dispute already resolved

## Development Workflow

### Setup
1. Install Clarinet: `curl -L https://github.com/hirosystems/clarinet/releases/download/v1.0.0/clarinet-linux-x64.tar.gz | tar xz`
2. Clone the repository
3. Run `clarinet check` to validate the contract
4. Run `clarinet test` to execute the test suite

### Testing
The test suite covers:
- Provider registration and management
- Storage listing operations
- Purchase and payment flows
- File metadata handling
- Dispute resolution
- Error conditions and edge cases
- Platform fee calculations
- Reputation system updates

### Deployment
1. Configure your deployment account in `settings/Testnet.toml`
2. Deploy to testnet: `clarinet deploy --testnet`
3. Verify deployment and test functionality

## Security Considerations

### Payment Security
- All payments are atomic using STX transfers
- Platform fees are automatically deducted
- Failed payments revert the entire transaction

### Access Control
- Only registered providers can create listings
- Only contract parties can complete contracts
- Only contract owner can resolve disputes
- File metadata can only be stored by the buyer

### Reputation System
- Reputation is calculated as successful_contracts / total_contracts * 100
- Reputation affects provider visibility and trustworthiness
- Disputes can impact reputation if resolved against the provider

### Data Integrity
- File hashes ensure data integrity
- Encryption keys are stored securely on-chain
- Contract terms are immutable once created

## Best Practices

### For Providers
1. Set competitive pricing based on market rates
2. Maintain high uptime and service quality
3. Respond promptly to buyer requests
4. Keep adequate available space

### For Buyers
1. Verify provider reputation before purchasing
2. Store file metadata promptly after upload
3. Use strong encryption for sensitive files
4. Monitor contract status regularly

### For Platform Operators
1. Monitor dispute resolution times
2. Adjust platform fees based on usage
3. Implement additional security measures as needed
4. Maintain clear terms of service

## Future Enhancements

### Potential Features
1. Automated contract renewal
2. Multi-signature dispute resolution
3. Reputation-based pricing discounts
4. File sharing and access control
5. Integration with IPFS or other storage networks
6. Staking mechanisms for providers
7. Insurance pools for buyer protection

### Scalability Improvements
1. Batch operations for multiple files
2. Off-chain metadata storage with on-chain hashes
3. Layer 2 solutions for micro-transactions
4. Optimized data structures for large-scale usage
