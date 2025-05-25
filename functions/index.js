const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const expo = new Expo();

/**
 * Cloud function that's triggered when a new match is created
 * This sends push notifications to both users
 */
exports.notifyMatch = functions.region('asia-southeast1').https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to create a match'
    );
  }

  const { matchId } = data;
  
  try {
    // Get the match information
    const matchDoc = await db.collection('matches').doc(matchId).get();
    
    if (!matchDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found', 
        'Match not found'
      );
    }
    
    const matchData = matchDoc.data();
    const { users } = matchData;
    
    // Get both users' information for personalized notifications
    const userPromises = users.map(userId => 
      db.collection('users').doc(userId).get()
    );
    
    const userDocs = await Promise.all(userPromises);
    const userData = userDocs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Send notification to each user
    for (const user of userData) {
      // Find the other user in the match
      const otherUser = userData.find(u => u.id !== user.id);
      
      // Skip if the user doesn't have any push tokens
      const hasFCMTokens = user.fcmTokens && user.fcmTokens.length > 0;
      const hasExpoTokens = user.expoPushTokens && user.expoPushTokens.length > 0;
      
      if (!hasFCMTokens && !hasExpoTokens) {
        console.log(`No push tokens found for user ${user.id}`);
        continue;
      }
      
      const notificationData = {
        type: 'match',
        matchId,
        timestamp: matchData.createdAt.toDate().toISOString(),
        otherUserId: otherUser.id,
        otherUserName: otherUser.displayName || '',
        otherUserPhoto: otherUser.photoURL || ''
      };

      // Send FCM notifications if tokens exist
      if (hasFCMTokens) {
        const fcmMessage = {
          notification: {
            title: 'New Match! 🎉',
            body: `You and ${otherUser.displayName || 'someone'} have matched! Start chatting now.`
          },
          data: notificationData,
          tokens: user.fcmTokens
        };
        
        try {
          const response = await messaging.sendMulticast(fcmMessage);
          console.log(`Successfully sent FCM notifications to ${response.successCount} devices for user ${user.id}`);
          
          // Clean up any tokens that are no longer valid
          if (response.failureCount > 0) {
            const invalidTokens = [];
            
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                invalidTokens.push(user.fcmTokens[idx]);
              }
            });
            
            // Remove invalid tokens from the user's document
            if (invalidTokens.length > 0) {
              const validTokens = user.fcmTokens.filter(token => !invalidTokens.includes(token));
              await db.collection('users').doc(user.id).update({
                fcmTokens: validTokens
              });
            }
          }
        } catch (error) {
          console.error(`Error sending FCM notification to user ${user.id}:`, error);
        }
      }

      // Send Expo notifications if tokens exist
      if (hasExpoTokens) {
        const expoMessages = user.expoPushTokens.map(pushToken => {
          if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Invalid Expo push token: ${pushToken}`);
            return null;
          }

          return {
            to: pushToken,
            sound: 'default',
            title: 'New Match! 🎉',
            body: `You and ${otherUser.displayName || 'someone'} have matched! Start chatting now.`,
            data: notificationData,
            channelId: 'matches',
          };
        }).filter(message => message !== null);

        if (expoMessages.length > 0) {
          try {
            const chunks = expo.chunkPushNotifications(expoMessages);
            const tickets = [];

            for (const chunk of chunks) {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
              tickets.push(...ticketChunk);
            }

            console.log(`Successfully sent Expo notifications for user ${user.id}`);
          } catch (error) {
            console.error(`Error sending Expo notifications to user ${user.id}:`, error);
          }
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in notifyMatch function:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud function that's triggered when a new message is sent
 * This sends push notifications to the recipient
 */
exports.notifyNewMessage = functions.region('asia-southeast1').firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const { conversationId, messageId } = context.params;
    const messageData = snapshot.data();
    const { sender, text, timestamp } = messageData;
    
    try {
      console.log(`New message from ${sender} in conversation ${conversationId}`);
      
      // Get conversation details to find the recipient
      const conversationDoc = await db.collection('conversations').doc(conversationId).get();
      
      if (!conversationDoc.exists) {
        console.error('Conversation not found:', conversationId);
        return false;
      }
      
      const conversationData = conversationDoc.data();
      const { participants } = conversationData;
      
      // Find the recipient (the participant who is not the sender)
      const recipientId = participants.find(participantId => participantId !== sender);
      
      if (!recipientId) {
        console.error('Recipient not found in conversation:', conversationId);
        return false;
      }
      
      // Get recipient's user data and notification preferences
      const recipientDoc = await db.collection('users').doc(recipientId).get();
      
      if (!recipientDoc.exists) {
        console.error('Recipient user not found:', recipientId);
        return false;
      }
      
      const recipientData = recipientDoc.data();
      
      // Get sender's user data for personalized notification
      const senderDoc = await db.collection('users').doc(sender).get();
      const senderData = senderDoc.exists ? senderDoc.data() : {};
      
      // Check if user has notification tokens
      const hasFCMTokens = recipientData.fcmTokens && recipientData.fcmTokens.length > 0;
      const hasExpoTokens = recipientData.expoPushTokens && recipientData.expoPushTokens.length > 0;
      
      if (!hasFCMTokens && !hasExpoTokens) {
        console.log(`No push tokens found for user ${recipientId}`);
        return false;
      }
      
      const senderName = senderData.displayName || 'Someone';
      const notificationTitle = `New message from ${senderName}`;
      const notificationBody = text.length > 50 ? `${text.substring(0, 50)}...` : text;
      
      const notificationData = {
        type: 'message',
        conversationId,
        messageId,
        senderId: sender,
        senderName,
        senderPhoto: senderData.photoURL || '',
        timestamp: timestamp.toDate().toISOString()
      };

      // Send FCM notifications if tokens exist
      if (hasFCMTokens) {
        const fcmMessage = {
          notification: {
            title: notificationTitle,
            body: notificationBody
          },
          data: notificationData,
          tokens: recipientData.fcmTokens,
          android: {
            notification: {
              channelId: 'messages',
              icon: 'ic_notification',
              color: '#FF6B6B'
            }
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: 'default'
              }
            }
          }
        };
        
        try {
          const response = await messaging.sendMulticast(fcmMessage);
          console.log(`Successfully sent FCM message notification to ${response.successCount} devices for user ${recipientId}`);
          
          // Clean up invalid tokens
          if (response.failureCount > 0) {
            const invalidTokens = [];
            
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                invalidTokens.push(recipientData.fcmTokens[idx]);
              }
            });
            
            if (invalidTokens.length > 0) {
              const validTokens = recipientData.fcmTokens.filter(token => !invalidTokens.includes(token));
              await db.collection('users').doc(recipientId).update({
                fcmTokens: validTokens
              });
            }
          }
        } catch (error) {
          console.error(`Error sending FCM message notification to user ${recipientId}:`, error);
        }
      }

      // Send Expo notifications if tokens exist
      if (hasExpoTokens) {
        const expoMessages = recipientData.expoPushTokens.map(pushToken => {
          if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Invalid Expo push token: ${pushToken}`);
            return null;
          }

          return {
            to: pushToken,
            sound: 'default',
            title: notificationTitle,
            body: notificationBody,
            data: notificationData,
            channelId: 'messages',
            badge: 1,
          };
        }).filter(message => message !== null);

        if (expoMessages.length > 0) {
          try {
            const chunks = expo.chunkPushNotifications(expoMessages);
            const tickets = [];

            for (const chunk of chunks) {
              const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
              tickets.push(...ticketChunk);
            }

            console.log(`Successfully sent Expo message notifications for user ${recipientId}`);
          } catch (error) {
            console.error(`Error sending Expo message notifications to user ${recipientId}:`, error);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in notifyNewMessage function:', error);
      return false;
    }
  });

