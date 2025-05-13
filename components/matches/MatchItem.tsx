import React from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Match } from '@/types';

type MatchItemProps = {
  match: Match;
};

const CARD_MARGIN = 6;
const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 40 - (CARD_MARGIN * 4)) / 2; // 40 for container padding, margins for each card

export default function MatchItem({ match }: MatchItemProps) {
  const router = useRouter();
  
  return (
    <TouchableOpacity 
      style={styles.container}
      activeOpacity={0.9}
    >
      <Image 
        source={{ uri: match.photo }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        <View style={styles.topRow}>
          {match.newMatch && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          )}
        </View>
        
        <View style={styles.bottomRow}>
          <Text style={styles.name} numberOfLines={1}>{match.name}</Text>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => {}}
          >
            <MessageCircle size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    height: cardWidth * 1.4,
    borderRadius: 16,
    overflow: 'hidden',
    margin: CARD_MARGIN,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  newBadge: {
    backgroundColor: '#FF5864',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#FFFFFF',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  messageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});