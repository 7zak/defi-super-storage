import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Provider registration works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const provider = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000), // 1TB space
                types.uint(50)    // 50 STX per GB
            ], provider.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), true);
        
        // Check provider info
        let getProvider = chain.callReadOnlyFn(
            'defi-storage',
            'get-provider-info',
            [types.principal(provider.address)],
            deployer.address
        );
        
        const providerInfo = getProvider.result.expectSome().expectTuple();
        assertEquals(providerInfo['total-space'], types.uint(1000));
        assertEquals(providerInfo['available-space'], types.uint(1000));
        assertEquals(providerInfo['price-per-gb'], types.uint(50));
        assertEquals(providerInfo['reputation-score'], types.uint(100));
        assertEquals(providerInfo['is-active'], types.bool(true));
    },
});

Clarinet.test({
    name: "Cannot register provider twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(2000),
                types.uint(60)
            ], provider.address)
        ]);
        
        assertEquals(block.receipts.length, 2);
        assertEquals(block.receipts[0].result.expectOk(), true);
        assertEquals(block.receipts[1].result.expectErr(), types.uint(104)); // ERR-UNAUTHORIZED
    },
});

Clarinet.test({
    name: "Provider can update their information",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'update-provider-info', [
                types.uint(2000),
                types.uint(45)
            ], provider.address)
        ]);
        
        assertEquals(block.receipts.length, 2);
        assertEquals(block.receipts[0].result.expectOk(), true);
        assertEquals(block.receipts[1].result.expectOk(), true);
        
        // Check updated info
        let getProvider = chain.callReadOnlyFn(
            'defi-storage',
            'get-provider-info',
            [types.principal(provider.address)],
            provider.address
        );
        
        const providerInfo = getProvider.result.expectSome().expectTuple();
        assertEquals(providerInfo['total-space'], types.uint(2000));
        assertEquals(providerInfo['price-per-gb'], types.uint(45));
    },
});

Clarinet.test({
    name: "Provider can create storage listing",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100), // 100GB
                types.uint(45),  // 45 STX per GB
                types.uint(30)   // 30 days
            ], provider.address)
        ]);
        
        assertEquals(block.receipts.length, 2);
        assertEquals(block.receipts[0].result.expectOk(), true);
        assertEquals(block.receipts[1].result.expectOk(), types.uint(1)); // listing ID
        
        // Check listing info
        let getListing = chain.callReadOnlyFn(
            'defi-storage',
            'get-listing',
            [types.uint(1)],
            provider.address
        );
        
        const listingInfo = getListing.result.expectSome().expectTuple();
        assertEquals(listingInfo['provider'], types.principal(provider.address));
        assertEquals(listingInfo['space-gb'], types.uint(100));
        assertEquals(listingInfo['price-per-gb'], types.uint(45));
        assertEquals(listingInfo['duration-days'], types.uint(30));
        assertEquals(listingInfo['is-active'], types.bool(true));
    },
});

Clarinet.test({
    name: "Cannot create listing with insufficient space",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(100), // Only 100GB
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(200), // Trying to list 200GB
                types.uint(45),
                types.uint(30)
            ], provider.address)
        ]);
        
        assertEquals(block.receipts.length, 2);
        assertEquals(block.receipts[0].result.expectOk(), true);
        assertEquals(block.receipts[1].result.expectErr(), types.uint(101)); // ERR-INSUFFICIENT-STORAGE
    },
});

Clarinet.test({
    name: "User can purchase storage successfully",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100),
                types.uint(45),
                types.uint(30)
            ], provider.address),
            Tx.contractCall('defi-storage', 'purchase-storage', [
                types.uint(1), // listing ID
                types.uint(50) // 50GB
            ], buyer.address)
        ]);
        
        assertEquals(block.receipts.length, 3);
        assertEquals(block.receipts[0].result.expectOk(), true);
        assertEquals(block.receipts[1].result.expectOk(), types.uint(1));
        assertEquals(block.receipts[2].result.expectOk(), types.uint(1)); // contract ID
        
        // Check contract info
        let getContract = chain.callReadOnlyFn(
            'defi-storage',
            'get-contract',
            [types.uint(1)],
            buyer.address
        );
        
        const contractInfo = getContract.result.expectSome().expectTuple();
        assertEquals(contractInfo['provider'], types.principal(provider.address));
        assertEquals(contractInfo['buyer'], types.principal(buyer.address));
        assertEquals(contractInfo['space-gb'], types.uint(50));
        assertEquals(contractInfo['total-price'], types.uint(2250)); // 50 * 45
        assertEquals(contractInfo['is-completed'], types.bool(false));
        assertEquals(contractInfo['is-disputed'], types.bool(false));
    },
});

