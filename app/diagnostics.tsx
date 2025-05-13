import React from 'react';
import { Stack } from 'expo-router';
import NetworkDiagnosticsScreen from '@/components/NetworkDiagnosticsScreen';

export default function DiagnosticsRoute() {
  return (
    <>
      <Stack.Screen options={{ 
        title: 'Network Diagnostics',
        headerShown: true
      }} />
      <NetworkDiagnosticsScreen />
    </>
  );
} 