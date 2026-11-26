import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api } from '../../api';
import { confirm } from '../../confirm';
import { Button, Card, DataScreen, Empty, FadeIn, IconCircle, PageHeader, T, timeAgo } from '../../components/ui';
import { useApi } from '../../useApi';
import { colors, fonts, radius } from '../../theme';

const KINDS = [
  ['announcement', 'Announcement', 'megaphone-outline', colors.primary],
  ['workout', 'Workout', 'barbell-outline', colors.navy],
  ['tip', 'Tip', 'bulb-outline', colors.green],
];
const KIND = Object.fromEntries(KINDS.map(([k, , i, c]) => [k, [i, c]]));

export default function CoachMessagesScreen() {
  const q = useApi('/coach/messages/');
  const [batch, setBatch] = useState(null); // null = all batches (admin only)
  const [kind, setKind] = useState('announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    // Trainers must pick one of their batches; preselect the first
    if (q.data && batch === null && !q.data.can_send_all && q.data.batches[0]) setBatch(q.data.batches[0].id);
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!title.trim() || !body.trim()) return setNote({ ok: false, text: 'Add a title and a message' });
    setBusy(true);
    setNote(null);
    try {
      const res = await api('/coach/messages/', { method: 'POST',
        body: { batch, kind, title: title.trim(), body: body.trim(), email_members: email } });
      q.setData({ ...q.data, messages: [res.message, ...q.data.messages] });
      setTitle('');
      setBody('');
      setNote({ ok: true, text: `Sent to ${res.message.batch}${res.info ? ` · Email: ${res.info}` : ''}` });
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m) => {
    if (!(await confirm('Delete message?', `"${m.title}" will be removed for every member in ${m.batch}.`, 'Delete'))) return;
    try {
      await api(`/coach/messages/${m.id}/`, { method: 'DELETE' });
      q.setData({ ...q.data, messages: q.data.messages.filter((x) => x.id !== m.id) });
    } catch (e) {
      setNote({ ok: false, text: e.message });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DataScreen q={q} header={<PageHeader title="Messages" subtitle="Members see these in their Batch tab" />}>
        {(d) => (
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            <FadeIn><Card style={{ gap: 12 }}>
              <T.H2 style={{ fontSize: 16 }}>New message</T.H2>

              <View>
                <T.Label style={st.label}>Send to</T.Label>
                <View style={st.chips}>
                  {d.can_send_all ? <Chip on={batch === null} text="All batches" onPress={() => setBatch(null)} /> : null}
                  {d.batches.map((b) => <Chip key={b.id} on={batch === b.id} text={b.name} onPress={() => setBatch(b.id)} />)}
                </View>
              </View>

              <View>
                <T.Label style={st.label}>Type</T.Label>
                <View style={st.chips}>
                  {KINDS.map(([k, l, i, c]) => <Chip key={k} on={kind === k} text={l} icon={i} color={c} onPress={() => setKind(k)} />)}
                </View>
              </View>

              <TextInput style={st.input} placeholder="Title, e.g. Bring a yoga mat tomorrow" placeholderTextColor={colors.muted}
                value={title} onChangeText={setTitle} maxLength={120} />
              <TextInput style={[st.input, { minHeight: 96, textAlignVertical: 'top' }]} placeholder="Write your message…"
                placeholderTextColor={colors.muted} value={body} onChangeText={setBody} multiline />

              <View style={st.switchRow}>
                <T.Body style={{ flex: 1, fontSize: 13 }}>Also email members</T.Body>
                <Switch value={email} onValueChange={setEmail} trackColor={{ true: colors.primary }} thumbColor="#fff" />
              </View>

              {note ? (
                <View style={[st.note, { backgroundColor: note.ok ? colors.greenSoft : colors.redSoft }]}>
                  <Ionicons name={note.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={note.ok ? colors.green : colors.red} />
                  <Text style={[st.noteText, { color: note.ok ? colors.green : colors.red }]}>{note.text}</Text>
                </View>
              ) : null}

              <Button title="Send message" icon="send" onPress={send} loading={busy} disabled={!d.batches.length && !d.can_send_all} />
            </Card></FadeIn>

            <T.H2 style={{ fontSize: 16, marginTop: 4 }}>Sent messages</T.H2>
            {d.messages.length ? d.messages.map((m, i) => {
              const [icon, color] = KIND[m.kind] || KIND.announcement;
              return (
                <FadeIn key={m.id} index={i}><Card>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                    <IconCircle name={icon} color={color} size={38} />
                    <View style={{ flex: 1 }}>
                      <T.H2 style={{ fontSize: 14 }}>{m.title}</T.H2>
                      <T.Muted style={{ fontSize: 12 }}>{m.batch} · {timeAgo(m.created_at)}</T.Muted>
                    </View>
                    {m.can_delete ? (
                      <Pressable onPress={() => remove(m)} hitSlop={10} accessibilityLabel="Delete message">
                        <Ionicons name="trash-outline" size={18} color={colors.muted} />
                      </Pressable>
                    ) : null}
                  </View>
                  <T.Body style={{ fontSize: 13 }}>{m.body}</T.Body>
                </Card></FadeIn>
              );
            }) : <Empty icon="chatbubbles-outline" title="Nothing sent yet" text="Your messages will be listed here." />}
          </View>
        )}
      </DataScreen>
    </KeyboardAvoidingView>
  );
}

const Chip = ({ on, text, icon, color = colors.primary, onPress }) => (
  <Pressable onPress={onPress} style={[st.chip, on && { backgroundColor: color, borderColor: color }]}>
    {icon ? <Ionicons name={icon} size={14} color={on ? '#fff' : color} /> : null}
    <Text style={[st.chipText, on && { color: '#fff' }]}>{text}</Text>
  </Pressable>
);

const st = StyleSheet.create({
  label: { marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.navy },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14,
    paddingVertical: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.text, outlineStyle: 'none' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10 },
  noteText: { fontFamily: fonts.medium, fontSize: 13, flex: 1 },
});
