import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

const PHONE_W = 390;
const PHONE_H = 844;
const BEZEL = 12;

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false });
}

function useWindow() {
  const [win, setWin] = useState(Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWin(window));
    return () => sub?.remove();
  }, []);
  return win;
}

/**
 * On a desktop browser, renders the app inside a realistic phone (390x844) centred on the page.
 * On a real phone (native, or a narrow mobile browser) it renders the app full-screen.
 */
export default function PhoneFrame({ children }) {
  const win = useWindow();
  const time = useClock();
  if (Platform.OS !== 'web' || win.width < 520) return children;

  // Scale the phone down on short screens so it is always fully visible (no page scrolling).
  const totalH = PHONE_H + BEZEL * 2;
  const scale = Math.min(1, (win.height - 40) / totalH);

  return (
    <View style={st.page}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={st.blobA} />
        <View style={st.blobB} />
      </View>
      <View style={{ width: (PHONE_W + BEZEL * 2) * scale, height: totalH * scale }}>
        <View style={[st.phone, { position: 'absolute', top: 0, left: 0, transform: [{ scale }], transformOrigin: 'top left' }]}>
          <View style={[st.btn, { left: -4, top: 160, height: 34 }]} />
          <View style={[st.btn, { left: -4, top: 220, height: 64 }]} />
          <View style={[st.btn, { left: -4, top: 296, height: 64 }]} />
          <View style={[st.btn, { right: -4, top: 240, height: 96 }]} />
          <View style={st.screen}>
            <View style={st.statusBar}>
              <Text style={st.time}>{time}</Text>
              <View style={st.island} />
              <View style={st.icons}>
                <Ionicons name="cellular" size={14} color={colors.navy} />
                <Ionicons name="wifi" size={14} color={colors.navy} />
                <Ionicons name="battery-full" size={18} color={colors.navy} />
              </View>
            </View>
            <View style={{ flex: 1, overflow: 'hidden' }}>{children}</View>
            <View style={st.homeBar}><View style={st.homeIndicator} /></View>
          </View>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  page: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFF3EA', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 70, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 520, height: 520, borderRadius: 260, backgroundColor: '#FFD9C7', top: -160, left: -120, opacity: 0.7 },
  blobB: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#FFE7A8', bottom: -160, right: -80, opacity: 0.5 },
  phone: { width: PHONE_W + BEZEL * 2, height: PHONE_H + BEZEL * 2, borderRadius: 62, backgroundColor: '#1B2340', padding: BEZEL,
    boxShadow: '0px 40px 80px rgba(27,35,64,0.35), inset 0px 0px 0px 2px #3A4675' },
  btn: { position: 'absolute', width: 4, backgroundColor: '#2C3765', borderRadius: 2 },
  screen: { flex: 1, borderRadius: 50, overflow: 'hidden', backgroundColor: colors.bg },
  statusBar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30, backgroundColor: colors.bg, zIndex: 10 },
  time: { fontFamily: fonts.semibold, fontSize: 15, color: colors.navy, width: 60 },
  island: { width: 120, height: 34, borderRadius: 20, backgroundColor: '#0B0F1E' },
  icons: { flexDirection: 'row', gap: 5, alignItems: 'center', width: 60, justifyContent: 'flex-end' },
  homeBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  homeIndicator: { width: 134, height: 5, borderRadius: 3, backgroundColor: colors.navy, opacity: 0.85 },
});
