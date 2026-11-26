import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Web: same machine as the browser. Expo Go on a phone: the computer running Metro (LAN IP).
function backendHost() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.hostname || 'localhost';
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '';
  return hostUri.split(':')[0] || 'localhost';
}

// Deployed backend (Render): set EXPO_PUBLIC_API_URL=https://<your-service>.onrender.com/api in mobile/.env
// Not set: the local Django server on port 8000 (MySQL).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || `http://${backendHost()}:8000/api`).replace(/\/$/, '');

let token = null;
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}
const memoryCache = new Map();

// Last good response for each screen, saved on the device so the app opens with content instantly
// (then refreshes in the background). Cleared on sign-out / when a different user signs in.
const CACHE_KEY = 'pf_cache_v1';
let saveTimer = null;
function persistSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memoryCache))).catch(() => {});
  }, 800);
}

export async function loadToken() {
  const [t, saved] = await Promise.all([AsyncStorage.getItem('pf_token'), AsyncStorage.getItem(CACHE_KEY)]);
  token = t;
  try {
    Object.entries(JSON.parse(saved || '{}')).forEach(([k, v]) => { if (!memoryCache.has(k)) memoryCache.set(k, v); });
  } catch {}
  return token;
}

export async function setToken(t) {
  const changed = t !== token;
  token = t;
  if (changed) {
    clearTimeout(saveTimer); // don't let a pending save write the previous user's data back
    memoryCache.clear();
    AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
  }
  if (t) await AsyncStorage.setItem('pf_token', t);
  else await AsyncStorage.removeItem('pf_token');
}

export async function api(path, { method = 'GET', body, timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    if (!res.ok) {
      const err = new Error(data.detail || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    if (method === 'GET') {
      memoryCache.set(path, data);
      persistSoon();
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server is taking too long. Check the backend is running.');
    if (e.message === 'Failed to fetch' || e.message === 'Network request failed') {
      throw new Error(`Can't reach the PulseForge server at ${API_URL}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Instant data for already-visited screens (keeps navigation snappy), refreshed in the background.
export function cached(path) {
  return memoryCache.get(path);
}
