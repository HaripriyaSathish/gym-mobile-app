import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { api, loadToken, setToken, setUnauthorizedHandler } from './api';
import { resetWarm } from './prefetch';
import { getPushToken } from './push';

const AuthContext = createContext(null);
const ROLE_KEY = 'pf_role';

export function AuthProvider({ children }) {
  // role: 'member' | 'trainer' — decides which app (member tabs or trainer tabs) is shown
  const [state, setState] = useState({ ready: false, token: null, role: null });

  useEffect(() => {
    Promise.all([loadToken(), AsyncStorage.getItem(ROLE_KEY)]).then(([t, role]) =>
      setState({ ready: true, token: t, role: t ? role || 'member' : null }));
    // Expired / revoked session → back to the login screen
    setUnauthorizedHandler(() => {
      setToken(null);
      AsyncStorage.removeItem(ROLE_KEY);
      setState({ ready: true, token: null, role: null });
    });
  }, []);

  const start = async (res) => {
    const role = res.role || 'member';
    await setToken(res.token);
    await AsyncStorage.setItem(ROLE_KEY, role);
    setState({ ready: true, token: res.token, role });
  };

  const signIn = async (username, password) =>
    start(await api('/auth/login/', { method: 'POST', body: { username, password } }));

  const signUp = async (details) => start(await api('/auth/register/', { method: 'POST', body: details }));

  const signOut = async () => {
    try {
      // Unregister this device so a signed-out phone stops getting this member's notifications
      await api('/auth/logout/', { method: 'POST', body: { push_token: getPushToken() } });
    } catch {}
    await setToken(null);
    await AsyncStorage.removeItem(ROLE_KEY);
    resetWarm();
    setState({ ready: true, token: null, role: null });
  };

  return <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
