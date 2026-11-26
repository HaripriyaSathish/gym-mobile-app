import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth';
import { Card, DataScreen, IconCircle, T, fmtDate } from '../components/ui';
import { useApi } from '../useApi';
import { colors, fonts, gradients, radius } from '../theme';

export default function ProfileScreen({ navigation }) {
  const q = useApi('/me/');
  const { signOut } = useAuth();
  return (
    <DataScreen q={q}>
      {(m) => {
        const bmi = m.height_cm && m.weight_kg ? (m.weight_kg / (m.height_cm / 100) ** 2).toFixed(1) : null;
        const initials = m.name.split(' ').map((x) => x[0]).join('').slice(0, 2);
        return (
          <>
            <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.head}>
              <View style={st.avatar}><Text style={st.initials}>{initials}</Text></View>
              <Text style={st.name}>{m.name}</Text>
              <Text style={st.goal}>🎯 {m.goal || 'Set a goal with your coach'}</Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 20, marginTop: -30, gap: 14 }}>
              <View style={st.metrics}>
                <Metric label="Height" value={m.height_cm ? `${m.height_cm}` : '-'} unit="cm" />
                <Metric label="Weight" value={m.weight_kg ? `${Number(m.weight_kg)}` : '-'} unit="kg" />
                <Metric label="BMI" value={bmi || '-'} />
              </View>

              <Card style={{ paddingVertical: 6 }}>
                <Row icon="people-outline" label="Batch" value={m.batch ? m.batch.name : 'Not assigned'} />
                <Row icon="time-outline" label="Timing" value={m.batch ? `${m.batch.start} · ${m.batch.days}` : '-'} />
                <Row icon="person-outline" label="Trainer" value={m.batch?.trainer || '-'} />
                <Row icon="calendar-outline" label="Member since" value={fmtDate(m.joined_on)} />
                <Row icon="ribbon-outline" label="Membership ends" value={m.membership_ends ? fmtDate(m.membership_ends) : '-'} />
                <Row icon="call-outline" label="Phone" value={m.phone || '-'} />
                <Row icon="mail-outline" label="Email" value={m.email || '-'} last />
              </Card>

              <Card style={{ paddingVertical: 6 }}>
                <Link icon="calendar-number-outline" label="Attendance history" onPress={() => navigation.navigate('Attendance')} />
                <Link icon="notifications-outline" label="Reminders" onPress={() => navigation.navigate('Reminders')} />
                <Link icon="nutrition-outline" label="My diet chart" onPress={() => navigation.navigate('Batch', { tab: 'diet' })} />
                <Link icon="log-out-outline" label="Sign out" danger onPress={signOut} last />
              </Card>
              <T.Muted style={{ textAlign: 'center', fontSize: 11 }}>PulseForge Fitness · v1.0</T.Muted>
            </View>
          </>
        );
      }}
    </DataScreen>
  );
}

const Metric = ({ label, value, unit }) => (
  <View style={st.metric}>
    <Text style={st.metricVal}>{value}<Text style={st.unit}>{unit ? ` ${unit}` : ''}</Text></Text>
    <T.Muted style={{ fontSize: 12 }}>{label}</T.Muted>
  </View>
);
const Row = ({ icon, label, value, last }) => (
  <View style={[st.row, !last && st.border]}>
    <Ionicons name={icon} size={18} color={colors.primary} />
    <T.Muted style={{ width: 120 }}>{label}</T.Muted>
    <T.Body style={{ flex: 1, textAlign: 'right', fontFamily: fonts.medium }} numberOfLines={1}>{value}</T.Body>
  </View>
);
const Link = ({ icon, label, onPress, danger, last }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [st.row, !last && st.border, pressed && { opacity: 0.6 }]}>
    <IconCircle name={icon} size={34} color={danger ? colors.red : colors.navy} />
    <T.Body style={{ flex: 1, fontFamily: fonts.medium, color: danger ? colors.red : colors.text }}>{label}</T.Body>
    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
  </Pressable>
);

const st = StyleSheet.create({
  head: { alignItems: 'center', paddingTop: 30, paddingBottom: 50, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  avatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  initials: { fontFamily: fonts.display, fontSize: 38, color: colors.primary, letterSpacing: 1 },
  name: { fontFamily: fonts.display, fontSize: 34, color: '#fff', letterSpacing: 1, marginTop: 10 },
  goal: { fontFamily: fonts.medium, fontSize: 13, color: '#FFE3D8' },
  metrics: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, boxShadow: '0px 8px 24px rgba(255, 90, 54, 0.12)' },
  metric: { flex: 1, alignItems: 'center' },
  metricVal: { fontFamily: fonts.display, fontSize: 28, color: colors.navy },
  unit: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
});
