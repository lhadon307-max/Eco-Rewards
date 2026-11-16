/**
 * Shared bottom navigation
 * Renders the five primary app sections and highlights the selected route.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSession } from './session';
const items = [['⌂', 'Home', '/'], ['▣', 'Report', '/report'], ['♧', 'EcoTasks', '/tasks'], ['♕', 'Rewards', '/rewards'], ['♙', 'Profile', '/profile']] as const;
export default function BottomNav() {
    const { me } = useSession();
    const path = usePathname();
    if (!me)
        return null;
    return <View style={{ flexDirection: 'row', backgroundColor: '#073D35', paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 19 : 11, borderTopLeftRadius: 23, borderTopRightRadius: 23, justifyContent: 'space-around', borderTopWidth: 1, borderColor: '#155F51' }}>
 {items.map(([icon, label, url]) => { const active = path === url || (url === '/report' && path === '/live-report') || (url === '/tasks' && path === '/live-tasks') || (url === '/rewards' && path === '/live-rewards'); return <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => router.replace(url as any)} style={{ alignItems: 'center', minWidth: 55, paddingVertical: 3 }}><Text style={{ fontSize: 26, color: active ? '#B4F85A' : '#E0F3EA', fontWeight: '800' }}>{icon}</Text><Text style={{ fontSize: 11, fontWeight: active ? '900' : '600', color: active ? '#B4F85A' : '#E0F3EA', marginTop: 2 }}>{label}</Text>{active ? <View style={{ backgroundColor: '#B4F85A', width: 20, height: 3, borderRadius: 3, marginTop: 4 }}/> : null}</Pressable>; })}
 </View>;
}

