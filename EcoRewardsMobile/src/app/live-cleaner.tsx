/**
 * EcoCleaner verification and task workflow
 * Submits cleaner equipment evidence and declarations, checks admin verification, claims only eligible tasks and submits cleanup evidence.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View, Pressable, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../lib/session';
import { places } from '../lib/places';
import { C, S } from '../lib/theme';
const names = ['gloves', 'footwear', 'grabber', 'bags'] as const;
const safetyKeys = ['access', 'conditions', 'ppe', 'training', 'hazards', 'firstaid', 'dispose', 'stop'];
const claimKeys = ['adult', 'hazards', 'location', 'ppe', 'permission', 'stop'];
export default function LiveCleaner() {
    const x = useSession();
    const params = useLocalSearchParams<{
        task?: string;
        city?: string;
        suburb?: string;
        radius?: string;
    }>();
    const [profile, setProfile] = useState<any>(null), [equipment, setEquipment] = useState<Record<string, string>>({}), [answers, setAnswers] = useState<string[]>([]), [qualification, setQual] = useState(''), [busy, setBusy] = useState(false), [reports, setReports] = useState<any[]>([]), [after, setAfter] = useState(''), [hazard, setHazard] = useState('Unsafe conditions at task location');
    async function load() { if (!x.me)
        return; try {
        const [a, b] = await Promise.all([x.api('/api/advanced/my-profile'), x.api('/api/reports')]);
        setProfile(a);
        setReports((b.reports || []).filter((r: any) => r.assignee_id === x.me?.id));
    }
    catch (e: any) {
        Alert.alert('Could not load cleaner profile', e.message);
    } }
    useFocusEffect(useCallback(() => { load(); }, [x.token]));
    async function choose(equipKey?: string) { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .7 }); if (r.canceled)
        return; const uri = r.assets[0].uri; if (equipKey)
        setEquipment(v => ({ ...v, [equipKey]: uri }));
    else
        setAfter(uri); }
    async function sendImage(uri: string) { const fd = new FormData(); fd.append('photo', { uri, name: 'equipment.jpg', type: 'image/jpeg' } as any); const r = await x.api('/api/advanced/equipment/upload', { method: 'POST', body: fd }); return r.reference; }
    async function apply() { if (names.some(k => !equipment[k]) || answers.length !== safetyKeys.length) {
        Alert.alert('Application incomplete', 'Add four evidence photos and accept every safety requirement.');
        return;
    } try {
        setBusy(true);
        const refs: Record<string, string> = {};
        for (const k of names)
            refs[k] = await sendImage(equipment[k]);
        await x.api('/api/advanced/cleaner/apply', { method: 'POST', body: JSON.stringify({ answers: Object.fromEntries(safetyKeys.map(k => [k, true])), equipment: refs, qualification }) });
        Alert.alert('Submitted', 'Your application is pending REAL admin approval.');
        await load();
    }
    catch (e: any) {
        Alert.alert('Application failed', e.message);
    }
    finally {
        setBusy(false);
    } }
    async function claim() { if (!profile?.cleaner || profile.cleaner.status !== 'approved') {
        Alert.alert('Admin approval required', 'An administrator must approve your cleaner application first.');
        return;
    } if (!params.task) {
        router.push('/live-tasks');
        return;
    } const pos = places[params.city || 'Brisbane']?.find(p => p.name === params.suburb) || places.Brisbane[1]; const body = { latitude: pos.lat, longitude: pos.lon, radius: Number(params.radius) || 10, accepted: true, answers: Object.fromEntries(claimKeys.map(k => [k, true])) }; Alert.alert('Site safety is mandatory', 'Confirm each safety requirement before claiming. You must be an adult, have PPE, permission to access the site, assess hazards and stop if unsafe. This confirmation does not replace an actual site inspection.', [{ text: 'Cancel' }, { text: 'I confirm — claim', onPress: async () => { try {
                await x.api(`/api/reports/${params.task}/claim`, { method: 'POST', body: JSON.stringify(body) });
                Alert.alert('Task claimed', 'Check the location and stop immediately if unsafe.');
                await load();
            }
            catch (e: any) {
                Alert.alert('Cannot claim', e.message);
            } } }]); }
    async function complete(id: number) { if (!after) {
        Alert.alert('After photo required', 'Submit photographic evidence to administrator review.');
        return;
    } try {
        setBusy(true);
        const fd = new FormData();
        fd.append('photo', { uri: after, name: 'after-cleanup.jpg', type: 'image/jpeg' } as any);
        await x.api(`/api/reports/${id}/complete`, { method: 'POST', body: fd });
        setAfter('');
        Alert.alert('Evidence submitted', 'Await admin review. Points are NOT awarded until approval.');
        await load();
    }
    catch (e: any) {
        Alert.alert('Could not submit', e.message);
    }
    finally {
        setBusy(false);
    } }
    async function stop(id: number) { try {
        await x.api(`/api/reports/${id}/stop`, { method: 'POST', body: JSON.stringify({ reason: hazard }) });
        Alert.alert('Stopped safely', 'Task suspended for admin review.');
        await load();
    }
    catch (e: any) {
        Alert.alert('Unable to stop', e.message);
    } }
    return <ScrollView style={S.screen} contentContainerStyle={S.content}><Text style={S.heading}>🦺 Verified EcoCleaner</Text><Text style={S.sub}>Real cleaner status, uploaded evidence, claim safety and MySQL task records.</Text>{!x.me ? <Pressable style={S.primary} onPress={() => router.push('/live')}><Text style={S.primaryText}>Sign in first</Text></Pressable> : null}
    <View style={[S.card, { marginTop: 18 }]}><Text style={{ fontSize: 19, color: C.ink, fontWeight: '900' }}>Verification status</Text><Text style={S.sub}>{profile?.cleaner?.status || 'Not applied'}</Text><Text style={S.small}>Only an administrator can approve or suspend cleaner verification.</Text><Pressable style={S.secondary} onPress={load}><Text style={S.secondaryText}>Refresh status</Text></Pressable></View>
    {!profile?.cleaner || ['rejected', 'more_evidence', 'suspended'].includes(profile?.cleaner?.status) ? <View style={S.card}><Text style={{ fontSize: 19, color: C.ink, fontWeight: '900' }}>Apply for verification</Text><Text style={S.sub}>Upload separate pictures of your gloves, footwear, litter grabber and rubbish bags.</Text>{names.map(k => <Pressable key={k} style={S.secondary} onPress={() => choose(k)}><Text style={S.secondaryText}>{equipment[k] ? '✓' : '📸'} {k.toUpperCase()} evidence</Text></Pressable>)}<Text style={S.label}>Relevant training (optional)</Text><TextInput style={S.input} value={qualification} onChangeText={setQual}/><Text style={S.label}>Safety declarations (tap each)</Text>{safetyKeys.map(k => <Pressable key={k} style={[S.chip, answers.includes(k) && { backgroundColor: C.mint }]} onPress={() => setAnswers(v => v.includes(k) ? v.filter(t => t !== k) : [...v, k])}><Text style={S.chipText}>{answers.includes(k) ? '☑' : '☐'} {k}: {({ access: 'Location access is permitted', conditions: 'I will assess conditions', ppe: 'I have correct PPE', training: 'I understand task scope', hazards: 'No hazardous waste handling', firstaid: 'I know emergency arrangements', dispose: 'I know lawful disposal', stop: 'I will stop if unsafe' } as any)[k]}</Text></Pressable>)}<Pressable style={S.primary} disabled={busy} onPress={apply}><Text style={S.primaryText}>{busy ? 'Uploading evidence...' : 'Submit to real admin'}</Text></Pressable></View> : null}
    {params.task ? <View style={[S.card, { borderColor: C.green }]}><Text style={{ color: C.ink, fontWeight: '900', fontSize: 18 }}>Selected task #{params.task}</Text><Pressable style={S.primary} onPress={claim}><Text style={S.primaryText}>Review safety and claim</Text></Pressable></View> : null}
    <Text style={[S.heading, { fontSize: 22, marginBottom: 14 }]}>My assigned tasks</Text>{reports.filter(r => ['in_progress', 'evidence_review', 'completed', 'unsafe_suspended', 'withdrawn_review'].includes(r.task_status)).map(r => <View style={S.card} key={r.id}><Text style={{ fontSize: 17, color: C.ink, fontWeight: '900' }}>{r.title}</Text><Text style={S.sub}>{r.location} · {r.task_status}</Text>{r.task_status === 'in_progress' ? <><Pressable style={S.secondary} onPress={() => choose()}><Text style={S.secondaryText}>{after ? '✓ Photo selected' : '📸 Select AFTER-cleanup photo'}</Text></Pressable>{after ? <Image source={{ uri: after }} style={{ height: 100, borderRadius: 8 }}/> : null}<Pressable style={S.primary} disabled={busy} onPress={() => complete(r.id)}><Text style={S.primaryText}>Submit evidence for admin review</Text></Pressable><Text style={S.label}>Reason for unsafe stop</Text><TextInput style={S.input} value={hazard} onChangeText={setHazard}/><Pressable style={S.secondary} onPress={() => stop(r.id)}><Text style={[S.secondaryText, { color: C.red }]}>⚠ Stop unsafe task</Text></Pressable></> : null}</View>)}<Text style={S.small}>Do not carry out real cleanup on a fictional demo report. Only approved, permitted low-risk sites are eligible.</Text></ScrollView>;
}

