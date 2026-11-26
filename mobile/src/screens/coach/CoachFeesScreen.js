import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { confirm } from '../../confirm';
import { Card, DataScreen, Empty, FadeIn, PageHeader, Pill, T, fmtShort, rupee } from '../../components/ui';
import { useApi } from '../../useApi';
import { colors, fonts, radius } from '../../theme';

export default function CoachFeesScreen() {
  const [tab, setTab] = useState('due');
  const q = useApi(`/coach/payments/?status=${tab}`);
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState(null);

  const markCash = async (p) => {
    if (!(await confirm('Mark as paid in cash?', `${p.member} paid ${rupee(p.amount)} for ${p.title} at the desk.`, 'Mark paid'))) return;
    setBusyId(p.id);
    try {
      await api(`/coach/payments/${p.id}/cash/`, { method: 'POST' });
      q.setData(q.data.filter((x) => x.id !== p.id));
      setNote({ ok: true, text: `${p.member}: ${rupee(p.amount)} marked paid (cash)` });
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const remind = async (p) => {
    setBusyId(p.id);
    try {
      const res = await api(`/coach/payments/${p.id}/remind/`, { method: 'POST' });
      setNote({ ok: true, text: `${p.member}: ${res.info}` });
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const total = (q.data || []).reduce((s, p) => s + Number(p.amount), 0);
  const header = (
    <View style={{ backgroundColor: colors.bg }}>
      <PageHeader title="Fees" subtitle={tab === 'due' ? `${rupee(total)} pending in your batches` : 'Recent payments'} />
      <View style={st.tabs}>
        {[['due', 'Due', 'hourglass-outline'], ['paid', 'Paid', 'checkmark-done-outline']].map(([k, l, i]) => (
          <Pressable key={k} onPress={() => { setTab(k); setNote(null); }} style={[st.tab, tab === k && st.tabActive]}>
            <Ionicons name={i} size={16} color={tab === k ? '#fff' : colors.muted} />
            <Text style={[st.tabText, tab === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {note ? (
        <View style={[st.note, { backgroundColor: note.ok ? colors.greenSoft : colors.redSoft }]}>
          <Ionicons name={note.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={note.ok ? colors.green : colors.red} />
          <Text style={[st.noteText, { color: note.ok ? colors.green : colors.red }]}>{note.text}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <DataScreen q={q} header={header} contentStyle={{ paddingTop: 12 }}>
      {(list) => list.length ? (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {list.map((p, i) => (
            <FadeIn key={p.id} index={i}><Card>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <T.H2 style={{ fontSize: 15 }}>{p.member}</T.H2>
                  <T.Muted style={{ fontSize: 12 }}>{p.title} · {p.batch}</T.Muted>
                </View>
                <Text style={st.amount}>{rupee(p.amount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                {tab === 'due' ? (
                  <Pill text={`${p.is_overdue ? 'Overdue' : 'Due'} ${fmtShort(p.due_date)}`} color={p.is_overdue ? colors.red : colors.amber} icon="time" />
                ) : (
                  <Pill text={`Paid ${p.paid_at ? fmtShort(p.paid_at) : ''} · ${p.method || 'online'}`} color={colors.green} icon="checkmark" />
                )}
              </View>
              {tab === 'due' ? (
                <View style={st.actions}>
                  <Pressable onPress={() => remind(p)} disabled={busyId === p.id} style={[st.act, st.actGhost]}>
                    <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                    <Text style={[st.actText, { color: colors.primary }]}>Remind</Text>
                  </Pressable>
                  <Pressable onPress={() => markCash(p)} disabled={busyId === p.id} style={[st.act, { backgroundColor: colors.green }]}>
                    <Ionicons name="cash-outline" size={16} color="#fff" />
                    <Text style={st.actText}>{busyId === p.id ? 'Saving…' : 'Paid in cash'}</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card></FadeIn>
          ))}
        </View>
      ) : <Empty icon={tab === 'due' ? 'happy-outline' : 'receipt-outline'} title={tab === 'due' ? 'All fees clear' : 'No payments yet'}
        text={tab === 'due' ? 'Nobody in your batches owes anything.' : 'Paid fees will show here.'} />}
    </DataScreen>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, backgroundColor: '#fff', borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  amount: { fontFamily: fonts.display, fontSize: 24, color: colors.navy },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  act: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  actGhost: { borderWidth: 1.5, borderColor: colors.primary },
  actText: { fontFamily: fonts.semibold, fontSize: 13, color: '#fff' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginHorizontal: 20, marginTop: 10 },
  noteText: { fontFamily: fonts.medium, fontSize: 13, flex: 1 },
});
