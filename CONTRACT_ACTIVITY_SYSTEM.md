# Contract-Based Activity Tracking System

## Overview

Yes, it is absolutely possible to achieve recent activities via a contract, and this implementation provides a comprehensive solution that leverages Move contract events for reliable, on-chain activity tracking.

## Architecture

### 1. **Move Contract Events** ✅ Already Implemented

Your existing contracts already emit events for key activities:

#### Core DAO Events (`dao_core.move`)
- `DAOCreated` - When a DAO is created
- `LaunchpadCreated` - When a launchpad is created  
- `DAOCreationProposal` - When a DAO creation proposal is made
- `CouncilDAOCreated` - When a council creates a DAO

#### Membership Events (`membership.move`)
- `MemberJoined` - When someone joins a DAO
- `MemberLeft` - When someone leaves a DAO
- `MinStakeUpdated` - When minimum stake requirements change
- `MinProposalStakeUpdated` - When proposal stake requirements change

#### Proposal Events (`proposal.move`)
- `ProposalCreatedEvent` - When a proposal is created
- `ProposalStatusChangedEvent` - When proposal status changes
- `VoteCastEvent` - When someone votes

#### Rewards Events (`rewards.move`)
- Multiple reward-related events

#### Launchpad Events (`launchpad.move`)
- Multiple launchpad-related events

### 2. **Enhanced Event System** 🆕 Added

#### New Staking Events (`staking.move`)
```move
#[event]
struct StakeEvent has drop, store {
    dao_address: address,
    staker: address,
    amount: u64,
    total_staked: u64,
    timestamp: u64,
    transaction_hash: vector<u8>,
}

#[event]
struct UnstakeEvent has drop, store {
    dao_address: address,
    staker: address,
    amount: u64,
    remaining_staked: u64,
    timestamp: u64,
    transaction_hash: vector<u8>,
}

#[event]
struct RewardClaimedEvent has drop, store {
    dao_address: address,
    staker: address,
    reward_amount: u64,
    timestamp: u64,
    transaction_hash: vector<u8>,
}
```

#### New Treasury Events (`treasury.move`)
```move
#[event]
struct TreasuryDepositEvent has drop, store {
    dao_address: address,
    depositor: address,
    amount: u64,
    new_balance: u64,
    timestamp: u64,
    transaction_hash: vector<u8>,
}

#[event]
struct TreasuryWithdrawalEvent has drop, store {
    dao_address: address,
    withdrawer: address,
    amount: u64,
    remaining_balance: u64,
    timestamp: u64,
    transaction_hash: vector<u8>,
}
```

### 3. **Centralized Activity Tracker** 🆕 Added

#### New Module: `activity_tracker.move`

A dedicated module that provides:
- **Centralized activity logging** across all DAO operations
- **Efficient querying** by DAO, user, or activity type
- **Real-time event emission** for immediate activity tracking
- **Structured data storage** for complex queries

```move
#[event]
struct ActivityEvent has drop, store {
    activity_id: u64,
    dao_address: address,
    activity_type: u8,
    user_address: address,
    title: String,
    description: String,
    amount: u64,
    metadata: vector<u8>,
    timestamp: u64,
    transaction_hash: vector<u8>,
    block_number: u64,
}
```

## Benefits of Contract-Based Activity Tracking

### ✅ **Reliability**
- **On-chain verification** - All activities are cryptographically verified
- **No data loss** - Events are permanently stored on the blockchain
- **Consistency** - Same data available to all clients

### ✅ **Performance**
- **Direct event queries** - No need to parse complex transactions
- **Efficient filtering** - Query by DAO, user, or activity type
- **Real-time updates** - Immediate event emission

### ✅ **Scalability**
- **Decentralized storage** - No centralized database required
- **Indexed queries** - Efficient lookup by multiple criteria
- **Pagination support** - Handle large activity volumes

### ✅ **Developer Experience**
- **Type-safe events** - Structured data with clear schemas
- **Easy integration** - Simple API for frontend consumption
- **Fallback support** - Graceful degradation to transaction parsing

## Implementation Details

### Frontend Integration

