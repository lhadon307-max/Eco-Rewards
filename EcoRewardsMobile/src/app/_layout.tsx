/**
 * Application navigation
 * Provides the Expo Router stack and persistent bottom tabs. SessionProvider supplies the logged-in user and authenticated API client.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { SessionProvider } from '../lib/session';
import { C } from '../lib/theme';
import BottomNav from '../lib/BottomNav';
export default function Layout() {
    return <SessionProvider><View style={{ flex: 1, backgroundColor: C.bg }}><Stack screenOptions={{ headerStyle: { backgroundColor: C.white }, headerTintColor: C.ink, headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: C.bg } }}>
    <Stack.Screen name="index" options={{ headerShown: false }}/>
    <Stack.Screen name="report" options={{ headerShown: false }}/>
    <Stack.Screen name="tasks" options={{ headerShown: false }}/>
    <Stack.Screen name="rewards" options={{ headerShown: false }}/>
    <Stack.Screen name="profile" options={{ headerShown: false }}/>
    <Stack.Screen name="my-reports" options={{ title: 'My Reports' }}/>
    <Stack.Screen name="cleaner" options={{ title: 'Verified EcoCleaner' }}/>
    <Stack.Screen name="live" options={{ title: 'Connect to EcoRewards' }}/>
    <Stack.Screen name="live-report" options={{ title: 'Report an Issue' }}/>
    <Stack.Screen name="live-tasks" options={{ title: 'Nearby EcoTasks' }}/>
    <Stack.Screen name="live-reports" options={{ title: 'My Reports' }}/>
    <Stack.Screen name="live-cleaner" options={{ title: 'Cleaner Verification & Tasks' }}/>
    <Stack.Screen name="live-rewards" options={{ title: 'EcoPoints & Achievements' }}/>
    </Stack><BottomNav /></View></SessionProvider>;
}

