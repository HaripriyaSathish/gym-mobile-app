import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import BannerCarousel from '../components/BannerCarousel';
import MissedWorkoutAlert from '../components/MissedWorkoutAlert';
import { warmMember } from '../prefetch';
import { Brand, Card, DataScreen, FadeIn, Glow, IconCircle, Img, Pill, PulseGlow, Section, Sheen, T, rupee, fmtShort, timeAgo } from '../components/ui';
import { useApi } from '../useApi';
import { colors, fonts, gradients, radius, shadow } from '../theme';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const REM_ICON = { payment: 'card-outline', class: 'barbell-outline', diet: 'nutrition-outline', general: 'notifications-outline' };

export default function HomeScreen({ navigation }) {
  const q = useApi('/home/');
  useEffect(() => { if (q.data) warmMember(q.data); }, [q.data]);
  const [checking, setChecking] = useState(false);

  const checkIn = async () => {
    setChecking(true);
    try {
      const r = await api('/attendance/checkin/', { method: 'POST' });
      q.setData((d) => ({ ...d, attendance: r.summary, missed_today: null,
        reminders: d.reminders.filter((x) => !(x.kind === 'class' && x.title === d.missed_today?.title)) }));
    } finally {
      setChecking(false);
    }
  };

  const header = (
    <View style={st.top}>
      <Brand size={24} />
      <Pressable onPress={() => navigation.navigate('Reminders')} style={st.bell} hitSlop={8}>
        <Ionicons name="notifications-outline" size={22} color={colors.navy} />
        {q.data?.reminders?.length ? <View style={st.dot} /> : null}
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
    <DataScreen q={q} header={header}>
      {(d) => {
        const m = d.member;
        const a = d.attendance;
        const b = m.batch;
        return (
          <>
            <FadeIn style={{ paddingHorizontal: 20, paddingTop: 6 }}>
              <T.Muted>{greeting()},</T.Muted>
              <T.Display style={{ fontSize: 40, lineHeight: 44 }}>{m.first_name} 👋</T.Display>
            </FadeIn>

            {/* Banner carousel */}
            <FadeIn delay={60}>
              <BannerCarousel banners={d.banners} onOpen={(b) => {
                if (b.target === 'program' && b.program) navigation.navigate('Program', { program: b.program });
                else if (b.target === 'pay') navigation.navigate('Pay');
                else if (b.target === 'batch') navigation.navigate('Batch');
                else if (b.target === 'gallery') navigation.navigate('Gallery', { kind: 'transformation' });
              }} />
            </FadeIn>

            {/* Today's class hero */}
            <FadeIn delay={120} style={{ paddingHorizontal: 20, marginTop: 14 }}>
              <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
                <Sheen width={360} />
                <View style={st.ring} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={st.heroLabel}>YOUR BATCH</Text>
                  <View style={st.heroPill}><Text style={st.heroPillText}>{b?.program}</Text></View>
                </View>
                <Text style={st.heroTitle}>{b ? b.name : 'No batch yet'}</Text>
                {b ? (
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                    <Meta icon="time-outline" text={`${b.start} – ${b.end}`} />
                    <Meta icon="calendar-outline" text={b.days} />
                    <Meta icon="person-outline" text={b.trainer} />
                  </View>
                ) : null}
                <PulseGlow radius={16} color="#FFFFFF" style={{ marginTop: 16 }}>
                <Glow onPress={a.checked_in_today ? undefined : checkIn} radius={16} color="#FFFFFF" style={st.checkBtn}>
                  <Ionicons name={a.checked_in_today ? 'checkmark-circle' : 'finger-print'} size={20} color={colors.primary} />
                  <Text style={st.checkText}>
                    {checking ? 'Checking in…' : a.checked_in_today ? "You're checked in today" : 'Check in for today'}
                  </Text>
                </Glow>
                </PulseGlow>
              </LinearGradient>
            </FadeIn>

            {/* Stats */}
            <View style={st.stats}>
              <Stat value={`${a.streak}🔥`} label="Day streak" onPress={() => navigation.navigate('Attendance')} />
              <Stat value={a.present} label="Present (month)" onPress={() => navigation.navigate('Attendance')} />
              <Stat value={`${a.rate}%`} label="Attendance" onPress={() => navigation.navigate('Attendance')} />
            </View>
            {a.consecutive_absent >= 2 ? (
              <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
                <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.amberSoft, borderColor: '#FFE3A3' }}>
                  <IconCircle name="alert-circle-outline" color="#B57800" />
                  <T.Body style={{ flex: 1 }}>You've missed {a.consecutive_absent} sessions in a row. Your batch misses you!</T.Body>
                </Card>
              </View>
            ) : null}

            {/* Payment due */}
            {d.next_payment ? (
              <Section title="Next payment" action="All payments" onAction={() => navigation.navigate('Pay')}>
                <View style={{ paddingHorizontal: 20 }}>
                  <Card onPress={() => navigation.navigate('Pay')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <IconCircle name="wallet-outline" color={d.next_payment.is_overdue ? colors.red : colors.primary} />
                    <View style={{ flex: 1 }}>
                      <T.H2 style={{ fontSize: 15 }}>{d.next_payment.title}</T.H2>
                      <T.Muted>Due {fmtShort(d.next_payment.due_date)}</T.Muted>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={st.amount}>{rupee(d.next_payment.amount)}</Text>
                      <Pill text={d.next_payment.is_overdue ? 'Overdue' : 'Pay now'} color={d.next_payment.is_overdue ? colors.red : colors.primary} />
                    </View>
                  </Card>
                </View>
              </Section>
            ) : null}

            {/* Reminders */}
            {d.reminders.length ? (
              <Section title="Reminders" action="See all" onAction={() => navigation.navigate('Reminders')}>
                <View style={{ paddingHorizontal: 20, gap: 10 }}>
                  {d.reminders.map((r) => (
                    <Card key={r.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12 }}>
                      <IconCircle name={REM_ICON[r.kind]} size={38} color={colors.navy} />
                      <View style={{ flex: 1 }}>
                        <T.Body style={{ fontFamily: fonts.semibold }}>{r.title}</T.Body>
                        <T.Muted style={{ fontSize: 12 }}>{timeAgo(r.remind_at)}</T.Muted>
                      </View>
                    </Card>
                  ))}
                </View>
              </Section>
            ) : null}

            {/* Latest batch message */}
            {d.latest_message ? (
              <Section title="From your coach" action="Batch chat" onAction={() => navigation.navigate('Batch')}>
                <View style={{ paddingHorizontal: 20 }}>
                  <Card onPress={() => navigation.navigate('Batch')}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Pill text={d.latest_message.kind} color={colors.navy} />
                      <T.Muted style={{ fontSize: 12 }}>{timeAgo(d.latest_message.created_at)}</T.Muted>
                    </View>
                    <T.H2>{d.latest_message.title}</T.H2>
                    <T.Muted numberOfLines={2}>{d.latest_message.body}</T.Muted>
                  </Card>
                </View>
              </Section>
            ) : null}

            {/* Diet */}
            {d.diet ? (
              <Section title="Today's diet" action="Full chart" onAction={() => navigation.navigate('Batch', { tab: 'diet' })}>
                <FlatList horizontal data={d.diet.meals} keyExtractor={(i) => i.name}
                  showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                  renderItem={({ item }) => (
                    <View style={st.meal}>
                      <T.Label>{item.time}</T.Label>
                      <T.H2 style={{ fontSize: 15, marginVertical: 2 }}>{item.name}</T.H2>
                      <T.Muted numberOfLines={3} style={{ fontSize: 12 }}>{item.items}</T.Muted>
                    </View>
                  )} />
              </Section>
            ) : null}

            {/* Programs */}
            <Section title="Programs" action="Explore" onAction={() => navigation.navigate('Gallery')}>
              <FlatList horizontal data={d.programs} keyExtractor={(i) => String(i.id)}
                showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                renderItem={({ item }) => (
                  <Glow radius={radius.lg} onPress={() => navigation.navigate('Program', { program: item })}>
                    <Img uri={item.image} style={{ width: 150, height: 190 }} radius={radius.lg}>
                      <LinearGradient colors={gradients.fade} style={st.progFade}>
                        <Text style={st.progName}>{item.name}</Text>
                        <Text style={st.progTag} numberOfLines={1}>{item.tagline}</Text>
                      </LinearGradient>
                    </Img>
                  </Glow>
                )} />
            </Section>

            {/* Featured */}
            <Section title="Featured" action="Gallery" onAction={() => navigation.navigate('Gallery')}>
              <FlatList horizontal data={d.featured} keyExtractor={(i) => String(i.id)}
                showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                renderItem={({ item }) => (
                  <Glow radius={radius.lg} onPress={() => item.kind === 'video' ? navigation.navigate('Video', { item }) : navigation.navigate('Gallery', { kind: item.kind })}>
                    <Img uri={item.image} style={{ width: 230, height: 140 }} radius={radius.lg}>
                      {item.kind === 'video' ? (
                        <View style={st.play}><Ionicons name="play" size={22} color={colors.primary} /></View>
                      ) : null}
                      <LinearGradient colors={gradients.fade} style={st.progFade}>
                        <Text style={[st.progTag, { fontFamily: fonts.semibold, color: '#fff' }]} numberOfLines={1}>{item.title}</Text>
                      </LinearGradient>
                    </Img>
                  </Glow>
                )} />
            </Section>
          </>
        );
      }}
    </DataScreen>
    <MissedWorkoutAlert missed={q.data?.missed_today} onCheckIn={checkIn} />
    </View>
  );
}

