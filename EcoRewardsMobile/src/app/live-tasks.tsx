/**
 * Nearby EcoTask discovery
 * Converts selected city/suburb into approximate coordinates and queries published low-risk tasks within the selected distance.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../lib/session';
import { places } from '../lib/places';
import { C, S } from '../lib/theme';
export default function LiveTasks() {
    const x = useSession();
    const [city, setCity] = useState('Brisbane'), [suburb, setSuburb] = useState('South Brisbane'), [radius, setRadius] = useState(10), [items, setItems] = useState<any[]>([]), [diagnostic, setDiag] = useState(''), [busy, setBusy] = useState(false);
    // Fetch only eligible published tasks in the chosen city/suburb radius.
    async function search() { if (!x.me) {
        router.push('/live');
        return;
    } try {
        setBusy(true);
        const c = places[city].find(p => p.name === suburb)!;
        const q = `?latitude=${c.lat}&longitude=${c.lon}&radius=${radius}`;
        const d = await x.api('/api/tasks/nearby' + q);
        setItems(d.tasks || []);
        setDiag(d.count ? `${d.count} published tasks nearby` : d.published_total ? `No task within ${radius} km. Nearest is ${d.nearest_published_km} km away.` : 'No low-risk EcoTasks have been published by admin yet.');
    }
    catch (e: any) {
        Alert.alert('Unable to search', e.message);
    }
    finally {
        setBusy(false);
    } }
    return <ScrollView style={S.screen} contentContainerStyle={S.content}><Text style={S.heading}>📍 Nearby EcoTasks</Text><Text style={S.sub}>Only admin-published, low-risk, unclaimed MySQL tasks appear here.</Text><View style={[S.card, { marginTop: 18 }]}><Text style={S.label}>City</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Object.keys(places).map(c => <Pressable key={c} style={[S.chip, city === c && { backgroundColor: C.mint }]} onPress={() => { setCity(c); setSuburb(places[c][0].name); }}><Text style={S.chipText}>{c}</Text></Pressable>)}</View><Text style={S.label}>Suburb</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{places[city].map(c => <Pressable key={c.name} style={[S.chip, suburb === c.name && { backgroundColor: C.mint }]} onPress={() => setSuburb(c.name)}><Text style={S.chipText}>{c.name}</Text></Pressable>)}</View><Text style={S.label}>Distance</Text><View style={{ flexDirection: 'row' }}>{[2, 5, 10].map(n => <Pressable key={n} style={[S.chip, radius === n && { backgroundColor: C.mint }]} onPress={() => setRadius(n)}><Text style={S.chipText}>{n} km</Text></Pressable>)}</View><Pressable style={S.primary} onPress={search} disabled={busy}><Text style={S.primaryText}>{busy ? 'Searching...' : 'Find real EcoTasks'}</Text></Pressable></View><Text style={[S.sub, { marginBottom: 12 }]}>{diagnostic}</Text>{items.map(t => <View style={S.card} key={t.id}><Text style={{ fontWeight: '900', fontSize: 18, color: C.ink }}>{t.title}</Text><Text style={S.sub}>{t.location} · {t.distance_km} km</Text><Text style={S.small}>{t.category} · {t.description}</Text><Pressable style={S.secondary} onPress={() => router.push({ pathname: '/live-cleaner', params: { task: String(t.id), city, suburb, radius: String(radius) } })}><Text style={S.secondaryText}>Review safety & claim →</Text></Pressable></View>)}{busy ? <ActivityIndicator /> : null}<Text style={S.small}>Suburb-centre distances are approximate. Do not attempt any cleanup without permission and a site-specific safety check.</Text></ScrollView>;
}

