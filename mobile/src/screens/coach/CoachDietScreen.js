import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, DataScreen, Empty, FadeIn, Glow, IconCircle, Pill, T, fmtDate } from '../../components/ui';
import { useApi } from '../../useApi';
import { colors, fonts, radius } from '../../theme';

export const MEALS = [
  ['early_morning', 'Early morning', '06:00', 'sunny-outline'],
  ['breakfast', 'Breakfast', '08:30', 'cafe-outline'],
  ['mid_morning', 'Mid-morning', '11:00', 'nutrition-outline'],
  ['lunch', 'Lunch', '13:30', 'restaurant-outline'],
  ['evening', 'Evening', '17:00', 'leaf-outline'],
  ['dinner', 'Dinner', '20:00', 'moon-outline'],
];

const TARGET = {
  member: ['person', colors.green],
  batch: ['people', colors.primary],
  all: ['globe-outline', colors.navy],
};

/** Trainer: every diet chart for their batches and their members' personal plans. */
export default function CoachDietScreen({ navigation, route }) {
  const q = useApi('/coach/diet/');
  const [filter, setFilter] = useState(route.params?.member ? 'member' : 'all');

  // Refresh when coming back from the editor
  const { reload } = q;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const charts = (q.data?.charts || []).filter((c) => filter === 'all' || c.target === filter);
  const open = (chart) => navigation.navigate('DietEditor', { chart, member: route.params?.member });

  const header = (
    <View style={{ backgroundColor: colors.bg }}>
      <View style={st.top}>
        <Pressable onPress={() => navigation.goBack()} style={st.back} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <T.Display style={{ fontSize: 32 }}>Diet charts</T.Display>
          <T.Muted style={{ fontSize: 12 }}>Members see these in their Batch → Diet chart tab</T.Muted>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {[['all', 'All'], ['batch', 'Batch plans'], ['member', 'Personal plans']].map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[st.chip, filter === k && st.chipOn]}>
            <Text style={[st.chipText, filter === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <DataScreen q={q} header={header} contentStyle={{ paddingTop: 12, paddingBottom: 110 }}>
        {() => charts.length ? (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {charts.map((c, i) => {
              const [icon, color] = TARGET[c.target];
              const meals = MEALS.filter(([k]) => c[k]);
              return (
                <FadeIn key={c.id} index={i}>
                  <Card onPress={() => open(c)} glow={color}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <IconCircle name="nutrition" color={color} />
                      <View style={{ flex: 1 }}>
                        <T.H2 style={{ fontSize: 15 }}>{c.title}</T.H2>
                        <T.Muted style={{ fontSize: 12 }}>Updated {fmtDate(c.created_at)}</T.Muted>
                      </View>
                      <Ionicons name="create-outline" size={20} color={colors.muted} />
                    </View>
                    <View style={st.pills}>
                      <Pill text={c.target_label} color={color} icon={icon} />
                      <Pill text={`${c.calories} kcal`} icon="flame" />
                      <Pill text={`${meals.length} meals`} color={colors.navy} icon="restaurant" />
                    </View>
                    <View style={st.mealIcons}>
                      {meals.map(([k, l, , ic]) => (
                        <View key={k} style={st.mealIcon} accessibilityLabel={l}>
                          <Ionicons name={ic} size={14} color={colors.primary} />
                        </View>
                      ))}
                    </View>
                  </Card>
                </FadeIn>
              );
            })}
          </View>
        ) : (
          <Empty icon="nutrition-outline" title="No diet charts yet"
            text="Create a plan for a whole batch, or a personal one for a member." />
        )}
      </DataScreen>

      <FadeIn delay={200} style={st.fabWrap}>
        <Glow onPress={() => open(null)} radius={30} style={st.fab}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={st.fabText}>New diet chart</Text>
        </Glow>
      </FadeIn>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border },
  chips: { paddingHorizontal: 20, gap: 8, paddingTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.navy },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  mealIcons: { flexDirection: 'row', gap: 6, marginTop: 10 },
  mealIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', right: 20, bottom: 24 },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingHorizontal: 20, paddingVertical: 14, boxShadow: '0px 10px 24px rgba(255,90,54,0.35)' },
  fabText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
});