Clarinet.test({
    name: "Platform fee is calculated correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(100) // 100 STX per GB for easy calculation
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100),
                types.uint(100),
                types.uint(30)
            ], provider.address),
            Tx.contractCall('defi-storage', 'purchase-storage', [
                types.uint(1),
                types.uint(10) // 10GB * 100 STX = 1000 STX total
            ], buyer.address)
        ]);
        
        assertEquals(block.receipts.length, 3);
        assertEquals(block.receipts[2].result.expectOk(), types.uint(1));
        
        let getContract = chain.callReadOnlyFn(
            'defi-storage',
            'get-contract',
            [types.uint(1)],
            buyer.address
        );
        
        const contractInfo = getContract.result.expectSome().expectTuple();
        assertEquals(contractInfo['total-price'], types.uint(1000));
        assertEquals(contractInfo['platform-fee'], types.uint(5)); // 0.5% of 1000 = 5
    },
});

Clarinet.test({
    name: "Contract can be completed successfully",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100),
                types.uint(45),
                types.uint(30)
            ], provider.address),
            Tx.contractCall('defi-storage', 'purchase-storage', [
                types.uint(1),
                types.uint(50)
            ], buyer.address),
            Tx.contractCall('defi-storage', 'complete-contract', [
                types.uint(1)
            ], buyer.address)
        ]);
        
        assertEquals(block.receipts.length, 4);
        assertEquals(block.receipts[3].result.expectOk(), true);
        
        // Check contract is completed
        let getContract = chain.callReadOnlyFn(
            'defi-storage',
            'get-contract',
            [types.uint(1)],
            buyer.address
        );
        
        const contractInfo = getContract.result.expectSome().expectTuple();
        assertEquals(contractInfo['is-completed'], types.bool(true));
        
        // Check provider reputation updated
        let getProvider = chain.callReadOnlyFn(
            'defi-storage',
            'get-provider-info',
            [types.principal(provider.address)],
            provider.address
        );
        
        const providerInfo = getProvider.result.expectSome().expectTuple();
        assertEquals(providerInfo['successful-contracts'], types.uint(1));
        assertEquals(providerInfo['total-contracts'], types.uint(1));
        assertEquals(providerInfo['reputation-score'], types.uint(100));
    },
});

Clarinet.test({
    name: "File metadata can be stored and retrieved",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100),
                types.uint(45),
                types.uint(30)
            ], provider.address),
            Tx.contractCall('defi-storage', 'purchase-storage', [
                types.uint(1),
                types.uint(50)
            ], buyer.address),
            Tx.contractCall('defi-storage', 'store-file-metadata', [
                types.uint(1), // contract ID
                types.buff(new Uint8Array(32).fill(0x12)), // file hash
                types.uint(1048576), // 1MB file size
                types.ascii("document.pdf"),
                types.buff(new Uint8Array(32).fill(0xab)) // encryption key
            ], buyer.address)
        ]);

        assertEquals(block.receipts.length, 4);
        assertEquals(block.receipts[3].result.expectOk(), types.uint(1)); // file ID

        // Check file metadata
        let getFile = chain.callReadOnlyFn(
            'defi-storage',
            'get-file-metadata',
            [types.uint(1)],
            buyer.address
        );

        const fileInfo = getFile.result.expectSome().expectTuple();
        assertEquals(fileInfo['contract-id'], types.uint(1));
        assertEquals(fileInfo['file-size'], types.uint(1048576));
        assertEquals(fileInfo['file-name'], types.ascii("document.pdf"));
        assertEquals(fileInfo['uploader'], types.principal(buyer.address));
    },
});

