;; DeFiStorage - Decentralized File Storage Marketplace
;; A trustless marketplace for storage providers and users

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant PLATFORM-FEE-RATE u50) ;; 0.5% = 50/10000
(define-constant FEE-DENOMINATOR u10000)

;; Error codes
(define-constant ERR-PROVIDER-NOT-FOUND (err u100))
(define-constant ERR-INSUFFICIENT-STORAGE (err u101))
(define-constant ERR-INVALID-PAYMENT (err u102))
(define-constant ERR-CONTRACT-NOT-FOUND (err u103))
(define-constant ERR-UNAUTHORIZED (err u104))
(define-constant ERR-LISTING-NOT-AVAILABLE (err u105))
(define-constant ERR-FILE-NOT-FOUND (err u106))
(define-constant ERR-DISPUTE-RESOLVED (err u107))

;; Data Variables
(define-data-var next-listing-id uint u1)
(define-data-var next-contract-id uint u1)
(define-data-var next-file-id uint u1)
(define-data-var next-dispute-id uint u1)

;; Data Maps

;; Storage Providers
(define-map storage-providers
  principal
  {
    total-space: uint,
    available-space: uint,
    price-per-gb: uint,
    reputation-score: uint,
    total-contracts: uint,
    successful-contracts: uint,
    is-active: bool
  }
)

;; Storage Listings
(define-map storage-listings
  uint
  {
    provider: principal,
    space-gb: uint,
    price-per-gb: uint,
    duration-days: uint,
    is-active: bool,
    created-at: uint
  }
)

;; Storage Contracts
(define-map storage-contracts
  uint
  {
    listing-id: uint,
    provider: principal,
    buyer: principal,
    space-gb: uint,
    total-price: uint,
    platform-fee: uint,
    start-block: uint,
    duration-days: uint,
    is-completed: bool,
    is-disputed: bool
  }
)

;; File Metadata
(define-map file-metadata
  uint
  {
    contract-id: uint,
    file-hash: (buff 32),
    file-size: uint,
    file-name: (string-ascii 256),
    encryption-key: (buff 32),
    uploaded-at: uint,
    uploader: principal
  }
)

;; Disputes
(define-map disputes
  uint
  {
    contract-id: uint,
    complainant: principal,
    reason: (string-ascii 500),
    is-resolved: bool,
    resolution: (optional (string-ascii 500)),
    created-at: uint
  }
)

;; Provider Registration Functions

;; Register as a storage provider
(define-public (register-provider (total-space uint) (price-per-gb uint))
  (let ((existing-provider (map-get? storage-providers tx-sender)))
    (if (is-some existing-provider)
      (err u104) ;; Already registered
      (begin
        (map-set storage-providers tx-sender
          {
            total-space: total-space,
            available-space: total-space,
            price-per-gb: price-per-gb,
            reputation-score: u100, ;; Start with 100% reputation
            total-contracts: u0,
            successful-contracts: u0,
            is-active: true
          }
        )
        (ok true)
      )
    )
  )
)

;; Update provider information
(define-public (update-provider-info (total-space uint) (price-per-gb uint))
  (let ((provider-info (unwrap! (map-get? storage-providers tx-sender) ERR-PROVIDER-NOT-FOUND)))
    (map-set storage-providers tx-sender
      (merge provider-info
        {
          total-space: total-space,
          price-per-gb: price-per-gb
        }
      )
    )
    (ok true)
  )
)

;; Get provider information
(define-read-only (get-provider-info (provider principal))
  (map-get? storage-providers provider)
)

;; Storage Listing Functions

;; Create a storage listing
(define-public (create-listing (space-gb uint) (price-per-gb uint) (duration-days uint))
  (let (
    (listing-id (var-get next-listing-id))
    (provider-info (unwrap! (map-get? storage-providers tx-sender) ERR-PROVIDER-NOT-FOUND))
  )
    (asserts! (get is-active provider-info) ERR-UNAUTHORIZED)
    (asserts! (>= (get available-space provider-info) space-gb) ERR-INSUFFICIENT-STORAGE)
    
    (map-set storage-listings listing-id
      {
        provider: tx-sender,
        space-gb: space-gb,
        price-per-gb: price-per-gb,
        duration-days: duration-days,
        is-active: true,
        created-at: block-height
      }
    )
    
    ;; Update provider's available space
    (map-set storage-providers tx-sender
      (merge provider-info
        {
          available-space: (- (get available-space provider-info) space-gb)
        }
      )
    )
    
    (var-set next-listing-id (+ listing-id u1))
    (ok listing-id)
  )
)

