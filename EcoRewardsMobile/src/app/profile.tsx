/**
 * User and EcoCleaner profile
 * Provides profile navigation, cleaner application, reports and connection settings.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../lib/session';
import { C, S } from '../lib/theme';
export default function Profile() {
    const x = useSession();
    return <ScrollView style={S.screen} contentContainerStyle={[S.content, { paddingTop: 45 }]}>
    <Text style={S.heading}>My Eco Profile</Text><Text style={S.sub}>Your account, verified cleaner status, and saved preferences</Text>
    <View style={[S.card, { backgroundColor: '#E7F8EB', marginTop: 22, padding: 24 }]}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 59, height: 59, borderRadius: 30, backgroundColor: '#146C4D', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 29, color: 'white' }}>♙</Text></View><View style={{ paddingLeft: 15, flex: 1 }}><Text style={{ fontWeight: '900', fontSize: 22, color: C.ink }}>{x.me?.name || 'Eco Member'}</Text><Text style={S.sub}>{x.me?.email || 'Sign in required'}</Text></View></View><Text style={[S.small, { marginTop: 16 }]}>EcoPoints from verified cleanups: {x.points}</Text></View>
    {[['🦺', 'EcoCleaner verification', 'Apply, check approval and manage claimed jobs', '/cleaner'], ['📋', 'My environmental reports', 'Review status and your submissions', '/my-reports'], ['🏆', 'EcoPoints and achievement titles', 'View completed-task milestones', '/rewards'], ['⚙', 'Server & connection', 'Check or update your Flask server address', '/live']].map(([icon, title, description, url]) => <Pressable key={url} style={S.card} onPress={() => router.push(url as any)}><Text style={{ fontWeight: '900', fontSize: 16, color: C.ink }}>{icon}  {title}  ›</Text><Text style={S.sub}>{description}</Text></Pressable>)}
    <Pressable style={[S.secondary, { backgroundColor: '#FFECE9' }]} onPress={() => Alert.alert('Sign out', 'Sign out of your EcoRewards account?', [{ text: 'Cancel' }, { text: 'Sign out', style: 'destructive', onPress: async () => { await x.logout(); router.replace('/'); } }])}><Text style={{ color: '#A32E2E', fontWeight: '900' }}>Sign out</Text></Pressable>
    <Text style={[S.small, { marginTop: 18 }]}>EcoCleaner titles recognise verified task completions; they are not safety certifications. No rewards are redeemed unless confirmed partners exist.</Text>
    </ScrollView>;
}

