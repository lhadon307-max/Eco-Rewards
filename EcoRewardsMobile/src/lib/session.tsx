/**
 * Authentication and API client
 * Stores bearer tokens securely on device; stores server address in AsyncStorage; supplies authenticated fetch with errors and timeouts.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
export type Me = {
    id: number;
    name: string;
    email: string;
    role: string;
} | null;
type Ctx = {
    base: string;
    setBase: (v: string) => Promise<void>;
    me: Me;
    points: number;
    ready: boolean;
    token: string;
    login: (email: string, password: string, registerName?: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    api: (path: string, opts?: RequestInit) => Promise<any>;
};
const ctx = createContext<Ctx>(null as any);
const TOKEN = 'ecorewards_native_token';
export function SessionProvider({ children }: {
    children: React.ReactNode;
}) {
    const baseRef = useRef('');
    const [base, setBaseValue] = useState(''), [token, setToken] = useState(''), [me, setMe] = useState<Me>(null), [points, setPoints] = useState(0), [ready, setReady] = useState(false);
    useEffect(() => { Promise.all([AsyncStorage.getItem('ecorewards_api'), SecureStore.getItemAsync(TOKEN)]).then(([url, t]) => { baseRef.current = url ?? ''; setBaseValue(url ?? ''); setToken(t ?? ''); }).finally(() => setReady(true)); }, []);
    // Persist the user-selected Flask URL. The app never connects directly to MySQL.
    async function setBase(url: string) { const v = url.trim().replace(/\/+$/, ''); if (v && !/^https?:\/\/[^/]+/.test(v))
        throw Error('Enter a full address such as http://192.168.1.10:5000'); baseRef.current = v; setBaseValue(v); await AsyncStorage.setItem('ecorewards_api', v); setMe(null); }
    // Attach the bearer token and turn network/HTTP errors into readable messages.
    async function api(path: string, opts: RequestInit = {}, overrideToken?: string) {
        if (!baseRef.current)
            throw Error('Enter your Flask server address on the login screen.');
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 14000);
        try {
            const response = await fetch(`${baseRef.current}${path}`, { ...opts, headers: { ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(opts.headers || {}), ...((overrideToken ?? token) ? { Authorization: `Bearer ${overrideToken ?? token}` } : {}) }, signal: controller.signal });
            const data = await response.json().catch(() => ({ error: 'Server did not return JSON' }));
            if (!response.ok || data?.ok === false)
                throw Error(data.error || data.message || `HTTP ${response.status}`);
            return data;
        }
        catch (e: any) {
            if (e.name === 'AbortError')
                throw Error('Connection timed out. Check Wi-Fi and Flask server.');
            throw e;
        }
        finally {
            clearTimeout(t);
        }
    }
    async function refresh() { if (!base || !token) {
        setMe(null);
        setPoints(0);
        return;
    } try {
        const d = await api('/api/me');
        setMe(d.user || null);
        setPoints(d.points || 0);
    }
    catch {
        setMe(null);
    } }
    useEffect(() => { if (ready && token && base)
        refresh(); }, [ready, token, base]);
    // Log in or register; store the returned token in OS-protected SecureStore.
    async function login(email: string, password: string, registerName?: string) { const d = await api(registerName ? '/api/register' : '/api/login', { method: 'POST', body: JSON.stringify({ email, password, name: registerName, mobile: true }) }); if (!d.token)
        throw Error('Server did not issue a mobile session token. Please use the included updated backend.'); await SecureStore.setItemAsync(TOKEN, d.token); setToken(d.token); const user = await api('/api/me', {}, d.token); setMe(user.user); setPoints(user.points || 0); }
    // Clear the session locally even when the backend is temporarily unavailable.
    async function logout() { try {
        await api('/api/logout', { method: 'POST' });
    }
    catch { } await SecureStore.deleteItemAsync(TOKEN); setToken(''); setMe(null); setPoints(0); }
    return <ctx.Provider value={{ base, setBase, me, token, points, ready, login, logout, refresh, api }}>{children}</ctx.Provider>;
}
export const useSession = () => useContext(ctx);