function Meta({ icon, text }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={14} color="#FFE3D8" />
      <Text style={{ fontFamily: fonts.medium, color: '#fff', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function Stat({ value, label, onPress }) {
  return (
    <Glow onPress={onPress} radius={16} style={st.stat}>
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </Glow>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: colors.bg },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  dot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  hero: { borderRadius: radius.xl, padding: 20, overflow: 'hidden', boxShadow: '0px 18px 40px rgba(255,90,54,0.35)' },
  ring: { position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: 100, borderWidth: 26, borderColor: 'rgba(255,255,255,0.10)' },
  heroLabel: { fontFamily: fonts.semibold, color: '#FFE3D8', fontSize: 11, letterSpacing: 1.5 },
  heroPill: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  heroPillText: { fontFamily: fonts.semibold, color: '#fff', fontSize: 11 },
  heroTitle: { fontFamily: fonts.display, color: '#fff', fontSize: 34, letterSpacing: 1, marginTop: 6 },
  checkBtn: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  checkText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 14 },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 14 },
  stat: { flex: 1, overflow: 'hidden', backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontFamily: fonts.display, fontSize: 30, color: colors.navy, letterSpacing: 0.5 },
  statLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  amount: { fontFamily: fonts.display, fontSize: 26, color: colors.navy, letterSpacing: 0.5 },
  meal: { width: 170, backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  progFade: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, paddingTop: 30 },
  progName: { fontFamily: fonts.display, color: '#fff', fontSize: 26, letterSpacing: 1 },
  progTag: { fontFamily: fonts.regular, color: '#FFE3D8', fontSize: 11 },
  play: { position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -34, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
});
