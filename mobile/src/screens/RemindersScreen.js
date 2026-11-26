import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Card, DataScreen, Empty, IconCircle, PageHeader, Pill, T, timeAgo } from '../components/ui';
import { useApi } from '../useApi';
import { colors, fonts } from '../theme';

const KIND = {
  payment: ['card-outline', colors.primary],
  class: ['barbell-outline', colors.navy],
  diet: ['nutrition-outline', colors.green],
  general: ['notifications-outline', colors.amber],
};

export default function RemindersScreen({ navigation }) {
  const q = useApi('/reminders/');
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12, backgroundColor: colors.bg }}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 8 }}>
        <Ionicons name="chevron-back" size={24} color={colors.navy} />
      </Pressable>
      <View style={{ flex: 1, marginLeft: -12 }}>
        <PageHeader title="Reminders" subtitle="Fees, classes & healthy habits" />
      </View>
    </View>
  );
  return (
    <DataScreen q={q} header={header}>
      {(items) =>
        items.length ? (
          <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 8 }}>
            {items.map((r) => {
              const [icon, color] = KIND[r.kind] || KIND.general;
              const upcoming = new Date(r.remind_at) > new Date();
              return (
                <Card key={r.id} style={{ flexDirection: 'row', gap: 12, opacity: upcoming ? 1 : 0.75 }}>
                  <IconCircle name={icon} color={color} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T.H2 style={{ fontSize: 15 }}>{r.title}</T.H2>
                    {r.message ? <T.Muted>{r.message}</T.Muted> : null}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <Pill text={r.kind} color={color} />
                      <Pill text={timeAgo(r.remind_at)} color={colors.muted} icon="time-outline" />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : <Empty icon="notifications-off-outline" title="No reminders" text="You're all caught up." />
      }
    </DataScreen>
  );
}