/**
 * Triggered when a new match document is created
 * This updates user statistics and other related data
 */
exports.onMatchCreated = functions.region('asia-southeast1').firestore
  .document('matches/{matchId}')
  .onCreate(async (snapshot, context) => {
    const matchData = snapshot.data();
    const { users, initiatedBy } = matchData;
    
    try {
      // Update both users' match counts
      const batch = db.batch();
      
      for (const userId of users) {
        const userRef = db.collection('users').doc(userId);
        
        // Increment the user's match count
        batch.update(userRef, {
          matchCount: admin.firestore.FieldValue.increment(1),
          lastMatchAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      await batch.commit();
      
      // Log match analytics event
      const analyticsRef = db.collection('analytics').doc('matches');
      await analyticsRef.update({
        totalMatches: admin.firestore.FieldValue.increment(1),
        matchesThisMonth: admin.firestore.FieldValue.increment(1),
        matchesPerDay: admin.firestore.FieldValue.arrayUnion({
          date: new Date().toISOString().split('T')[0],
          count: 1
        })
      });
      
      return true;
    } catch (error) {
      console.error('Error in onMatchCreated function:', error);
      return false;
    }
  });

/**
 * Triggered when a user swipes right (likes) another user
 * This calculates recommendation updates based on user preferences
 */
exports.onSwipeAction = functions.region('asia-southeast1').firestore
  .document('swipes/{swipeId}')
  .onCreate(async (snapshot, context) => {
    const swipeData = snapshot.data();
    const { userId, targetUserId, action } = swipeData;
    
    try {
      // Only process 'like' actions for recommendation updates
      if (action === 'like' || action === 'superlike') {
        // Get the target user's profile
        const targetUserDoc = await db.collection('users').doc(targetUserId).get();
        
        if (targetUserDoc.exists) {
          const targetUserData = targetUserDoc.data();
          
          // Update the user's preference stats
          const userRef = db.collection('users').doc(userId);
          const userPrefsRef = db.collection('userPreferences').doc(userId);
          
          // Get the user's current preferences
          const userPrefsDoc = await userPrefsRef.get();
          
          if (userPrefsDoc.exists) {
            // Update preference weights based on the liked profile
            // This is a simplified example - a real algorithm would be more complex
            const updates = {};
            
            if (targetUserData.interests) {
              for (const interest of targetUserData.interests) {
                const interestKey = `interestWeights.${interest}`;
                updates[interestKey] = admin.firestore.FieldValue.increment(1);
              }
            }
            
            if (targetUserData.age) {
              updates['agePreference.min'] = Math.min(
                userPrefsDoc.data().agePreference?.min || 18,
                targetUserData.age - 2
              );
              updates['agePreference.max'] = Math.max(
                userPrefsDoc.data().agePreference?.max || 50,
                targetUserData.age + 2
              );
            }
            
            // Update the preferences document
            await userPrefsRef.update(updates);
          }
          
          // Update swipe statistics
          await userRef.update({
            [`swipeStats.${action}Count`]: admin.firestore.FieldValue.increment(1),
            lastSwipeAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      // Update global swipe analytics
      const analyticsRef = db.collection('analytics').doc('swipes');
      await analyticsRef.update({
        [`total${action.charAt(0).toUpperCase() + action.slice(1)}s`]: admin.firestore.FieldValue.increment(1),
        totalSwipes: admin.firestore.FieldValue.increment(1)
      });
      
      return true;
    } catch (error) {
      console.error('Error in onSwipeAction function:', error);
      return false;
    }
  });

/**
 * Scheduled function to reset Super Likes daily at midnight UTC
 * This ensures all users get their daily Super Likes refreshed
 */
exports.resetSuperLikes = functions.region('asia-southeast1').pubsub.schedule('0 0 * * *').timeZone('UTC').onRun(async (context) => {
  try {
    console.log('Starting daily Super Like reset...');
    
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    
    // Calculate next reset time (24 hours from now)
    const nextResetTime = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );
    
    // Get all Super Like documents that need to be reset
    const superLikesSnapshot = await db.collection('superLikes').get();
    
    let resetCount = 0;
    
    superLikesSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Only reset if the reset time has passed
      if (data.resetTime && data.resetTime.toDate() <= now.toDate()) {
        batch.update(doc.ref, {
          usedCount: 0,
          resetTime: nextResetTime,
          lastReset: now
        });
        resetCount++;
      }
    });
    
    // Commit all updates
    await batch.commit();
    
    console.log(`Successfully reset Super Likes for ${resetCount} users`);
    
    // Log analytics
    const analyticsRef = db.collection('analytics').doc('superLikes');
    await analyticsRef.set({
      lastResetDate: now,
      usersReset: resetCount,
      totalResets: admin.firestore.FieldValue.increment(1)
    }, { merge: true });
    
    return { success: true, usersReset: resetCount };
  } catch (error) {
    console.error('Error in resetSuperLikes function:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Triggered when a Super Like is used
 * This tracks analytics and can trigger notifications
 */
exports.onSuperLikeUsed = functions.region('asia-southeast1').firestore
  .document('superLikeUsage/{usageId}')
  .onCreate(async (snapshot, context) => {
    const usageData = snapshot.data();
    const { userId, targetUserId } = usageData;
    
    try {
      // Update Super Like analytics
      const analyticsRef = db.collection('analytics').doc('superLikes');
      await analyticsRef.update({
        totalSuperLikes: admin.firestore.FieldValue.increment(1),
        superLikesToday: admin.firestore.FieldValue.increment(1),
        lastSuperLikeAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Get target user's notification preferences
      const targetUserDoc = await db.collection('users').doc(targetUserId).get();
      
      if (targetUserDoc.exists) {
        const targetUserData = targetUserDoc.data();
        
        // Check if user has notification tokens
        const hasFCMTokens = targetUserData.fcmTokens && targetUserData.fcmTokens.length > 0;
        const hasExpoTokens = targetUserData.expoPushTokens && targetUserData.expoPushTokens.length > 0;
        
        if (hasFCMTokens || hasExpoTokens) {
          // Get the user who sent the super like
          const senderDoc = await db.collection('users').doc(userId).get();
          const senderData = senderDoc.exists ? senderDoc.data() : {};
          
          const notificationData = {
            type: 'superlike',
            senderId: userId,
            senderName: senderData.displayName || '',
            senderPhoto: senderData.photoURL || '',
            timestamp: usageData.timestamp.toDate().toISOString()
          };

          // Send FCM notifications if tokens exist
          if (hasFCMTokens) {
            const fcmMessage = {
              notification: {
                title: 'You got a Super Like! ⭐️',
                body: `${senderData.displayName || 'Someone'} super liked you! Check them out.`
              },
              data: notificationData,
              tokens: targetUserData.fcmTokens
            };
            
            try {
              const response = await messaging.sendMulticast(fcmMessage);
              console.log(`Successfully sent FCM Super Like notification to ${response.successCount} devices for user ${targetUserId}`);
            } catch (error) {
              console.error(`Error sending FCM Super Like notification to user ${targetUserId}:`, error);
            }
          }

          // Send Expo notifications if tokens exist
          if (hasExpoTokens) {
            const expoMessages = targetUserData.expoPushTokens.map(pushToken => {
              if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Invalid Expo push token: ${pushToken}`);
                return null;
              }

              return {
                to: pushToken,
                sound: 'default',
                title: 'You got a Super Like! ⭐️',
                body: `${senderData.displayName || 'Someone'} super liked you! Check them out.`,
                data: notificationData,
                channelId: 'likes',
              };
            }).filter(message => message !== null);

            if (expoMessages.length > 0) {
              try {
                const chunks = expo.chunkPushNotifications(expoMessages);
                const tickets = [];

                for (const chunk of chunks) {
                  const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                  tickets.push(...ticketChunk);
                }

                console.log(`Successfully sent Expo Super Like notifications for user ${targetUserId}`);
              } catch (error) {
                console.error(`Error sending Expo Super Like notifications to user ${targetUserId}:`, error);
              }
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in onSuperLikeUsed function:', error);
      return false;
    }
  });

/**
 * Creates a database index for the swipes collection
 * This is run periodically to ensure indexes are maintained
 */
exports.createSwipeIndexes = functions.region('asia-southeast1').pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    // This function doesn't actually create the indexes - they need to be defined in the Firebase console
    // or via the Firebase CLI. This is just a reminder function that logs information about indexes.
    
    console.log('Checking swipe indexes...');
    
    // We would normally do some verification here, but for now just log a reminder
    console.log(`Important indexes for the swipes collection:
    1. userId ASC, timestamp DESC - For retrieving a user's recent swipes
    2. targetUserId ASC, action ASC - For checking if someone has been liked
    3. userId ASC, action ASC - For filtering likes/passes
    
    Super Like indexes:
    1. superLikes: userId ASC - For user-specific super like data
    2. superLikeUsage: userId ASC, dayKey ASC - For daily usage tracking
    3. superLikeUsage: targetUserId ASC, timestamp DESC - For received super likes`);
    
    return true;
  } catch (error) {
    console.error('Error in createSwipeIndexes function:', error);
    return false;
  }
}); 