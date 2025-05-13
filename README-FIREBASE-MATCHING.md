# Firebase Matching System for Dating App

This document explains the implementation of the Firebase-based matching system for our Tinder-like dating app.

## Table of Contents

- [Database Schema](#database-schema)
- [Matching Algorithm](#matching-algorithm)
- [Match Management](#match-management)
- [Optimization](#optimization)
- [Notifications](#notifications)
- [Security](#security)

## Database Schema

The matching system uses Firebase Firestore with the following collections:

### Swipes Collection

This collection stores user swipe actions (likes/passes) with a unique ID format combining both user IDs:

```
swipes/{userId}_{targetUserId}
```

Each swipe document contains:
- `userId`: ID of the user performing the swipe
- `targetUserId`: ID of the user being swiped on
- `action`: String value - "like", "pass", or "superlike"
- `timestamp`: Server timestamp when the swipe occurred

### Matches Collection

This collection stores match information when two users like each other:

```
matches/{matchId}
```

Each match document contains:
- `id`: Unique match ID
- `users`: Array of the two user IDs involved in the match
- `status`: Match status - "active" or "unmatched"
- `createdAt`: Timestamp when the match was created
- `lastInteractionAt`: Timestamp of the last interaction
- `initiatedBy`: User ID of who initiated the match

### Other Supporting Collections

- `users` - User profiles and match-related metadata
- `matches/{matchId}/messages` - Subcollection for messages within a match
- `fcmTokens` - For push notification tokens
- `analytics` - Analytics data for swipes and matches

## Matching Algorithm

The core matching algorithm works as follows:

1. When User A swipes right (likes) User B, a swipe document is created:
   ```
   swipes/{userA}_{userB} = { userId: userA, targetUserId: userB, action: "like", timestamp: now }
   ```

2. The system immediately checks if User B has already liked User A by looking for the document:
   ```
   swipes/{userB}_{userA}
   ```

3. If found with `action: "like"` or `action: "superlike"`, a match is created in the matches collection.

4. Both users are notified about the match via Firebase Cloud Messaging.

This is implemented in the `recordSwipe` function in `services/matchService.ts`.

## Match Management

Matches are tracked with the following attributes:

- Active/inactive status via the `status` field
- Creation timestamp to show when the match occurred
- Last interaction timestamp to track engagement

Users can unmatch by calling the `unmatch` function, which updates the match status to "unmatched" rather than deleting the document.

## Optimization

The implementation includes several optimizations:

1. **Efficient Document IDs**: Swipe documents use a deterministic ID pattern (`{userId}_{targetUserId}`) to enable direct document lookups rather than queries.

2. **Indexing**: Recommended indexes are created for common query patterns:
   - `userId ASC, timestamp DESC` - For retrieving a user's recent swipes
   - `targetUserId ASC, action ASC` - For checking if someone has been liked
   - `userId ASC, action ASC` - For filtering likes/passes

3. **Batched Updates**: When creating matches, a batch write is used to update both users' documents simultaneously.

4. **Real-Time Updates**: Firestore's real-time listeners are used for match displays, reducing unnecessary polling.

## Notifications

The notification system is implemented with:

1. Firebase Cloud Messaging (FCM) for delivering real-time notifications
2. Cloud Functions to handle match events and send notifications
3. Client-side support for registering devices and handling notifications

When a match occurs:
1. The client creates the match document
2. This triggers a Cloud Function to send notifications
3. Both users receive a push notification with match details

## Security

Firestore Security Rules (`firestore.rules`) enforce access control:

1. Users can only create swipes for themselves
2. Users can only read swipes they're involved in
3. Matches can only be read by the involved users
4. Match status can only be updated by involved users

The rules include helper functions for common authorization patterns and validation logic to ensure data integrity.

## Client Implementation

The client-side implementation consists of:

1. **MatchService** (`services/matchService.ts`) - Core Firebase interaction logic
2. **DiscoverScreen** (`app/(tabs)/discover.tsx`) - UI for swiping on profiles
3. **MatchesScreen** (`app/(tabs)/matches.tsx`) - UI for viewing and managing matches
4. **SwipeCards Component** (`components/cards/SwipeCards.tsx`) - Swipe card UI and gestures

## Cloud Functions

The system includes several Cloud Functions:

1. `notifyMatch` - Called when a match is created to send notifications
2. `onMatchCreated` - Triggered when a match document is created
3. `onSwipeAction` - Triggered when a new swipe is recorded
4. `createSwipeIndexes` - Periodic function to verify indexes

## Getting Started

To use this matching system:

1. Ensure Firebase is correctly set up with Firestore and Functions
2. Deploy the Firestore Security Rules in `firestore.rules`
3. Deploy the Cloud Functions in `functions/index.js`
4. Integrate the client-side code into your React Native app

## Best Practices

- Keep the swipes and matches collections well-indexed
- Use batch operations for atomic updates
- Implement retry logic for network failures
- Monitor analytics for performance and usage patterns 