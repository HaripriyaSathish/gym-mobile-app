import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api, cached } from '../../api';
import { confirm } from '../../confirm';
import { Button, FadeIn, T } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { MEALS } from './CoachDietScreen';

const PRESETS = [1400, 1600, 1800, 2000, 2400];

/** Create or edit one diet chart (batch-wide or personal). */
export default function CoachDietEditorScreen({ navigation, route }) {
  const chart = route.params?.chart;
  const opts = cached('/coach/diet/') || { batches: [], members: [], can_target_all: false };
  const presetMember = route.params?.member;

  const [target, setTarget] = useState(chart?.target || (presetMember ? 'member' : opts.batches.length ? 'batch' : 'all'));
  const [batch, setBatch] = useState(chart?.batch || opts.batches[0]?.id || null);
  const [member, setMember] = useState(chart?.member || presetMember || null);
  const [form, setForm] = useState(() => ({
    title: chart?.title || '', calories: String(chart?.calories || 1800), notes: chart?.notes || '',
    ...Object.fromEntries(MEALS.map(([k]) => [k, chart?.[k] || ''])),
  }));
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => { if (target === 'member' && !member && opts.members[0]) setMember(opts.members[0].id); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const body = { ...form, calories: Number(form.calories), notify,
        batch: target === 'batch' ? batch : null, member: target === 'member' ? member : null };
      await api(chart ? `/coach/diet/${chart.id}/` : '/coach/diet/', { method: chart ? 'PUT' : 'POST', body });
      navigation.goBack();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirm('Delete diet chart?', `"${chart.title}" will disappear from ${chart.target_label}.`, 'Delete'))) return;
    try {
      await api(`/coach/diet/${chart.id}/`, { method: 'DELETE' });
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    }
  };

  const who = target === 'member' ? opts.members.find((m) => m.id === member) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={st.top}>
          <Pressable onPress={() => navigation.goBack()} style={st.back} hitSlop={10} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={colors.navy} />
          </Pressable>
          <T.Display style={{ fontSize: 30, flex: 1 }}>{chart ? 'Edit diet chart' : 'New diet chart'}</T.Display>
          {chart ? (
            <Pressable onPress={remove} style={st.back} hitSlop={10} accessibilityLabel="Delete diet chart">
              <Ionicons name="trash-outline" size={20} color={colors.red} />
            </Pressable>
          ) : null}
        </View>

        <FadeIn style={st.card}>
          <T.Label style={st.label}>Who is it for?</T.Label>
          <View style={st.seg}>
            {[['batch', 'A batch', 'people'], ['member', 'One member', 'person'], ...(opts.can_target_all ? [['all', 'Everyone', 'globe-outline']] : [])]
              .map(([k, l, i]) => (
                <Pressable key={k} onPress={() => setTarget(k)} style={[st.segBtn, target === k && st.segOn]}>
                  <Ionicons name={i} size={15} color={target === k ? '#fff' : colors.muted} />
                  <Text style={[st.segText, target === k && { color: '#fff' }]}>{l}</Text>
                </Pressable>
              ))}
          </View>
          {target === 'batch' ? (
            <View style={st.chips}>
              {opts.batches.map((b) => <Chip key={b.id} on={batch === b.id} text={b.name} onPress={() => setBatch(b.id)} />)}
            </View>
          ) : target === 'member' ? (
            <>
              <View style={st.chips}>
                {opts.members.map((m) => <Chip key={m.id} on={member === m.id} text={m.name} onPress={() => setMember(m.id)} />)}
              </View>
              {who?.goal ? <T.Muted style={{ fontSize: 12, marginTop: 8 }}>🎯 Goal: {who.goal}</T.Muted> : null}
            </>
          ) : <T.Muted style={{ fontSize: 12, marginTop: 8 }}>Shown to members of every batch.</T.Muted>}
        </FadeIn>

        <FadeIn delay={60} style={st.card}>
          <T.Label style={st.label}>Plan</T.Label>
          <TextInput style={st.input} placeholder="Title, e.g. Fat loss plan · Week 1" placeholderTextColor={colors.muted}
            value={form.title} onChangeText={set('title')} maxLength={120} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <View style={[st.input, st.kcal]}>
              <Ionicons name="flame" size={16} color={colors.primary} />
              <TextInput style={st.kcalInput} value={form.calories} onChangeText={(v) => set('calories')(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad" maxLength={4} accessibilityLabel="Calories per day" />
              <Text style={st.kcalUnit}>kcal</Text>
            </View>
          </View>
          <View style={[st.chips, { marginTop: 8 }]}>
            {PRESETS.map((p) => <Chip key={p} on={Number(form.calories) === p} text={`${p}`} onPress={() => set('calories')(String(p))} />)}
          </View>
        </FadeIn>

        <FadeIn delay={120} style={st.card}>
          <T.Label style={st.label}>Meals</T.Label>
          <T.Muted style={{ fontSize: 12, marginBottom: 6 }}>Leave a meal empty to skip it.</T.Muted>
          {MEALS.map(([k, l, time, icon], i) => (
            <View key={k} style={st.mealRow}>
              <View style={{ alignItems: 'center', width: 36 }}>
                <View style={[st.mealDot, form[k] ? st.mealDotOn : null]}>
                  <Ionicons name={icon} size={16} color={form[k] ? '#fff' : colors.primary} />
                </View>
                {i < MEALS.length - 1 ? <View style={st.line} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={st.mealName}>{l}</Text>
                  <Text style={st.mealTime}>{time}</Text>
                </View>
                <TextInput style={[st.input, { marginTop: 6, minHeight: 44 }]} multiline placeholderTextColor={colors.muted}
                  placeholder={MEAL_HINT[k]} value={form[k]} onChangeText={set(k)} accessibilityLabel={l} />
              </View>
            </View>
          ))}
          <TextInput style={[st.input, { minHeight: 70, textAlignVertical: 'top' }]} multiline placeholderTextColor={colors.muted}
            placeholder="Coach notes (water, supplements, cheat meal rules…)" value={form.notes} onChangeText={set('notes')} />
        </FadeIn>

        <View style={st.switchRow}>
          <View style={{ flex: 1 }}>
            <T.H2 style={{ fontSize: 14 }}>Notify members</T.H2>
            <T.Muted style={{ fontSize: 12 }}>Send a push notification about this {chart ? 'update' : 'new chart'}</T.Muted>
          </View>
          <Switch value={notify} onValueChange={setNotify} trackColor={{ true: colors.primary }} thumbColor="#fff" />
        </View>

        {error ? (
          <View style={st.error}>
            <Ionicons name="alert-circle" size={16} color={colors.red} />
            <Text style={st.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button title={chart ? 'Save changes' : 'Create diet chart'} icon="checkmark" onPress={save} loading={busy} pulse style={{ marginTop: 14 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const MEAL_HINT = {
  early_morning: 'Warm water + 5 soaked almonds',
  breakfast: 'Oats with banana, 2 boiled eggs',
  mid_morning: 'Buttermilk or a fruit',
  lunch: '2 rotis, dal, sabzi, salad',
  evening: 'Green tea + roasted chana',
  dinner: 'Grilled paneer/chicken, veggies',
};

const Chip = ({ on, text, onPress }) => (
  <Pressable onPress={onPress} style={[st.chip, on && st.chipOn]}>
    <Text style={[st.chipText, on && { color: '#fff' }]}>{text}</Text>
  </Pressable>
);

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  label: { marginBottom: 8 },
  seg: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 12 },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.navy },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12,
    paddingVertical: 10, fontFamily: fonts.regular, fontSize: 14, color: colors.text, outlineStyle: 'none' },
  kcal: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 150 },
  kcalInput: { flex: 1, fontFamily: fonts.display, fontSize: 24, color: colors.navy, outlineStyle: 'none', padding: 0 },
  kcalUnit: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  mealRow: { flexDirection: 'row', gap: 10 },
  mealDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  mealDotOn: { backgroundColor: colors.primary },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4 },
  mealName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy },
  mealTime: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14,
    borderWidth: 1, borderColor: colors.border },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.redSoft, padding: 10, borderRadius: 10, marginTop: 12 },
  errorText: { fontFamily: fonts.medium, color: colors.red, fontSize: 13, flex: 1 },
});
