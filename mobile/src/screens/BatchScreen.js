import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, DataScreen, Empty, IconCircle, PageHeader, Pill, T, fmtDate, timeAgo } from '../components/ui';
import { useApi } from '../useApi';
import { colors, fonts, radius } from '../theme';

const KIND = {
  announcement: ['megaphone-outline', colors.primary],
  workout: ['barbell-outline', colors.navy],
  tip: ['bulb-outline', colors.green],
};
const MEAL_ICON = {
  'Early morning': 'sunny-outline', Breakfast: 'cafe-outline', 'Mid-morning': 'nutrition-outline',
  Lunch: 'restaurant-outline', Evening: 'leaf-outline', Dinner: 'moon-outline',
};

export default function BatchScreen({ route }) {
  const [tab, setTab] = useState(route.params?.tab || 'messages');
  useEffect(() => { if (route.params?.tab) setTab(route.params.tab); }, [route.params?.tab]);
  const me = useApi('/me/');
  const msgs = useApi('/messages/');
  const diet = useApi('/diet/');
  const q = tab === 'messages' ? msgs : diet;
  const batch = me.data?.batch;

  const header = (
    <View style={{ backgroundColor: colors.bg }}>
      <PageHeader title="My batch" subtitle={batch ? `${batch.name} · ${batch.start} · ${batch.trainer}` : 'Messages & diet from your coach'} />
      <View style={st.tabs}>
        {[['messages', 'Messages', 'chatbubbles-outline'], ['diet', 'Diet chart', 'nutrition-outline']].map(([k, l, i]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && st.tabActive]}>
            <Ionicons name={i} size={16} color={tab === k ? '#fff' : colors.muted} />
            <Text style={[st.tabText, tab === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <DataScreen q={q} header={header} contentStyle={{ paddingTop: 14 }}>
      {(data) =>
        tab === 'messages' ? (
          data.length ? (
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              {data.map((m) => {
                const [icon, color] = KIND[m.kind] || KIND.announcement;
                return (
                  <Card key={m.id}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                      <IconCircle name={icon} color={color} size={40} />
                      <View style={{ flex: 1 }}>
                        <T.H2 style={{ fontSize: 15 }}>{m.title}</T.H2>
                        <T.Muted style={{ fontSize: 12 }}>{m.batch} · {timeAgo(m.created_at)}</T.Muted>
                      </View>
                    </View>
                    <T.Body>{m.body}</T.Body>
                  </Card>
                );
              })}
            </View>
          ) : <Empty icon="chatbubbles-outline" title="No messages yet" text="Your coach's updates will appear here." />
        ) : data.length ? (
          <View style={{ paddingHorizontal: 20, gap: 18 }}>
            {data.map((d) => (
              <View key={d.id}>
                <View style={st.dietHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.dietTitle}>{d.title}</Text>
                    <T.Muted style={{ fontSize: 12 }}>Updated {fmtDate(d.created_at)}</T.Muted>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Pill text={`${d.calories} kcal`} icon="flame" />
                    {d.personal ? <Pill text="Personal" color={colors.green} icon="person" /> : null}
                  </View>
                </View>
                <View style={st.timeline}>
                  {d.meals.map((m, i) => (
                    <View key={m.name} style={st.mealRow}>
                      <View style={{ alignItems: 'center', width: 44 }}>
                        <IconCircle name={MEAL_ICON[m.name] || 'restaurant-outline'} size={36} />
                        {i < d.meals.length - 1 ? <View style={st.line} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <T.H2 style={{ fontSize: 14 }}>{m.name}</T.H2>
                          <T.Label>{m.time}</T.Label>
                        </View>
                        <T.Muted>{m.items}</T.Muted>
                      </View>
                    </View>
                  ))}
                  {d.notes ? (
                    <View style={st.note}>
                      <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                      <T.Body style={{ flex: 1, fontSize: 13 }}>{d.notes}</T.Body>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : <Empty icon="nutrition-outline" title="No diet chart yet" text="Ask your coach for a personalised plan." />
      }
    </DataScreen>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, backgroundColor: '#fff', borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  dietHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  dietTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.navy, letterSpacing: 0.8 },
  timeline: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, paddingBottom: 4, borderWidth: 1, borderColor: colors.border },
  mealRow: { flexDirection: 'row', gap: 10 },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4 },
  note: { flexDirection: 'row', gap: 8, backgroundColor: colors.soft, borderRadius: 12, padding: 12, marginBottom: 12 },
});