;; Update a storage listing
(define-public (update-listing (listing-id uint) (space-gb uint) (price-per-gb uint) (duration-days uint))
  (let (
    (listing (unwrap! (map-get? storage-listings listing-id) ERR-CONTRACT-NOT-FOUND))
    (provider-info (unwrap! (map-get? storage-providers tx-sender) ERR-PROVIDER-NOT-FOUND))
  )
    (asserts! (is-eq (get provider listing) tx-sender) ERR-UNAUTHORIZED)
    (asserts! (get is-active listing) ERR-LISTING-NOT-AVAILABLE)
    
    ;; Calculate space difference and update provider's available space
    (let ((space-diff (- space-gb (get space-gb listing))))
      (asserts! (>= (get available-space provider-info) space-diff) ERR-INSUFFICIENT-STORAGE)
      
      (map-set storage-listings listing-id
        (merge listing
          {
            space-gb: space-gb,
            price-per-gb: price-per-gb,
            duration-days: duration-days
          }
        )
      )
      
      (map-set storage-providers tx-sender
        (merge provider-info
          {
            available-space: (- (get available-space provider-info) space-diff)
          }
        )
      )
      
      (ok true)
    )
  )
)

;; Get listing information
(define-read-only (get-listing (listing-id uint))
  (map-get? storage-listings listing-id)
)

;; Storage Contract Functions

;; Purchase storage from a listing
(define-public (purchase-storage (listing-id uint) (space-gb uint))
  (let (
    (listing (unwrap! (map-get? storage-listings listing-id) ERR-CONTRACT-NOT-FOUND))
    (provider-info (unwrap! (map-get? storage-providers (get provider listing)) ERR-PROVIDER-NOT-FOUND))
    (contract-id (var-get next-contract-id))
    (total-price (* space-gb (get price-per-gb listing)))
    (platform-fee (/ (* total-price PLATFORM-FEE-RATE) FEE-DENOMINATOR))
    (provider-payment (- total-price platform-fee))
  )
    (asserts! (get is-active listing) ERR-LISTING-NOT-AVAILABLE)
    (asserts! (<= space-gb (get space-gb listing)) ERR-INSUFFICIENT-STORAGE)
    (asserts! (get is-active provider-info) ERR-PROVIDER-NOT-FOUND)

    ;; Transfer payment from buyer to provider and platform
    (try! (stx-transfer? provider-payment tx-sender (get provider listing)))
    (try! (stx-transfer? platform-fee tx-sender CONTRACT-OWNER))

    ;; Create storage contract
    (map-set storage-contracts contract-id
      {
        listing-id: listing-id,
        provider: (get provider listing),
        buyer: tx-sender,
        space-gb: space-gb,
        total-price: total-price,
        platform-fee: platform-fee,
        start-block: block-height,
        duration-days: (get duration-days listing),
        is-completed: false,
        is-disputed: false
      }
    )

    ;; Update listing space if fully consumed
    (if (is-eq space-gb (get space-gb listing))
      (map-set storage-listings listing-id
        (merge listing { is-active: false })
      )
      (map-set storage-listings listing-id
        (merge listing { space-gb: (- (get space-gb listing) space-gb) })
      )
    )

    ;; Update provider stats
    (map-set storage-providers (get provider listing)
      (merge provider-info
        {
          total-contracts: (+ (get total-contracts provider-info) u1)
        }
      )
    )

    (var-set next-contract-id (+ contract-id u1))
    (ok contract-id)
  )
)

