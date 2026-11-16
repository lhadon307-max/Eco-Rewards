/**
 * My reports
 * Fetches saved environmental reports from the backend and displays their current states.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSession } from '../lib/session';
import { C, S } from '../lib/theme';
export default function LiveReports() { const x = useSession(); const [rows, setRows] = useState<any[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(false); async function load() { setLoading(true); try {
    const d = await x.api('/api/reports');
    setRows(d.reports || []);
    setError('');
}
catch (e: any) {
    setError(e.message);
}
finally {
    setLoading(false);
} } useFocusEffect(useCallback(() => { load(); }, [x.base, x.token])); return <ScrollView style={S.screen} contentContainerStyle={S.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}><Text style={S.heading}>📋 Reports from MySQL</Text><Text style={S.sub}>Your reports, assigned work and publicly available EcoTasks. Pull down to refresh.</Text>{error ? <Text style={{ color: C.red }}>{error}</Text> : null}{rows.map((r: any) => <View style={S.card} key={r.id}><Text style={{ fontWeight: '900', fontSize: 17, color: C.ink }}>{r.title}</Text><Text style={S.sub}>{r.location} · {r.category}</Text><Text style={S.small}>Report #{r.id} · {r.status} · Task: {r.task_status}</Text></View>)}{!loading && !rows.length ? <Text style={S.sub}>No accessible reports yet. Submit a report to create one.</Text> : null}{loading ? <ActivityIndicator /> : null}</ScrollView>; }

