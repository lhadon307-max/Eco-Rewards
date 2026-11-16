/**
 * Connection and account tools
 * Allows users to inspect and adjust the local Flask server connection and authenticated account.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React, { useState, useEffect } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../lib/session';
import { C, S } from '../lib/theme';
export default function Live() {
    const x = useSession();
    const [url, setUrl] = useState(x.base), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState(''), [register, setRegister] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
    useEffect(() => setUrl(x.base), [x.base]);
    async function save() { try {
        setBusy(true);
        await x.setBase(url);
        const d = await fetch(url.trim().replace(/\/+$/, '') + '/api/mobile/health');
        if (!d.ok)
            throw Error('Mobile API not found');
        setStatus('✓ API reachable');
    }
    catch (e: any) {
        Alert.alert('Connection failed', e.message || String(e));
    }
    finally {
        setBusy(false);
    } }
    async function signIn() { if (!email || !password || register && !name) {
        Alert.alert('Missing information', 'Complete the form.');
        return;
    } try {
        setBusy(true);
        await x.login(email.trim(), password, register ? name.trim() : undefined);
        Alert.alert('Connected', 'You are now signed in to your real EcoRewards database.');
    }
    catch (e: any) {
        Alert.alert('Sign-in failed', e.message);
    }
    finally {
        setBusy(false);
    } }
    return <ScrollView style={S.screen} contentContainerStyle={S.content}><Text style={S.heading}>🔗 Live EcoRewards</Text><Text style={S.sub}>Real accounts and tasks from your Flask / MySQL server. This is separate from the offline demonstration.</Text>
    <View style={[S.card, { marginTop: 18 }]}><Text style={{ color: C.ink, fontWeight: '900', fontSize: 19 }}>1 · Connect your server</Text><Text style={S.label}>Computer's network address</Text><TextInput style={S.input} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.10:5000"/><Pressable style={S.secondary} onPress={save} disabled={busy}><Text style={S.secondaryText}>Test and save server</Text></Pressable><Text style={S.small}>{status || 'Phone and computer must be on the same Wi-Fi. Never enter localhost or 127.0.0.1 on the phone.'}</Text></View>
    {x.me ? <><View style={[S.card, { backgroundColor: C.mint }]}><Text style={{ color: C.ink, fontSize: 20, fontWeight: '900' }}>✓ Signed in as {x.me.name}</Text><Text style={S.sub}>{x.me.email} · {x.me.role}</Text><Pressable style={S.secondary} onPress={async () => { await x.refresh(); Alert.alert('Updated', 'Account data refreshed'); }}><Text style={S.secondaryText}>Refresh data</Text></Pressable><Pressable style={S.secondary} onPress={() => x.logout()}><Text style={S.secondaryText}>Sign out</Text></Pressable></View>{[['📸 Submit real report', '/live-report'], ['📍 Published EcoTasks', '/live-tasks'], ['🦺 Cleaner application & my work', '/live-cleaner'], ['🏆 My real points & badges', '/live-rewards'], ['📋 MySQL reports', '/live-reports']].map(([title, path]) => <Pressable key={path} onPress={() => router.push(path as any)} style={S.card}><Text style={{ color: C.ink, fontSize: 17, fontWeight: '800' }}>{title}  →</Text></Pressable>)}</> : <View style={S.card}><Text style={{ color: C.ink, fontWeight: '900', fontSize: 19 }}>2 · {register ? 'Create account' : 'Sign in'}</Text>{register ? <><Text style={S.label}>Name</Text><TextInput style={S.input} value={name} onChangeText={setName}/></> : null}<Text style={S.label}>Email</Text><TextInput style={S.input} autoCapitalize="none" value={email} onChangeText={setEmail} keyboardType="email-address"/><Text style={S.label}>Password</Text><TextInput style={S.input} secureTextEntry value={password} onChangeText={setPassword}/><Pressable style={S.primary} onPress={signIn} disabled={busy}><Text style={S.primaryText}>{busy ? 'Connecting...' : register ? 'Create real account' : 'Sign in to MySQL'}</Text></Pressable><Pressable style={S.secondary} onPress={() => setRegister(!register)}><Text style={S.secondaryText}>{register ? 'Already have an account? Sign in' : 'New here? Register'}</Text></Pressable></View>}
    {busy ? <ActivityIndicator color={C.green}/> : null}<Text style={S.small}>Development only: keep the Flask server on your private network. For public deployment, use HTTPS and complete a security review.</Text></ScrollView>;
}

