import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '../../api';
import { Button, Card, DataScreen, Empty, FadeIn, PageHeader, Pop, T, fmtDate } from '../../components/ui';
import { useApi } from '../../useApi';
import { colors, fonts, radius } from '../../theme';

const iso = (d) => d.toISOString().slice(0, 10);
const shift = (s, n) => {
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const todayIso = () => {
  const d = new Date();
  return iso(new Date(d.getTime() - d.getTimezoneOffset() * 60000));
};

export default function CoachAttendanceScreen({ route }) {
  const [batch, setBatch] = useState(route.params?.batch || '');
  const [day, setDay] = useState(todayIso());
  useEffect(() => { if (route.params?.batch) setBatch(route.params.batch); }, [route.params?.batch]);

  const q = useApi(`/coach/attendance/?batch=${batch}&date=${day}`);
  const [marks, setMarks] = useState({});
  const [emailAbsent, setEmailAbsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    if (!q.data) return;
    setMarks(Object.fromEntries(q.data.rows.map((r) => [r.id, r.status])));
    if (!batch && q.data.batch) setBatch(q.data.batch.id);
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAll = (status) => setMarks(Object.fromEntries((q.data?.rows || []).map((r) => [r.id, status])));
  const unmarked = (q.data?.rows || []).filter((r) => !marks[r.id]).length;
  const present = Object.values(marks).filter((s) => s === 'present').length;
  const absent = Object.values(marks).filter((s) => s === 'absent').length;
  const isToday = day === todayIso();

  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await api('/coach/attendance/', { method: 'POST',
        body: { batch: q.data.batch.id, date: day, records: marks, email_absent: emailAbsent } });
      q.setData(res);
      setNote({ ok: true, text: res.info || 'Saved' });
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View style={{ backgroundColor: colors.bg }}>
      <PageHeader title="Attendance" subtitle="Mark present or absent for your batch" />
      {q.data?.batches?.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
          {q.data.batches.map((b) => (
            <Pressable key={b.id} onPress={() => setBatch(b.id)} style={[st.chip, b.id === q.data.batch?.id && st.chipOn]}>
              <Text style={[st.chipText, b.id === q.data.batch?.id && { color: '#fff' }]}>{b.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={st.dateBar}>
        <Pressable onPress={() => setDay(shift(day, -1))} hitSlop={10} style={st.dateBtn} accessibilityLabel="Previous day">
          <Ionicons name="chevron-back" size={20} color={colors.navy} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={st.dateText}>{isToday ? 'Today' : fmtDate(day)}</Text>
          {isToday ? <T.Muted style={{ fontSize: 11 }}>{fmtDate(day)}</T.Muted> : null}
        </View>
        <Pressable onPress={() => !isToday && setDay(shift(day, 1))} hitSlop={10} style={[st.dateBtn, isToday && { opacity: 0.3 }]}
          accessibilityLabel="Next day">
          <Ionicons name="chevron-forward" size={20} color={colors.navy} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <DataScreen q={q} header={header} contentStyle={{ paddingTop: 12 }}>
      {(d) => !d.batch ? (
        <Empty icon="people-outline" title="No batches yet" text="Ask the admin to assign you as coach of a batch." />
      ) : !d.rows.length ? (
        <Empty icon="person-add-outline" title="No members in this batch" text="Members who join this batch will show up here." />
      ) : (
        <FadeIn style={{ paddingHorizontal: 20, gap: 12 }}>
          <View style={st.summary}>
            <Text style={st.sumText}><Text style={{ color: colors.green }}>{present}</Text> present · <Text style={{ color: colors.red }}>{absent}</Text> absent{unmarked ? ` · ${unmarked} left` : ''}</Text>
            <Pressable onPress={() => setAll('present')} hitSlop={8}><Text style={st.link}>All present</Text></Pressable>
          </View>

          <Card style={{ paddingVertical: 4 }}>
            {d.rows.map((r, i) => (
              <View key={r.id} style={[st.row, i === d.rows.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={st.avatar}><Text style={st.initial}>{r.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.name} numberOfLines={1}>{r.name}</Text>
                  {r.auto && marks[r.id] === 'absent' ? <Text style={st.auto}>Auto: no check-in</Text> : null}
                </View>
                <Toggle on={marks[r.id] === 'present'} color={colors.green} icon="checkmark" label="Present"
                  onPress={() => setMarks((m) => ({ ...m, [r.id]: 'present' }))} />
                <Toggle on={marks[r.id] === 'absent'} color={colors.red} icon="close" label="Absent"
                  onPress={() => setMarks((m) => ({ ...m, [r.id]: 'absent' }))} />
              </View>
            ))}
          </Card>

          <View style={st.switchRow}>
            <View style={{ flex: 1 }}>
              <T.H2 style={{ fontSize: 14 }}>Email absentees</T.H2>
              <T.Muted style={{ fontSize: 12 }}>Send a &ldquo;we missed you&rdquo; email to members marked absent</T.Muted>
            </View>
            <Switch value={emailAbsent} onValueChange={setEmailAbsent} trackColor={{ true: colors.primary }} thumbColor="#fff" />
          </View>

          {note ? (
            <View style={[st.note, { backgroundColor: note.ok ? colors.greenSoft : colors.redSoft }]}>
              <Ionicons name={note.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={note.ok ? colors.green : colors.red} />
              <Text style={[st.noteText, { color: note.ok ? colors.green : colors.red }]}>{note.text}</Text>
            </View>
          ) : null}

          <Button title={`Save attendance (${present + absent}/${d.rows.length})`} icon="save-outline" onPress={save} loading={busy}
            disabled={present + absent === 0} />
        </FadeIn>
      )}
    </DataScreen>
  );
}

const Toggle = ({ on, color, icon, label, onPress }) => (
  <Pressable onPress={onPress} accessibilityLabel={label} accessibilityState={{ selected: on }}
    style={[st.toggle, { borderColor: on ? color : colors.border, backgroundColor: on ? color : '#fff' }]}>
    <Pop active={on} to={1.25}><Ionicons name={icon} size={18} color={on ? '#fff' : colors.muted} /></Pop>
  </Pressable>
);

const st = StyleSheet.create({
  chips: { paddingHorizontal: 20, gap: 8, paddingTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.navy },
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 8 },
  dateBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
  dateText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.navy },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sumText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.navy },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  name: { fontFamily: fonts.medium, fontSize: 14, color: colors.navy },
  auto: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  toggle: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14,
    borderWidth: 1, borderColor: colors.border },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10 },
  noteText: { fontFamily: fonts.medium, fontSize: 13, flex: 1 },
});
