import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, DataScreen, PageHeader, T, fmtDate } from '../components/ui';
import { useApi } from '../useApi';
import { colors, fonts, radius } from '../theme';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AttendanceScreen({ navigation }) {
  const q = useApi('/attendance/');
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12, backgroundColor: colors.bg }}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 8 }}>
        <Ionicons name="chevron-back" size={24} color={colors.navy} />
      </Pressable>
      <View style={{ flex: 1, marginLeft: -12 }}>
        <PageHeader title="Attendance" subtitle="Consistency beats intensity" />
      </View>
    </View>
  );

  return (
    <DataScreen q={q} header={header}>
      {({ summary: s, records }) => {
        const map = Object.fromEntries(records.map((r) => [r.date, r.status]));
        const today = new Date();
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const offset = (first.getDay() + 6) % 7;
        const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
        const absences = records.filter((r) => r.status === 'absent').slice(0, 8);
        return (
          <View style={{ paddingHorizontal: 20, gap: 14, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Big value={s.present} label="Present" color={colors.green} />
              <Big value={s.absent} label="Absent" color={colors.red} />
              <Big value={`${s.rate}%`} label="Rate" color={colors.primary} />
            </View>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 34 }}>🔥</Text>
              <View style={{ flex: 1 }}>
                <T.H2>{s.streak}-session streak</T.H2>
                <T.Muted>{s.streak >= 5 ? 'On fire! Keep it rolling.' : 'Show up tomorrow to build your streak.'}</T.Muted>
              </View>
            </Card>

            <Card>
              <Text style={st.month}>{today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
              <View style={st.grid}>
                {WEEK.map((w, i) => <Text key={i} style={st.week}>{w}</Text>)}
                {cells.map((d, i) => {
                  if (!d) return <View key={`e${i}`} style={st.cell} />;
                  const key = iso(new Date(today.getFullYear(), today.getMonth(), d));
                  const status = map[key];
                  const isToday = d === today.getDate();
                  return (
                    <View key={key} style={st.cell}>
                      <View style={[st.day, status === 'present' && { backgroundColor: colors.green },
                        status === 'absent' && { backgroundColor: colors.redSoft }, isToday && st.today]}>
                        <Text style={[st.dayText, status === 'present' && { color: '#fff' },
                          status === 'absent' && { color: colors.red }]}>{d}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={st.legend}>
                <Legend color={colors.green} text="Present" />
                <Legend color={colors.redSoft} border={colors.red} text="Absent" />
                <Legend color="#fff" border={colors.primary} text="Today" />
              </View>
            </Card>

            {absences.length ? (
              <Card>
                <T.H2 style={{ marginBottom: 8 }}>Recent absences</T.H2>
                {absences.map((a) => (
                  <View key={a.id} style={st.absRow}>
                    <Ionicons name="close-circle" size={18} color={colors.red} />
                    <T.Body style={{ flex: 1 }}>{fmtDate(a.date)}</T.Body>
                    <T.Muted style={{ fontSize: 12 }}>{a.note || 'Missed session'}</T.Muted>
                  </View>
                ))}
              </Card>
            ) : null}
          </View>
        );
      }}
    </DataScreen>
  );
}

const Big = ({ value, label, color }) => (
  <View style={[st.big, { borderTopColor: color }]}>
    <Text style={[st.bigVal, { color }]}>{value}</Text>
    <T.Muted style={{ fontSize: 12 }}>{label} · month</T.Muted>
  </View>
);
const Legend = ({ color, border, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, borderWidth: border ? 1.5 : 0, borderColor: border }} />
    <T.Muted style={{ fontSize: 12 }}>{text}</T.Muted>
  </View>
);

const st = StyleSheet.create({
  big: { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, borderTopWidth: 4 },
  bigVal: { fontFamily: fonts.display, fontSize: 34, letterSpacing: 0.5 },
  month: { fontFamily: fonts.display, fontSize: 24, color: colors.navy, letterSpacing: 1, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  week: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 11, color: colors.muted, marginBottom: 6 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', marginVertical: 3 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: colors.primary },
  dayText: { fontFamily: fonts.medium, fontSize: 13, color: colors.navy },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  absRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
});
