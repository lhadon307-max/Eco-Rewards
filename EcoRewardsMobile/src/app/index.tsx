/**
 * Welcome, sign-up and home dashboard
 * Shows the sign-in/sign-up screen until authenticated; then loads real report counts, nearby published tasks, points and cleaner milestones from Flask.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ImageBackground, TextInput, Alert, ActivityIndicator, Animated, RefreshControl, Image, StatusBar } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSession } from '../lib/session';
import { C, S } from '../lib/theme';
import { places } from '../lib/places';
const GREEN = '#096944', LIME = '#A7EF4D', INK = '#10291E';
const Tile = ({ title, value, icon, bg }: {
    title: string;
    value: string | number;
    icon: string;
    bg: string;
}) => <View style={{ flex: 1, backgroundColor: bg, borderRadius: 19, paddingVertical: 16, paddingHorizontal: 13, alignItems: 'center' }}><Text style={{ fontSize: 24 }}>{icon}</Text><Text style={{ fontSize: 23, fontWeight: '900', color: INK, marginTop: 4 }}>{value}</Text><Text style={{ fontSize: 11, color: '#345447', marginTop: 3, textAlign: 'center', fontWeight: '700' }}>{title}</Text></View>;
export default function Home() {
    const x = useSession();
    const [verifiedCount, setVerifiedCount] = useState(0);
    const [server, setServer] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState(''), [signup, setSignup] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [counts, setCounts] = useState({ reports: 0, completed: 0, available: 0 }), [near, setNear] = useState<any[]>([]), [loading, setLoading] = useState(false);
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => setServer(x.base), [x.base]);
    useEffect(() => Animated.timing(fade, { toValue: 1, duration: 650, useNativeDriver: true }).start(), []);
    // Validate server and credentials, then authenticate against the Flask/MySQL API.
    async function authenticate() { if (!server.trim() || !email.trim() || !password || (signup && !name.trim())) {
        setErr('Complete the server address and your account details.');
        return;
    } try {
        setBusy(true);
        setErr('');
        const url = server.trim().replace(/\/+$/, '');
        await x.setBase(url);
        const health = await fetch(url + '/api/mobile/health');
        if (!health.ok)
            throw Error('Could not reach the EcoRewards mobile API. Start the Flask backend on your computer first.');
        await x.login(email.trim(), password, signup ? name.trim() : undefined);
    }
    catch (e: any) {
        setErr(e.message || 'Could not connect. Check your Wi-Fi and server settings.');
    }
    finally {
        setBusy(false);
    } }
    // Refresh dashboard counts and published tasks whenever the screen gains focus.
    const load = useCallback(async () => { if (!x.me)
        return; setLoading(true); try {
        const p = places.Brisbane.find(p => p.name === 'South Brisbane')!;
        const [r, t] = await Promise.all([x.api('/api/reports'), x.api(`/api/tasks/nearby?latitude=${p.lat}&longitude=${p.lon}&radius=10`)]);
        const rows = r.reports || [];
        setCounts({ reports: rows.length, completed: rows.filter((z: any) => z.task_status === 'completed' || z.status === 'resolved').length, available: t.count || 0 });
        setNear((t.tasks || []).slice(0, 3));
        try {
            const z = await x.api('/api/advanced/cleaner/recognition');
            setVerifiedCount(z.count || 0);
        }
        catch { }
        await x.refresh();
    }
    catch (e: any) {
        setErr('Dashboard could not refresh: ' + (e.message || String(e)));
    }
    finally {
        setLoading(false);
    } }, [x.token, x.base, x.me?.id]);
    useFocusEffect(useCallback(() => { load(); }, [load]));
    if (!x.ready)
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4FCF5' }}><ActivityIndicator color={GREEN} size="large"/><Text style={{ marginTop: 15, color: GREEN, fontWeight: '900' }}>Opening EcoRewards…</Text></View>;
    if (!x.me)
        return <ScrollView style={{ flex: 1, backgroundColor: '#F5FAF6' }} contentContainerStyle={{ paddingBottom: 55 }} keyboardShouldPersistTaps="handled"><StatusBar barStyle="dark-content"/>
        <ImageBackground source={require('../../assets/community.jpg')} style={{ height: 275, justifyContent: 'flex-end' }} imageStyle={{ borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}><View style={{ backgroundColor: 'rgba(5,50,35,.78)', padding: 26, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}><Text style={{ color: '#C5FA87', fontSize: 15, fontWeight: '900' }}>🌱 EcoRewards</Text><Text style={{ fontSize: 31, color: 'white', fontWeight: '900', lineHeight: 38, marginTop: 8 }}>A cleaner, greener{'\n'}community starts here.</Text><Text style={{ color: '#E5F6EC', marginTop: 8, fontSize: 14 }}>Report environmental issues. Join safe cleanups. Earn verified EcoPoints.</Text></View></ImageBackground>
        <View style={{ paddingHorizontal: 22, paddingTop: 24 }}><Text style={{ fontSize: 27, fontWeight: '900', color: INK }}>{signup ? 'Create your account' : 'Welcome back'}</Text><Text style={{ color: '#617B6C', marginTop: 5, fontSize: 14 }}>{signup ? 'Join the EcoRewards community' : 'Sign in to continue to your dashboard'}</Text>
        <View style={[S.card, { marginTop: 20, borderColor: '#DCEDE3' }]}><Text style={S.label}>EcoRewards server address</Text><TextInput autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.20:5000" placeholderTextColor="#82998D" style={S.input} value={server} onChangeText={setServer}/><Text style={S.small}>Find this on your computer using ipconfig. Both devices must be on the same Wi-Fi.</Text>
        {signup ? <><Text style={S.label}>Your name</Text><TextInput style={S.input} placeholder="Full name" value={name} onChangeText={setName}/></> : null}
        <Text style={S.label}>Email address</Text><TextInput style={S.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com"/>
        <Text style={S.label}>Password</Text><TextInput style={S.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password"/>
        {err ? <Text style={{ marginTop: 13, color: '#B43030', fontSize: 13 }}>{err}</Text> : null}
        <Pressable disabled={busy} style={[S.primary, { backgroundColor: GREEN, padding: 18 }]} onPress={authenticate}><Text style={S.primaryText}>{busy ? 'Connecting…' : signup ? 'Create account' : 'Log in to EcoRewards'}</Text></Pressable>
        <Pressable onPress={() => { setSignup(!signup); setErr(''); }} style={{ padding: 13, alignItems: 'center' }}><Text style={{ color: GREEN, fontWeight: '900' }}>{signup ? 'Already have an account? Log in' : 'New here? Create an account'}</Text></Pressable></View>
        <Text style={[S.small, { textAlign: 'center' }]}>Your session token is stored securely on your device. This local-network development version requires the Flask/MySQL server.</Text></View></ScrollView>;
    const completed = verifiedCount;
    const rank = completed >= 100 ? 'Eco Legend' : completed >= 50 ? 'Community Champion' : completed >= 10 ? 'Eco Explorer' : 'Eco Member';
    const next = completed >= 100 ? 100 : completed >= 50 ? 100 : completed >= 10 ? 50 : 10;
    return <ScrollView style={{ flex: 1, backgroundColor: '#F5FBF7' }} contentContainerStyle={{ paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={GREEN}/>}><StatusBar barStyle="dark-content"/>
    <View style={{ backgroundColor: 'white', paddingHorizontal: 21, paddingTop: 48, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={{ color: INK, fontSize: 27, fontWeight: '900' }}>🌱 EcoRewards</Text><Text style={{ color: '#496959', fontSize: 12, marginTop: 2 }}>Report · Clean · Restore · Get Rewarded</Text></View><Pressable onPress={() => router.push('/profile')} style={{ width: 45, height: 45, borderRadius: 23, backgroundColor: '#DDF6E3', justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 23 }}>♙</Text></Pressable></View>
    <Animated.View style={{ opacity: fade }}><ImageBackground source={require('../../assets/community.jpg')} style={{ height: 224, justifyContent: 'flex-end', marginHorizontal: 15, marginTop: 12, overflow: 'hidden', borderRadius: 25 }} imageStyle={{ borderRadius: 25 }}><View style={{ backgroundColor: 'rgba(0,43,31,.74)', padding: 22 }}><Text style={{ fontSize: 31, lineHeight: 36, fontWeight: '900', color: 'white' }}>Keep Brisbane{'\n'}<Text style={{ color: LIME }}>Clean & Green</Text></Text><Text style={{ fontSize: 14, color: '#E8F7E7', marginTop: 8 }}>Report an issue, join a cleanup and make a difference.</Text></View></ImageBackground></Animated.View>
    <View style={{ paddingHorizontal: 17 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 18 }}><View><Text style={{ fontSize: 22, fontWeight: '900', color: INK }}>Hi, {x.me.name.split(' ')[0]}! 👋</Text><Text style={{ color: '#567262', marginTop: 3 }}>Ready to make a difference today?</Text></View><Pressable onPress={() => router.push('/tasks')} style={{ backgroundColor: '#DEF6E5', padding: 12, borderRadius: 25 }}><Text style={{ color: GREEN, fontWeight: '800' }}>📍 Brisbane  ›</Text></Pressable></View>
    <View style={{ backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#DCEDE1', padding: 18, marginBottom: 16 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: INK, fontSize: 18, fontWeight: '900' }}>🏅 {rank}</Text><Text style={{ color: '#637C6E', fontSize: 12, marginTop: 5 }}>Next milestone: {completed >= 100 ? 'All unlocked' : `${next} approved tasks`}</Text></View><Pressable onPress={() => router.push('/rewards')} style={{ backgroundColor: '#DDF8DE', borderRadius: 17, padding: 12, alignItems: 'center' }}><Text style={{ color: GREEN, fontSize: 22, fontWeight: '900' }}>{x.points.toLocaleString()}</Text><Text style={{ color: GREEN, fontSize: 11, fontWeight: '800' }}>EcoPoints  ›</Text></Pressable></View><View style={{ height: 8, backgroundColor: '#E5EDE8', borderRadius: 8, marginTop: 17, overflow: 'hidden' }}><View style={{ backgroundColor: '#2CAF67', height: 8, width: `${Math.min(100, completed / next * 100)}%`, borderRadius: 8 }}/></View><Text style={{ fontSize: 11, color: '#597364', marginTop: 7 }}>{completed} / {next} verified cleanups toward this milestone</Text></View>
    <Text style={{ fontSize: 20, fontWeight: '900', color: INK, marginBottom: 11 }}>🌱 My Impact</Text><View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}><Tile icon="📋" title="Reports visible" value={counts.reports} bg="#E4F8E9"/><Tile icon="✅" title="Completed" value={counts.completed} bg="#E4F2FF"/><Tile icon="♻" title="Nearby EcoTasks" value={counts.available} bg="#EFE9FF"/></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><Text style={{ color: INK, fontWeight: '900', fontSize: 20 }}>📍 Nearby EcoTasks</Text><Pressable onPress={() => router.push('/tasks')}><Text style={{ fontWeight: '900', color: GREEN }}>View all  ›</Text></Pressable></View>
    {near.length ? near.map((t: any, i: number) => <Pressable key={t.id} onPress={() => router.push({ pathname: '/live-cleaner', params: { task: String(t.id), city: 'Brisbane', suburb: 'South Brisbane', radius: '10' } })} style={{ backgroundColor: 'white', borderRadius: 18, padding: 12, flexDirection: 'row', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E1EDE5' }}><Image source={i % 2 === 0 ? require('../../assets/cleaning.jpg') : require('../../assets/community.jpg')} style={{ width: 90, height: 82, borderRadius: 13 }}/><View style={{ flex: 1, justifyContent: 'center' }}><Text numberOfLines={2} style={{ fontWeight: '900', color: INK, fontSize: 15 }}>{t.title}</Text><Text style={{ color: '#5B7667', fontSize: 12, marginTop: 4 }}>📍 {t.location}  ·  {t.distance_km} km</Text><Text style={{ fontSize: 12, color: GREEN, fontWeight: '900', marginTop: 5 }}>Low-risk published task  ›</Text></View></Pressable>) : <View style={{ backgroundColor: 'white', padding: 18, borderRadius: 18, marginBottom: 12 }}><Text style={{ color: INK, fontWeight: '800' }}>No published tasks nearby yet</Text><Text style={{ color: '#647D6D', marginTop: 4 }}>Choose another suburb or radius in EcoTasks. Unapproved and hazardous reports do not appear.</Text></View>}
    {err ? <Text style={{ color: '#AD3636', fontSize: 12, marginVertical: 6 }}>{err}</Text> : null}
    <Pressable onPress={() => router.push('/rewards')} style={{ marginTop: 10, marginBottom: 16, backgroundColor: '#DFF7E4', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 44, marginRight: 13 }}>🎁</Text><View style={{ flex: 1 }}><Text style={{ fontSize: 18, color: INK, fontWeight: '900' }}>Your EcoPoints</Text><Text style={{ fontSize: 13, color: '#446450', marginTop: 5 }}>Track your rewards and achievement levels</Text><Text style={{ color: GREEN, fontWeight: '900', marginTop: 8 }}>Explore rewards  →</Text></View></Pressable>
    <Text style={{ color: '#61796A', fontSize: 11, textAlign: 'center' }}>EcoRewards • Real backend data. Only authorised low-risk cleanup tasks may be claimed.</Text></View></ScrollView>;
}

