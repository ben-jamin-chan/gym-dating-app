import { UserProfile, Match, Conversation, Message } from '@/types';

export const mockCurrentUser: UserProfile = {
  id: 'current-user',
  name: 'Alex Smith',
  age: 28,
  bio: "Fitness enthusiast with a passion for weightlifting and trail running. Looking for workout partners who can keep up!",
  photos: ['https://plus.unsplash.com/premium_photo-1664298352263-9cf691753fce?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Zml0JTIwZ3V5fGVufDB8fDB8fHww'],
  verified: true,
  distance: 0,
  workoutFrequency: '4-5 times/week',
  gymCheckIns: 15,
  interests: ['Weightlifting', 'Running', 'Nutrition', 'Yoga'],
  preferredWorkouts: ['HIIT', 'Strength Training', 'Cardio'],
  location: 'Fitness First Downtown'
};

export const mockProfiles: UserProfile[] = [
  {
    id: 'user1',
    name: 'Emma Wilson',
    age: 26,
    bio: "Yoga instructor and CrossFit competitor. Looking for someone to train with and explore new workout routines.",
    photos: ['https://i.pinimg.com/564x/e5/20/08/e520081e08b851bf7758ec3ee87eb891.jpg'],
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
    photos: ['https://www.greatestphysiques.com/wp-content/uploads/2018/01/Larry-Wheels.07.jpg'],
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
    photos: ['https://ifbbproofficial.com/wp-content/uploads/2024/08/Categorie-IFBB-Elite-Pro-Women-Bodyfitness.jpeg'],
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
    photos: ['https://www.greatestphysiques.com/wp-content/uploads/2017/05/Long-Wu-06.jpg'],
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
    photos: ['https://www.evogennutrition.com/cdn/shop/articles/Evogen_Elite_Signs_IFBB_Pro_League_Star_Derek_Lunsford_1200x1200_f550c491-91b4-4294-af69-151bda2c7ec5_1200x1200.jpg?v=1614281193'],
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
    photo: 'https://i.pinimg.com/564x/e5/20/08/e520081e08b851bf7758ec3ee87eb891.jpg',
    matchedOn: '2023-07-15T14:30:00Z',
    newMatch: true
  },
  {
    id: 'match2',
    userId: 'user2',
    name: 'Mike Johnson',
    photo: 'https://plus.unsplash.com/premium_photo-1664298352263-9cf691753fce?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Zml0JTIwZ3V5fGVufDB8fDB8fHww',
    matchedOn: '2023-07-12T09:45:00Z',
    newMatch: false
  },
  {
    id: 'match3',
    userId: 'user3',
    name: 'Sophia Chen',
    photo: 'https://ifbbproofficial.com/wp-content/uploads/2024/08/Categorie-IFBB-Elite-Pro-Women-Bodyfitness.jpeg',
    matchedOn: '2023-07-10T18:20:00Z',
    newMatch: false
  },
  {
    id: 'match4',
    userId: 'user4',
    name: 'James Davis',
    photo: 'https://www.greatestphysiques.com/wp-content/uploads/2017/05/Long-Wu-06.jpg',
    matchedOn: '2023-07-05T12:15:00Z',
    newMatch: false
  },
  {
    id: 'match5',
    userId: 'user5',
    name: 'Olivia Martinez',
    photo: 'https://www.evogennutrition.com/cdn/shop/articles/Evogen_Elite_Signs_IFBB_Pro_League_Star_Derek_Lunsford_1200x1200_f550c491-91b4-4294-af69-151bda2c7ec5_1200x1200.jpg?v=1614281193',
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
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
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
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
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
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      read: true
    }
  }
];

export const mockMessages: Record<string, Message[]> = {
  'conv1': [
    {
      id: 'msg1',
      conversationId: 'conv1',
      sender: 'user1',
      text: "Hey! I saw you're into yoga too. What style do you practice?",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      read: true,
      status: 'read',
      type: 'text'
    },
    {
      id: 'msg2',
      conversationId: 'conv1',
      sender: 'current-user',
      text: "Hi Emma! I mainly do Vinyasa and Hatha. How about you?",
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours ago
      read: true,
      status: 'read',
      type: 'text'
    },
    {
      id: 'msg3',
      conversationId: 'conv1',
      sender: 'user1',
      text: "Nice! I teach Vinyasa classes. Would you like to join one of my sessions sometime?",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      read: false,
      status: 'delivered',
      type: 'text'
    }
  ],
  'conv2': [
    {
      id: 'msg4',
      conversationId: 'conv2',
      sender: 'user2',
      text: "Hey! Want to hit the gym together this weekend?",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      read: true,
      status: 'read',
      type: 'text'
    },
    {
      id: 'msg5',
      conversationId: 'conv2',
      sender: 'current-user',
      text: "Sounds great! What time works for you?",
      timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
      read: true,
      status: 'read',
      type: 'text'
    },
    {
      id: 'msg6',
      conversationId: 'conv2',
      sender: 'user2',
      text: "Let me know if you want to try that new gym downtown this weekend!",
      timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), // 22 hours ago
      read: true,
      status: 'read',
      type: 'text'
    }
  ],
  'conv3': [
    {
      id: 'msg7',
      conversationId: 'conv3',
      sender: 'user3',
      text: "I'm running a 10K this Saturday. Want to join?",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      read: true,
      status: 'read',
      type: 'text'
    },
    {
      id: 'msg8',
      conversationId: 'conv3',
      sender: 'current-user',
      text: "That sounds challenging! What's your usual pace?",
      timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(), // 2.5 days ago
      read: true,
      status: 'read',
      type: 'text'
    }
  ]
};