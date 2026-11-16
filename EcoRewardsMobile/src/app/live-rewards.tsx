/**
 * Verified rewards
 * Displays real backend EcoPoints and achievement information; the phone does not award points itself.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSession } from '../lib/session';
import { C, S } from '../lib/theme';
export default function LiveRewards() { const x = useSession(); const [r, setR] = useState<any>(null), [error, setError] = useState(''); async function load() { if (!x.me)
    return; try {
    const v = await x.api('/api/advanced/cleaner/recognition');
    setR(v);
    await x.refresh();
    setError('');
}
catch (e: any) {
    setError(e.message);
} } useFocusEffect(useCallback(() => { load(); }, [x.token])); return <ScrollView style={S.screen} contentContainerStyle={S.content}><Text style={S.heading}>🏆 My real rewards</Text><Text style={S.sub}>Live balances and milestones from verified MySQL task records.</Text><View style={[S.card, { marginTop: 20, backgroundColor: C.paleBlue }]}><Text style={{ fontSize: 13, color: C.muted }}>EcoPoints balance</Text><Text style={{ fontSize: 42, fontWeight: '900', color: C.blue }}>{x.points}</Text><Text style={S.small}>Only confirmed backend awards count.</Text></View><View style={S.card}><Text style={{ fontWeight: '900', fontSize: 21, color: C.ink }}>{r?.icon || '🌱'} {r?.title || 'EcoCleaner'}</Text><Text style={S.sub}>Verified completed tasks: {r?.count ?? 0}</Text><Text style={S.small}>Next milestone: {r?.next_target ?? 'All reached'}</Text></View>{error ? <Text style={{ color: C.red }}>{error}</Text> : null}<Pressable style={S.primary} onPress={load}><Text style={S.primaryText}>Refresh real rewards</Text></Pressable><Text style={[S.small, { marginTop: 12 }]}>Partner gift-card redemption is not active until businesses agree and admin configures real offers.</Text></ScrollView>; }