#### 1. **Contract Activity Service** (`contractActivity.ts`)
```typescript
// Query contract events directly
const activities = await ContractActivityService.getContractActivities({
  dao_address: daoAddress,
  limit: 50
});

// Real-time subscription
const unsubscribe = ContractActivityService.subscribeToActivities(
  (newActivities) => {
    // Handle new activities
  },
  10000 // 10 second interval
);
```

#### 2. **Enhanced Activity Tracker** (`activityTracker.ts`)
```typescript
// Hybrid approach: contract events first, fallback to transaction parsing
const activities = await ActivityTracker.getDAOActivities(daoAddress, {
  page: 1,
  limit: 50
});
```

### Activity Types

| Type ID | Activity Type | Description |
|---------|---------------|-------------|
| 1 | DAO_CREATED | New DAO created |
| 2 | MEMBER_JOINED | User joined DAO |
| 3 | MEMBER_LEFT | User left DAO |
| 4 | PROPOSAL_CREATED | New proposal created |
| 5 | PROPOSAL_VOTED | User voted on proposal |
| 6 | PROPOSAL_EXECUTED | Proposal executed |
| 7 | STAKE | User staked tokens |
| 8 | UNSTAKE | User unstaked tokens |
| 9 | TREASURY_DEPOSIT | Treasury deposit |
| 10 | TREASURY_WITHDRAWAL | Treasury withdrawal |
| 11 | REWARD_CLAIMED | User claimed rewards |
| 12 | LAUNCHPAD_CREATED | Launchpad created |
| 13 | LAUNCHPAD_INVESTMENT | Launchpad investment |

## Usage Examples

### 1. **Get DAO Activities**
```typescript
// Get recent activities for a specific DAO
const daoActivities = await ContractActivityService.getDAOContractActivities(
  "0x123...",
  { limit: 20 }
);
```

### 2. **Get User Activities**
```typescript
// Get all activities for a specific user
const userActivities = await ContractActivityService.getUserContractActivities(
  "0x456...",
  { limit: 50 }
);
```

### 3. **Real-time Activity Feed**
```typescript
// Subscribe to new activities
const unsubscribe = ContractActivityService.subscribeToActivities(
  (activities) => {
    activities.forEach(activity => {
      console.log(`New activity: ${activity.title}`);
    });
  }
);
```

### 4. **Filtered Queries**
```typescript
// Get only staking activities for a DAO
const stakingActivities = await ContractActivityService.getContractActivities({
  dao_address: "0x123...",
  activity_type: 7, // STAKE
  start_time: Date.now() - 86400000 // Last 24 hours
});
```

## Deployment Steps

### 1. **Deploy Enhanced Contracts**
```bash
cd MoveDAO_v2_/MoveDAO_contract
aptos move compile
aptos move publish
```

### 2. **Initialize Activity Tracker**
```move
// Call this once after deployment
activity_tracker::initialize(account);
```

### 3. **Update Frontend**
```bash
# The new services are already integrated
npm run dev
```

## Migration Strategy

### Phase 1: **Hybrid Approach** (Current)
- Use contract events when available
- Fallback to transaction parsing for historical data
- Gradual migration as new events are emitted

### Phase 2: **Full Contract-Based** (Future)
- All activities via contract events
- Remove transaction parsing fallback
- Optimize for contract-only queries

## Performance Comparison

| Method | Query Speed | Data Reliability | Storage Cost | Complexity |
|--------|-------------|------------------|--------------|------------|
| **Contract Events** | ⚡ Fast | 🔒 High | 💰 Low | 🟢 Simple |
| **Transaction Parsing** | 🐌 Slow | ⚠️ Medium | 💰 High | 🔴 Complex |
| **Hybrid Approach** | ⚡ Fast | 🔒 High | 💰 Medium | 🟡 Medium |

## Conclusion

**Yes, contract-based activity tracking is not only possible but highly recommended** for your MoveDAO application. The implementation provides:

1. **Better performance** - Direct event queries vs transaction parsing
2. **Higher reliability** - On-chain verified data
3. **Easier maintenance** - Structured event system
4. **Future scalability** - Efficient indexing and querying

The hybrid approach ensures backward compatibility while providing the benefits of contract-based tracking for new activities.
