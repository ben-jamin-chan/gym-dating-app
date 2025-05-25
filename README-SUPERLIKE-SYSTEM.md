# Super Like System Implementation

This document describes the comprehensive Super Like system implemented for the SwoleMates dating app.

## Overview

The Super Like system allows users to express heightened interest in potential matches with a limited daily allowance. Each user gets 3 Super Likes per day that reset at midnight UTC.

## Features

- **Daily Limit**: 3 Super Likes per user per day
- **Automatic Reset**: Resets at midnight UTC daily
- **Real-time Updates**: Live counter updates across the app
- **Duplicate Prevention**: Users cannot super like the same person twice in one day
- **Visual Feedback**: Clear UI indicators for remaining Super Likes
- **Push Notifications**: Recipients get notified when they receive a Super Like
- **Analytics**: Comprehensive tracking of Super Like usage

## Architecture

### Database Collections

#### `superLikes` Collection
Stores daily Super Like data for each user:
```javascript
{
  userId: string,           // User ID
  usedCount: number,        // Number of Super Likes used today
  totalAllowed: number,     // Daily limit (default: 3)
  resetTime: Timestamp,     // When the count will reset
  lastUsed: Timestamp,      // When last Super Like was used
  dailyReset: boolean       // Whether to use fixed daily reset
}
```

#### `superLikeUsage` Collection
Tracks individual Super Like actions:
```javascript
{
  userId: string,           // User who sent the Super Like
  targetUserId: string,     // User who received the Super Like
  timestamp: Timestamp,     // When the Super Like was sent
  dayKey: string           // Date key (YYYY-MM-DD format)
}
```

### Service Layer

#### `superLikeService.ts`
Core service handling all Super Like functionality:

- `initializeSuperLikeData(userId)` - Initialize or get user's Super Like data
- `getSuperLikeStatus(userId)` - Get current status and remaining count
- `useSuperLike(userId, targetUserId)` - Consume a Super Like
- `subscribeToSuperLikeStatus(userId, callback)` - Real-time status updates
- `resetSuperLikes(userId)` - Admin function to reset user's Super Likes
- `hasUserSuperLikedToday(userId, targetUserId)` - Check if already super liked

### UI Components

#### `SuperLikeCounter.tsx`
Displays remaining Super Likes with:
- Real-time count updates
- Color-coded status (green/orange/red)
- Reset timer when depleted
- Pulse animation on changes
- Multiple size variants

#### Updated Components
- `SwipeCards.tsx` - Integrated Super Like status awareness
- `CardActions.tsx` - Disabled Super Like button when unavailable
- Discovery screen - Added Super Like counter to header

### Cloud Functions

#### `resetSuperLikes`
Scheduled function (runs daily at midnight UTC):
- Resets all users' Super Like counts
- Updates analytics
- Handles timezone considerations

#### `onSuperLikeUsed`
Triggered when a Super Like is used:
- Sends push notification to recipient
- Updates analytics
- Tracks usage patterns

### Security Rules

Firestore security rules ensure:
- Users can only modify their own Super Like data
- Super Like usage records are immutable after creation
- Proper authentication checks
- Prevention of unauthorized access

## Implementation Details

### Daily Reset Strategy

The system uses a **fixed daily reset** at midnight UTC:

```javascript
const getNextResetTime = (strategy: 'fixed' | 'rolling', lastUsed?: Date): Date => {
  const now = new Date();
  
  if (strategy === 'fixed') {
    const nextReset = new Date(now);
    nextReset.setUTCHours(0, 0, 0, 0); // Midnight UTC
    
    if (now.getTime() >= nextReset.getTime()) {
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }
    
    return nextReset;
  }
  // Rolling strategy implementation...
};
```

### Atomic Operations

Super Like consumption uses Firestore batched writes to ensure atomicity:

```javascript
const batch = writeBatch(db);

// Update Super Like count
batch.update(doc(superLikesCollection, userId), {
  usedCount: newUsedCount,
  lastUsed: Timestamp.fromDate(now),
});

// Record the usage
batch.set(doc(superLikeUsageCollection, usageId), usageData);

await batch.commit();
```

### Real-time Updates