;; Complete a storage contract
(define-public (complete-contract (contract-id uint))
  (let (
    (contract (unwrap! (map-get? storage-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
    (provider-info (unwrap! (map-get? storage-providers (get provider contract)) ERR-PROVIDER-NOT-FOUND))
  )
    (asserts! (or (is-eq tx-sender (get provider contract)) (is-eq tx-sender (get buyer contract))) ERR-UNAUTHORIZED)
    (asserts! (not (get is-completed contract)) ERR-CONTRACT-NOT-FOUND)
    (asserts! (not (get is-disputed contract)) ERR-DISPUTE-RESOLVED)

    ;; Mark contract as completed
    (map-set storage-contracts contract-id
      (merge contract { is-completed: true })
    )

    ;; Update provider reputation (successful completion)
    (let (
      (new-successful (+ (get successful-contracts provider-info) u1))
      (total-contracts (get total-contracts provider-info))
      (new-reputation (/ (* new-successful u100) total-contracts))
    )
      (map-set storage-providers (get provider contract)
        (merge provider-info
          {
            successful-contracts: new-successful,
            reputation-score: new-reputation
          }
        )
      )
    )

    (ok true)
  )
)

;; Get contract information
(define-read-only (get-contract (contract-id uint))
  (map-get? storage-contracts contract-id)
)

;; File Metadata Functions

;; Store file metadata
(define-public (store-file-metadata
  (contract-id uint)
  (file-hash (buff 32))
  (file-size uint)
  (file-name (string-ascii 256))
  (encryption-key (buff 32))
)
  (let (
    (contract (unwrap! (map-get? storage-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
    (file-id (var-get next-file-id))
  )
    (asserts! (is-eq tx-sender (get buyer contract)) ERR-UNAUTHORIZED)
    (asserts! (not (get is-completed contract)) ERR-CONTRACT-NOT-FOUND)

    (map-set file-metadata file-id
      {
        contract-id: contract-id,
        file-hash: file-hash,
        file-size: file-size,
        file-name: file-name,
        encryption-key: encryption-key,
        uploaded-at: block-height,
        uploader: tx-sender
      }
    )

    (var-set next-file-id (+ file-id u1))
    (ok file-id)
  )
)

;; Get file metadata
(define-read-only (get-file-metadata (file-id uint))
  (map-get? file-metadata file-id)
)

;; Get files by contract
(define-read-only (get-files-by-contract (contract-id uint))
  ;; This would typically require iteration, simplified for demo
  ;; In practice, you'd maintain a separate map or use events
  (ok contract-id)
)

;; Dispute Resolution Functions

;; Create a dispute
(define-public (create-dispute (contract-id uint) (reason (string-ascii 500)))
  (let (
    (contract (unwrap! (map-get? storage-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
    (dispute-id (var-get next-dispute-id))
  )
    (asserts! (or (is-eq tx-sender (get provider contract)) (is-eq tx-sender (get buyer contract))) ERR-UNAUTHORIZED)
    (asserts! (not (get is-completed contract)) ERR-CONTRACT-NOT-FOUND)
    (asserts! (not (get is-disputed contract)) ERR-DISPUTE-RESOLVED)

    ;; Mark contract as disputed
    (map-set storage-contracts contract-id
      (merge contract { is-disputed: true })
    )

    ;; Create dispute record
    (map-set disputes dispute-id
      {
        contract-id: contract-id,
        complainant: tx-sender,
        reason: reason,
        is-resolved: false,
        resolution: none,
        created-at: block-height
      }
    )

    (var-set next-dispute-id (+ dispute-id u1))
    (ok dispute-id)
  )
)

;; Resolve a dispute (contract owner only)
(define-public (resolve-dispute (dispute-id uint) (resolution (string-ascii 500)))
  (let (
    (dispute (unwrap! (map-get? disputes dispute-id) ERR-CONTRACT-NOT-FOUND))
    (contract (unwrap! (map-get? storage-contracts (get contract-id dispute)) ERR-CONTRACT-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (asserts! (not (get is-resolved dispute)) ERR-DISPUTE-RESOLVED)

    ;; Mark dispute as resolved
    (map-set disputes dispute-id
      (merge dispute
        {
          is-resolved: true,
          resolution: (some resolution)
        }
      )
    )

    ;; Mark contract as completed and remove dispute flag
    (map-set storage-contracts (get contract-id dispute)
      (merge contract
        {
          is-completed: true,
          is-disputed: false
        }
      )
    )

    (ok true)
  )
)

;; Get dispute information
(define-read-only (get-dispute (dispute-id uint))
  (map-get? disputes dispute-id)
)

;; Utility Functions

;; Get next IDs for external reference
(define-read-only (get-next-listing-id)
  (var-get next-listing-id)
)

(define-read-only (get-next-contract-id)
  (var-get next-contract-id)
)

(define-read-only (get-next-file-id)
  (var-get next-file-id)
)

(define-read-only (get-next-dispute-id)
  (var-get next-dispute-id)
)

;; Get platform statistics
(define-read-only (get-platform-stats)
  {
    total-listings: (- (var-get next-listing-id) u1),
    total-contracts: (- (var-get next-contract-id) u1),
    total-files: (- (var-get next-file-id) u1),
    total-disputes: (- (var-get next-dispute-id) u1),
    platform-fee-rate: PLATFORM-FEE-RATE,
    contract-owner: CONTRACT-OWNER
  }
)

;; Administrative Functions

;; Deactivate a provider (contract owner only)
(define-public (deactivate-provider (provider principal))
  (let ((provider-info (unwrap! (map-get? storage-providers provider) ERR-PROVIDER-NOT-FOUND)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)

    (map-set storage-providers provider
      (merge provider-info { is-active: false })
    )
    (ok true)
  )
)

;; Reactivate a provider (contract owner only)
(define-public (reactivate-provider (provider principal))
  (let ((provider-info (unwrap! (map-get? storage-providers provider) ERR-PROVIDER-NOT-FOUND)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)

    (map-set storage-providers provider
      (merge provider-info { is-active: true })
    )
    (ok true)
  )
)

;; Emergency functions

;; Cancel a listing (provider only)
(define-public (cancel-listing (listing-id uint))
  (let (
    (listing (unwrap! (map-get? storage-listings listing-id) ERR-CONTRACT-NOT-FOUND))
    (provider-info (unwrap! (map-get? storage-providers tx-sender) ERR-PROVIDER-NOT-FOUND))
  )
    (asserts! (is-eq (get provider listing) tx-sender) ERR-UNAUTHORIZED)
    (asserts! (get is-active listing) ERR-LISTING-NOT-AVAILABLE)

    ;; Deactivate listing
    (map-set storage-listings listing-id
      (merge listing { is-active: false })
    )

    ;; Return space to provider
    (map-set storage-providers tx-sender
      (merge provider-info
        {
          available-space: (+ (get available-space provider-info) (get space-gb listing))
        }
      )
    )

    (ok true)
  )
)

;; Contract validation helpers
(define-read-only (is-contract-active (contract-id uint))
  (match (map-get? storage-contracts contract-id)
    contract (and (not (get is-completed contract)) (not (get is-disputed contract)))
    false
  )
)

(define-read-only (is-provider-active (provider principal))
  (match (map-get? storage-providers provider)
    provider-info (get is-active provider-info)
    false
  )
)
