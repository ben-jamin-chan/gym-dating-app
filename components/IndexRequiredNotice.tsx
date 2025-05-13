import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { AlertCircle, ExternalLink } from 'lucide-react-native';

type IndexRequiredNoticeProps = {
  onDismiss?: () => void;
};

export default function IndexRequiredNotice({ onDismiss }: IndexRequiredNoticeProps) {
  const handleLinkPress = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  // Direct links to create each index
  const createMessagesIndex = () => {
    const url = "https://console.firebase.google.com/v1/r/project/gym-dating-app/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9neW0tZGF0aW5nLWFwcC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY29udmVyc2F0aW9ucxJYCgxjb252ZXJzYXRpb25zEhZjb252ZXJzYXRpb25JZC97Y29udklkfRIIbWVzc2FnZXMaCAoGc2VuZGVyIAEaBAoEcmVhZBABGgwKCl9fbmFtZV9fXyAB";
    handleLinkPress(url);
  };

  const createTypingIndex = () => {
    const url = "https://console.firebase.google.com/v1/r/project/gym-dating-app/firestore/indexes?create_composite=ClJwcm9qZWN0cy9neW0tZGF0aW5nLWFwcC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdHlwaW5nSW5kaWNhdG9ycxI8ChB0eXBpbmdJbmRpY2F0b3JzGhAKDmNvbnZlcnNhdGlvbklkEAEaCAoGdXNlcklkIAEaDQoLX19uYW1lX19fIAE";
    handleLinkPress(url);
  };

  const createConversationsIndex = () => {
    const url = "https://console.firebase.google.com/v1/r/project/gym-dating-app/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9neW0tZGF0aW5nLWFwcC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY29udmVyc2F0aW9ucxI7Cgxjb252ZXJzYXRpb25zGgwKCnBhcnRpY2lwYW50cxACGhMKEWxhc3RNZXNzYWdlVGltZXN0YW1wEAIaDQoLX19uYW1lX19fIAE";
    handleLinkPress(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AlertCircle size={24} color="#FFFFFF" />
        <Text style={styles.title}>Firebase Indexes Required</Text>
        {onDismiss && (
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.content}>
        <Text style={styles.description}>
          Your Firebase database requires some indexes to be created for the app to work properly.
          Click the links below to create each required index:
        </Text>
        
        <View style={styles.indexCard}>
          <Text style={styles.indexTitle}>1. Messages Index</Text>
          <Text style={styles.indexDescription}>
            Collection path: conversations/{'{conversationId}'}/messages
          </Text>
          <Text style={styles.indexFields}>Fields:</Text>
          <Text style={styles.field}>• sender (not equal) Ascending</Text>
          <Text style={styles.field}>• read (equal) Ascending</Text>
          <TouchableOpacity 
            style={styles.indexButton}
            onPress={createMessagesIndex}
          >
            <Text style={styles.indexButtonText}>Create Messages Index</Text>
            <ExternalLink size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.indexCard}>
          <Text style={styles.indexTitle}>2. Typing Indicators Index</Text>
          <Text style={styles.indexDescription}>
            Collection path: typingIndicators
          </Text>
          <Text style={styles.indexFields}>Fields:</Text>
          <Text style={styles.field}>• conversationId (equal) Ascending</Text>
          <Text style={styles.field}>• userId (not equal) Ascending</Text>
          <TouchableOpacity 
            style={styles.indexButton}
            onPress={createTypingIndex}
          >
            <Text style={styles.indexButtonText}>Create Typing Index</Text>
            <ExternalLink size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.indexCard}>
          <Text style={styles.indexTitle}>3. Conversations Index</Text>
          <Text style={styles.indexDescription}>
            Collection path: conversations
          </Text>
          <Text style={styles.indexFields}>Fields:</Text>
          <Text style={styles.field}>• participants (array-contains) Ascending</Text>
          <Text style={styles.field}>• lastMessageTimestamp Descending</Text>
          <TouchableOpacity 
            style={styles.indexButton}
            onPress={createConversationsIndex}
          >
            <Text style={styles.indexButtonText}>Create Conversations Index</Text>
            <ExternalLink size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.note}>
          After creating the indexes, it may take a few minutes for them to be active.
          The app will continue to work with limited functionality until the indexes are ready.
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleLinkPress('https://console.firebase.google.com/project/gym-dating-app/firestore/indexes')}
        >
          <Text style={styles.buttonText}>Open Firebase Console</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#EF4444',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 16,
  },
  indexCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  indexTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  indexDescription: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 8,
  },
  indexFields: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  field: {
    fontSize: 14,
    color: '#4B5563',
    paddingLeft: 8,
    lineHeight: 22,
  },
  indexButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B5563',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  indexButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 16,
  },
}); 