Clarinet.test({
    name: "Only buyer can store file metadata",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        const unauthorized = accounts.get('wallet_3')!;

        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100),
                types.uint(45),
                types.uint(30)
            ], provider.address),
            Tx.contractCall('defi-storage', 'purchase-storage', [
                types.uint(1),
                types.uint(50)
            ], buyer.address),
            Tx.contractCall('defi-storage', 'store-file-metadata', [
                types.uint(1),
                types.buff(new Uint8Array(32).fill(0x12)),
                types.uint(1048576),
                types.ascii("document.pdf"),
                types.buff(new Uint8Array(32).fill(0xab))
            ], unauthorized.address) // Unauthorized user
        ]);

        assertEquals(block.receipts.length, 4);
        assertEquals(block.receipts[3].result.expectErr(), types.uint(104)); // ERR-UNAUTHORIZED
    },
});

Clarinet.test({
    name: "Dispute can be created and resolved",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const provider = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100),
                types.uint(45),
                types.uint(30)
            ], provider.address),
            Tx.contractCall('defi-storage', 'purchase-storage', [
                types.uint(1),
                types.uint(50)
            ], buyer.address),
            Tx.contractCall('defi-storage', 'create-dispute', [
                types.uint(1), // contract ID
                types.ascii("Provider not responding to file upload requests")
            ], buyer.address)
        ]);

        assertEquals(block.receipts.length, 4);
        assertEquals(block.receipts[3].result.expectOk(), types.uint(1)); // dispute ID

        // Check dispute info
        let getDispute = chain.callReadOnlyFn(
            'defi-storage',
            'get-dispute',
            [types.uint(1)],
            buyer.address
        );

        const disputeInfo = getDispute.result.expectSome().expectTuple();
        assertEquals(disputeInfo['contract-id'], types.uint(1));
        assertEquals(disputeInfo['complainant'], types.principal(buyer.address));
        assertEquals(disputeInfo['is-resolved'], types.bool(false));

        // Resolve dispute as contract owner
        let resolveBlock = chain.mineBlock([
            Tx.contractCall('defi-storage', 'resolve-dispute', [
                types.uint(1),
                types.ascii("Dispute resolved in favor of buyer")
            ], deployer.address)
        ]);

        assertEquals(resolveBlock.receipts.length, 1);
        assertEquals(resolveBlock.receipts[0].result.expectOk(), true);

        // Check dispute is resolved
        let getResolvedDispute = chain.callReadOnlyFn(
            'defi-storage',
            'get-dispute',
            [types.uint(1)],
            buyer.address
        );

        const resolvedDisputeInfo = getResolvedDispute.result.expectSome().expectTuple();
        assertEquals(resolvedDisputeInfo['is-resolved'], types.bool(true));
    },
});

Clarinet.test({
    name: "Only contract owner can resolve disputes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        const unauthorized = accounts.get('wallet_3')!;

        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100),
                types.uint(45),
                types.uint(30)
            ], provider.address),
            Tx.contractCall('defi-storage', 'purchase-storage', [
                types.uint(1),
                types.uint(50)
            ], buyer.address),
            Tx.contractCall('defi-storage', 'create-dispute', [
                types.uint(1),
                types.ascii("Test dispute")
            ], buyer.address),
            Tx.contractCall('defi-storage', 'resolve-dispute', [
                types.uint(1),
                types.ascii("Unauthorized resolution attempt")
            ], unauthorized.address) // Unauthorized user
        ]);

        assertEquals(block.receipts.length, 5);
        assertEquals(block.receipts[4].result.expectErr(), types.uint(104)); // ERR-UNAUTHORIZED
    },
});

Clarinet.test({
    name: "Platform statistics are tracked correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const provider = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall('defi-storage', 'register-provider', [
                types.uint(1000),
                types.uint(50)
            ], provider.address),
            Tx.contractCall('defi-storage', 'create-listing', [
                types.uint(100),
                types.uint(45),
                types.uint(30)
            ], provider.address),
            Tx.contractCall('defi-storage', 'purchase-storage', [
                types.uint(1),
                types.uint(50)
            ], buyer.address)
        ]);

        // Check platform stats
        let getStats = chain.callReadOnlyFn(
            'defi-storage',
            'get-platform-stats',
            [],
            deployer.address
        );

        const stats = getStats.result.expectTuple();
        assertEquals(stats['total-listings'], types.uint(1));
        assertEquals(stats['total-contracts'], types.uint(1));
        assertEquals(stats['platform-fee-rate'], types.uint(50)); // 0.5%
        assertEquals(stats['contract-owner'], types.principal(deployer.address));
    },
});
