/**
 * Environmental reporting
 * Captures a photo and location, validates the form, then POSTs multipart data to the real Flask API. Submitting does not automatically approve a cleanup.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSession } from '../lib/session';
import { places, categories } from '../lib/places';
import { C, S } from '../lib/theme';
export default function LiveReport() {
    const x = useSession();
    const [title, setTitle] = useState(''), [description, setDesc] = useState(''), [category, setCategory] = useState(categories[0]), [city, setCity] = useState('Brisbane'), [suburb, setSuburb] = useState('South Brisbane'), [photo, setPhoto] = useState(''), [busy, setBusy] = useState(false), [lat, setLat] = useState<number | null>(null), [lon, setLon] = useState<number | null>(null);
    async function choose() { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .75 }); if (!r.canceled)
        setPhoto(r.assets[0].uri); }
    async function locate() { try {
        const p = await Location.requestForegroundPermissionsAsync();
        if (p.status !== 'granted')
            throw Error('Location permission required.');
        const v = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLat(v.coords.latitude);
        setLon(v.coords.longitude);
        Alert.alert('GPS captured', 'The exact location is used for this report.');
    }
    catch (e: any) {
        Alert.alert('GPS unavailable', e.message);
    } }
    // Validate and upload a report with a photo; admin/safety review happens on the server.
    async function submit() { if (!x.me) {
        router.push('/live');
        return;
    } if (!title.trim() || !description.trim() || !photo) {
        Alert.alert('Required fields', 'Add title, description and a photo.');
        return;
    } try {
        setBusy(true);
        const c = places[city].find(t => t.name === suburb)!;
        const body = new FormData();
        for (const [k, v] of Object.entries({ title, description, category, location: `${suburb}, ${city}, QLD`, latitude: String(lat ?? c.lat), longitude: String(lon ?? c.lon) }))
            body.append(k, v);
        body.append('photo', { uri: photo, name: 'incident.jpg', type: 'image/jpeg' } as any);
        await x.api('/api/reports', { method: 'POST', body });
        Alert.alert('Report submitted', 'Your report is now saved in MySQL and awaits screening/review.', [{ text: 'View reports', onPress: () => router.replace('/live-reports') }]);
        setTitle('');
        setDesc('');
        setPhoto('');
        setLat(null);
        setLon(null);
    }
    catch (e: any) {
        Alert.alert('Submission failed', e.message);
    }
    finally {
        setBusy(false);
    } }
    return <ScrollView style={S.screen} contentContainerStyle={S.content}><Text style={S.heading}>📸 Report an issue</Text><Text style={S.sub}>Send a real report to your Flask/MySQL database for administrator review.</Text><View style={[S.card, { marginTop: 18 }]}><Text style={S.label}>Title *</Text><TextInput style={S.input} value={title} onChangeText={setTitle} placeholder="e.g. Litter near park"/><Text style={S.label}>Description *</Text><TextInput style={[S.input, { height: 105 }]} multiline value={description} onChangeText={setDesc}/><Text style={S.label}>Category</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{categories.map(c => <Pressable key={c} style={[S.chip, category === c && { backgroundColor: C.mint }]} onPress={() => setCategory(c)}><Text style={S.chipText}>{c}</Text></Pressable>)}</View><Text style={S.label}>City</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Object.keys(places).map(c => <Pressable key={c} style={[S.chip, city === c && { backgroundColor: C.mint }]} onPress={() => { setCity(c); setSuburb(places[c][0].name); }}><Text style={S.chipText}>{c}</Text></Pressable>)}</View><Text style={S.label}>Suburb</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{places[city].map(c => <Pressable key={c.name} style={[S.chip, suburb === c.name && { backgroundColor: C.mint }]} onPress={() => setSuburb(c.name)}><Text style={S.chipText}>{c.name}</Text></Pressable>)}</View><Text style={S.small}>Suburb centre is an approximate fallback. Use GPS for an accurate site location.</Text><Pressable style={S.secondary} onPress={locate}><Text style={S.secondaryText}>{lat !== null ? '✓ GPS captured' : '📍 Capture current GPS'}</Text></Pressable><Pressable style={S.secondary} onPress={choose}><Text style={S.secondaryText}>🖼 Choose issue photo *</Text></Pressable>{photo ? <Image source={{ uri: photo }} style={{ height: 170, borderRadius: 13, marginTop: 12 }}/> : null}<Pressable style={S.primary} disabled={busy} onPress={submit}><Text style={S.primaryText}>{busy ? 'Uploading...' : 'Submit real report'}</Text></Pressable></View><Text style={S.small}>Never post photos of private people without permission. Hazardous reports require review; no public cleanup is authorised by submission alone.</Text></ScrollView>;
}