The system uses Firestore real-time listeners for instant UI updates:

```javascript
export const subscribeToSuperLikeStatus = (userId, callback) => {
  return onSnapshot(doc(superLikesCollection, userId), async (doc) => {
    const status = await getSuperLikeStatus(userId);
    callback(status);
  });
};
```

## Security Considerations

### Firestore Rules
```javascript
// Super Likes collection - track daily usage
match /superLikes/{userId} {
  allow read, write: if isUserAuthenticated(userId);
}

// Super Like usage collection - track individual actions
match /superLikeUsage/{usageId} {
  allow create: if isAuthenticated() && 
                 incomingData().userId == request.auth.uid &&
                 userExists(incomingData().targetUserId);
  allow read: if isAuthenticated() && 
               (existingData().userId == request.auth.uid || 
                existingData().targetUserId == request.auth.uid);
  allow update, delete: if false;
}
```

### Client-side Validation
- Check Super Like availability before allowing swipe
- Validate user authentication
- Handle network errors gracefully

### Server-side Validation
- Cloud Functions validate all Super Like operations
- Rate limiting through daily quotas
- Duplicate prevention through unique document IDs

## Scalability Optimizations

### Database Design
- Efficient document structure minimizing reads/writes
- Composite indexes for fast queries
- Partitioned data by user ID for horizontal scaling

### Caching Strategy
- Client-side caching of Super Like status
- Real-time updates only when necessary
- Optimistic UI updates with rollback on failure

### Performance Considerations
- Batched operations for atomic updates
- Minimal document reads through efficient queries
- Background processing for analytics

## Monitoring & Analytics

### Key Metrics
- Daily Super Like usage rates
- User engagement with Super Like feature
- Conversion rates (Super Like → Match)
- System performance metrics

### Logging
- All Super Like operations logged
- Error tracking and alerting
- Performance monitoring

## Testing Strategy

### Unit Tests
- Service layer functions
- Utility functions
- Component rendering

### Integration Tests
- End-to-end Super Like flow
- Real-time update functionality
- Error handling scenarios

### Load Testing
- High-volume Super Like usage
- Concurrent user scenarios
- Database performance under load

## Deployment Checklist

### Database Setup
- [ ] Deploy Firestore security rules
- [ ] Create necessary indexes
- [ ] Set up Cloud Functions

### Configuration
- [ ] Configure daily reset schedule
- [ ] Set Super Like limits
- [ ] Enable push notifications

### Monitoring
- [ ] Set up analytics tracking
- [ ] Configure error alerting
- [ ] Monitor performance metrics

## Future Enhancements

### Potential Features
- **Premium Super Likes**: Additional Super Likes for premium users
- **Super Like Boost**: Temporary increased limits
- **Super Like Insights**: Analytics for users on their Super Like effectiveness
- **Undo Super Like**: Allow users to retract accidental Super Likes
- **Super Like Streaks**: Rewards for consistent usage

### Technical Improvements
- **Machine Learning**: Optimize Super Like timing suggestions
- **A/B Testing**: Test different daily limits and reset strategies
- **Advanced Analytics**: Deeper insights into user behavior
- **Internationalization**: Support for different time zones

## Troubleshooting

### Common Issues

#### Super Likes Not Resetting
- Check Cloud Function logs
- Verify timezone configuration
- Ensure proper Firestore permissions

#### Real-time Updates Not Working
- Verify Firestore connection
- Check authentication status
- Review security rules

#### Performance Issues
- Monitor Firestore usage
- Check for inefficient queries
- Review client-side caching

### Debug Commands
```javascript
// Check user's Super Like status
const status = await getSuperLikeStatus(userId);
console.log('Super Like Status:', status);

// Reset user's Super Likes (admin only)
await resetSuperLikes(userId);

// Check Super Like usage history
const history = await getSuperLikeHistory(userId, 7);
console.log('Usage History:', history);
```

## Support

For technical issues or questions about the Super Like system:
1. Check the troubleshooting section above
2. Review Firestore logs and Cloud Function logs
3. Monitor real-time database activity
4. Contact the development team with specific error messages and reproduction steps

---

*Last updated: [Current Date]*
*Version: 1.0.0* 