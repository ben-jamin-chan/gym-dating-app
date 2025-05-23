import { UserProfile, Match, Conversation } from '@/types';

export const mockCurrentUser: UserProfile = {
  id: 'current-user',
  name: 'Alex Smith',
  age: 28,
  bio: "Fitness enthusiast with a passion for weightlifting and trail running. Looking for workout partners who can keep up!",
  photos: ['https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg'],
  verified: true,
  distance: 0,
  workoutFrequency: '4-5 times/week',
  gymCheckIns: 15,
  interests: ['Weightlifting', 'Running', 'Nutrition', 'Yoga'],
  preferredWorkouts: ['HIIT', 'Strength Training', 'Cardio'],
  gymLocation: 'Fitness First Downtown'
};

export const mockProfiles: UserProfile[] = [
  {
    id: 'user1',
    name: 'Emma Wilson',
    age: 26,
    bio: "Yoga instructor and CrossFit competitor. Looking for someone to train with and explore new workout routines.",
    photos: ['https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg'],
    verified: true,
    distance: 3,
    workoutFrequency: '5-6 times/week',
    gymCheckIns: 12,
    interests: ['CrossFit', 'Yoga', 'Nutrition', 'Hiking']
  },
  {
    id: 'user2',
    name: 'Mike Johnson',
    age: 30,
    bio: "Bodybuilder and personal trainer. Passionate about fitness and helping others achieve their goals.",
    photos: ['https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg'],
    verified: true,
    distance: 5,
    workoutFrequency: 'Daily',
    gymCheckIns: 20,
    interests: ['Bodybuilding', 'Nutrition', 'Fitness Coaching']
  },
  {
    id: 'user3',
    name: 'Sophia Chen',
    age: 27,
    bio: "Marathon runner and spin class enthusiast. Looking for someone who enjoys both indoor and outdoor workouts.",
    photos: ['https://images.pexels.com/photos/3756165/pexels-photo-3756165.jpeg'],
    verified: false,
    distance: 2,
    workoutFrequency: '4 times/week',
    gymCheckIns: 8,
    interests: ['Running', 'Cycling', 'Swimming', 'Pilates']
  },
  {
    id: 'user4',
    name: 'James Davis',
    age: 32,
    bio: "Rock climber and fitness fanatic. Searching for an active partner to share adventures with.",
    photos: ['https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg'],
    verified: true,
    distance: 7,
    workoutFrequency: '3-4 times/week',
    gymCheckIns: 6,
    interests: ['Rock Climbing', 'Calisthenics', 'Outdoors']
  },
  {
    id: 'user5',
    name: 'Olivia Martinez',
    age: 29,
    bio: "Competitive weightlifter and former gymnast. Looking for someone who's serious about fitness goals.",
    photos: ['https://images.pexels.com/photos/1977047/pexels-photo-1977047.jpeg'],
    verified: true,
    distance: 4,
    workoutFrequency: '6 times/week',
    gymCheckIns: 16,
    interests: ['Weightlifting', 'Gymnastics', 'Strength Training']
  }
];

export const mockMatches: Match[] = [
  {
    id: 'match1',
    userId: 'user1',
    name: 'Emma Wilson',
    photo: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg',
    matchedOn: '2023-07-15T14:30:00Z',
    newMatch: true
  },
  {
    id: 'match2',
    userId: 'user2',
    name: 'Mike Johnson',
    photo: 'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg',
    matchedOn: '2023-07-12T09:45:00Z',
    newMatch: false
  },
  {
    id: 'match3',
    userId: 'user3',
    name: 'Sophia Chen',
    photo: 'https://images.pexels.com/photos/3756165/pexels-photo-3756165.jpeg',
    matchedOn: '2023-07-10T18:20:00Z',
    newMatch: false
  },
  {
    id: 'match4',
    userId: 'user4',
    name: 'James Davis',
    photo: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg',
    matchedOn: '2023-07-05T12:15:00Z',
    newMatch: false
  },
  {
    id: 'match5',
    userId: 'user5',
    name: 'Olivia Martinez',
    photo: 'https://images.pexels.com/photos/1977047/pexels-photo-1977047.jpeg',
    matchedOn: '2023-07-01T16:50:00Z',
    newMatch: false
  }
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    userId: 'user1',
    user: {
      id: 'user1',
      name: 'Emma Wilson',
      photo: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg',
      online: true,
      distance: 5.2 // 5.2 miles
    },
    lastMessage: {
      text: "Hey! I saw you're into yoga too. What style do you practice?",
      timestamp: '2023-07-16T10:30:00Z',
      read: false
    }
  },
  {
    id: 'conv2',
    userId: 'user2',
    user: {
      id: 'user2',
      name: 'Mike Johnson',
      photo: 'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg',
      online: false,
      distance: 12.8 // 12.8 miles
    },
    lastMessage: {
      text: "Let me know if you want to try that new gym downtown this weekend!",
      timestamp: '2023-07-15T14:45:00Z',
      read: true
    }
  },
  {
    id: 'conv3',
    userId: 'user3',
    user: {
      id: 'user3',
      name: 'Sophia Chen',
      photo: 'https://images.pexels.com/photos/3756165/pexels-photo-3756165.jpeg',
      online: true,
      distance: 3.7 // 3.7 miles
    },
    lastMessage: {
      text: "I'm running a 10K this Saturday. Want to join?",
      timestamp: '2023-07-14T09:20:00Z',
      read: true
    }
  }
];