import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, DataScreen, Empty, FadeIn, PageHeader, Pill, T, rupee } from '../../components/ui';
import { useApi } from '../../useApi';
import { colors, fonts, radius } from '../../theme';

export default function CoachMembersScreen() {
  const q = useApi('/coach/members/');
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('all');

  const batches = useMemo(() => [...new Set((q.data || []).map((m) => m.batch))], [q.data]);
  const list = (q.data || []).filter((m) =>
    (batch === 'all' || m.batch === batch) &&
    (!search || `${m.name} ${m.username} ${m.phone}`.toLowerCase().includes(search.toLowerCase())));

  const header = (
    <View style={{ backgroundColor: colors.bg }}>
      <PageHeader title="Members" subtitle={q.data ? `${q.data.length} active in your batches` : 'Your batch members'} />
      <View style={st.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput style={st.input} placeholder="Search name, username or phone" placeholderTextColor={colors.muted}
          value={search} onChangeText={setSearch} autoCapitalize="none" />
      </View>
      {batches.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
          {['all', ...batches].map((b) => (
            <Pressable key={b} onPress={() => setBatch(b)} style={[st.chip, batch === b && st.chipOn]}>
              <Text style={[st.chipText, batch === b && { color: '#fff' }]}>{b === 'all' ? 'All' : b}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <DataScreen q={q} header={header} contentStyle={{ paddingTop: 12 }}>
      {() => list.length ? (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {list.map((m, i) => {
            const rate = m.attendance_rate;
            const rateColor = rate == null ? colors.muted : rate >= 75 ? colors.green : rate >= 50 ? colors.amber : colors.red;
            const due = Number(m.dues) > 0;
            return (
              <FadeIn key={m.id} index={i}><Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={st.avatar}><Text style={st.initial}>{m.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <T.H2 style={{ fontSize: 15 }}>{m.name}</T.H2>
                    <T.Muted style={{ fontSize: 12 }}>@{m.username} · {m.batch}</T.Muted>
                  </View>
                  {m.phone ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${m.phone}`)} style={st.call} hitSlop={6} accessibilityLabel={`Call ${m.name}`}>
                      <Ionicons name="call" size={16} color={colors.primary} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={st.pills}>
                  <Pill text={rate == null ? 'No attendance yet' : `${rate}% attendance (30d)`} color={rateColor} icon="calendar" />
                  <Pill text={due ? `${rupee(m.dues)} due` : 'Fees clear'} color={due ? colors.red : colors.green} icon="wallet" />
                </View>
                {m.goal ? <T.Muted style={{ fontSize: 12, marginTop: 8 }}>🎯 {m.goal}</T.Muted> : null}
              </Card></FadeIn>
            );
          })}
        </View>
      ) : <Empty icon="people-outline" title={search ? 'No match' : 'No members yet'} text={search ? 'Try another name.' : 'Members in your batches show up here.'} />}
    </DataScreen>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 6, backgroundColor: '#fff',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.text, outlineStyle: 'none' },
  chips: { paddingHorizontal: 20, gap: 8, paddingTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.navy },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  call: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
});
