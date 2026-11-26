import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth';
import { confirm } from '../../confirm';
import { Brand, Card, DataScreen, Empty, FadeIn, Glow, IconCircle, Pill, Section, Sheen, T, fmtShort, rupee, timeAgo } from '../../components/ui';
import { useApi } from '../../useApi';
import { colors, fonts, gradients, radius } from '../../theme';

const native = Platform.OS !== 'web';

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function CoachHomeScreen({ navigation }) {
  const q = useApi('/coach/dashboard/');
  const { signOut } = useAuth();
  const logout = async () => {
    if (await confirm('Sign out?', 'You will need your username and password to sign in again.', 'Sign out')) signOut();
  };

  return (
    <DataScreen q={q}>
      {(d) => (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={st.top}>
            <Brand size={22} />
            <Pressable onPress={logout} style={st.iconBtn} hitSlop={8} accessibilityLabel="Sign out">
              <Ionicons name="log-out-outline" size={20} color={colors.navy} />
            </Pressable>
          </View>
          <T.Muted>{greet()},</T.Muted>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <T.Display style={{ fontSize: 36 }}>Coach {d.first_name}</T.Display>
            <Pill text={d.is_staff ? 'Admin' : 'Trainer'} color={colors.navy} icon="shield-checkmark" />
          </View>

          <FadeIn delay={80}>
          <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
            <Sheen width={360} />
            <Text style={st.heroLabel}>TODAY</Text>
            <View style={st.heroRow}>
              <HeroStat value={d.stats.present_today} label="Present" color="#7BE3B8" />
              <HeroStat value={d.stats.absent_today} label="Absent" color="#FF9A9D" />
              <HeroStat value={d.stats.members} label="Members" color="#fff" />
            </View>
            <Pressable onPress={() => navigation.navigate('Attendance')} style={st.heroBtn}>
              <Ionicons name="checkmark-done" size={18} color={colors.primary} />
              <Text style={st.heroBtnText}>Mark attendance</Text>
            </Pressable>
          </LinearGradient>
          </FadeIn>

          <FadeIn delay={120} style={st.quick}>
            <Quick icon="checkmark-done" label="Attendance" color={colors.primary} onPress={() => navigation.navigate('Attendance')} />
            <Quick icon="megaphone" label="Message" color={colors.navy} onPress={() => navigation.navigate('Messages')} />
            <Quick icon="cash" label="Collect fee" color={colors.green} onPress={() => navigation.navigate('Fees')} />
            <Quick icon="people" label="Members" color={colors.amber} onPress={() => navigation.navigate('Members')} />
          </FadeIn>

          <Section title="Today's schedule">
            {d.schedule.length ? (
              <View style={{ gap: 10 }}>
                {d.schedule.map((s, i) => <ScheduleRow key={s.id} s={s} i={i} onPress={() => navigation.navigate('Attendance', { batch: s.id })} />)}
              </View>
            ) : <Empty icon="cafe-outline" title="No sessions today" text="Rest day for your batches. Recharge! ☕" />}
          </Section>

          <View style={st.grid}>
            <Stat i={0} icon="wallet-outline" color={colors.green} value={rupee(d.stats.collected)} label="Collected this month" />
            <Stat i={1} icon="hourglass-outline" color={colors.amber} value={rupee(d.stats.pending)} label="Pending fees" />
            <Stat i={2} icon="alert-circle-outline" color={colors.red} value={d.stats.overdue} label="Overdue" onPress={() => navigation.navigate('Fees')} />
            <Stat i={3} icon="people-outline" color={colors.primary} value={d.stats.batches} label={d.stats.batches === 1 ? 'Batch' : 'Batches'} onPress={() => navigation.navigate('Members')} />
          </View>

          <Section title="This week">
            <WeekChart week={d.week} />
          </Section>

          {d.attention.length ? (
            <Section title="Needs attention">
              <Card style={{ paddingVertical: 4, backgroundColor: '#FFFBF5' }}>
                {d.attention.map((m, i) => (
                  <View key={m.id} style={[st.row, i === d.attention.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={{ fontSize: 22 }}>{m.absent_run >= 5 ? '🚨' : '⚠️'}</Text>
                    <View style={{ flex: 1 }}>
                      <T.H2 style={{ fontSize: 14 }}>{m.name}</T.H2>
                      <T.Muted style={{ fontSize: 12 }}>Missed {m.absent_run} sessions in a row · {m.batch}</T.Muted>
                    </View>
                    {m.phone ? (
                      <Pressable onPress={() => Linking.openURL(`tel:${m.phone}`)} style={st.call} hitSlop={6} accessibilityLabel={`Call ${m.name}`}>
                        <Ionicons name="call" size={16} color={colors.primary} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </Card>
            </Section>
          ) : null}

          <Section title={`Checked in today (${d.checked_in.length})`}>
            {d.checked_in.length ? (
              <View style={st.chips}>
                {d.checked_in.map((c, i) => (
                  <FadeIn key={c.id} index={i}>
                    <View style={st.chip}>
                      <View style={st.chipDot}><Text style={st.chipInitial}>{c.name[0]}</Text></View>
                      <Text style={st.chipText}>{c.name.split(' ')[0]}</Text>
                      {c.self ? <Ionicons name="finger-print" size={12} color={colors.green} /> : null}
                    </View>
                  </FadeIn>
                ))}
              </View>
            ) : <T.Muted style={{ fontSize: 13 }}>No check-ins yet today.</T.Muted>}
          </Section>

          {d.top.length ? (
            <Section title="Top attendees this month">
              <Card style={{ paddingVertical: 4 }}>
                {d.top.map((m, i) => (
                  <FadeIn key={m.id} index={i}>
                    <View style={[st.row, i === d.top.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={st.medal}>{['🥇', '🥈', '🥉'][i] || `${i + 1}`}</Text>
                      <View style={{ flex: 1 }}>
                        <T.H2 style={{ fontSize: 14 }}>{m.name}</T.H2>
                        <T.Muted style={{ fontSize: 12 }}>{m.batch}</T.Muted>
                      </View>
                      <Pill text={`${m.present} sessions`} color={colors.green} icon="flame" />
                    </View>
                  </FadeIn>
                ))}
              </Card>
            </Section>
          ) : null}

          <Section title="Your batches">
            {d.batches.length ? (
              <View style={{ gap: 10 }}>
                {d.batches.map((b, i) => (
                  <FadeIn key={b.id} index={i}>
                  <Card onPress={() => navigation.navigate('Attendance', { batch: b.id })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <IconCircle name="barbell-outline" />
                      <View style={{ flex: 1 }}>
                        <T.H2 style={{ fontSize: 15 }}>{b.name}</T.H2>
                        <T.Muted style={{ fontSize: 12 }}>{b.program} · {b.start} · {b.days}</T.Muted>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={st.ratio}>{b.present_today}/{b.members}</Text>
                        <T.Muted style={{ fontSize: 11 }}>present</T.Muted>
                      </View>
                    </View>
                  </Card>
                  </FadeIn>
                ))}
              </View>
            ) : (
              <Empty icon="people-outline" title="No batches yet" text="Ask the admin to assign you as coach of a batch." />
            )}
          </Section>

          {d.overdue.length ? (
            <Section title="Overdue fees" action="See all" onAction={() => navigation.navigate('Fees')}>
              <Card style={{ paddingVertical: 4 }}>
                {d.overdue.map((p, i) => (
                  <View key={p.id} style={[st.row, i === d.overdue.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <T.H2 style={{ fontSize: 14 }}>{p.member}</T.H2>
                      <T.Muted style={{ fontSize: 12 }}>{p.title} · due {fmtShort(p.due_date)}</T.Muted>
                    </View>
                    <Text style={[st.amount, { color: colors.red }]}>{rupee(p.amount)}</Text>
                  </View>
                ))}
              </Card>
            </Section>
          ) : null}

          <Section title="Recent messages" action="Send new" onAction={() => navigation.navigate('Messages')}>
            {d.recent_messages.length ? (
              <View style={{ gap: 10 }}>
                {d.recent_messages.map((m) => (
                  <Card key={m.id}>
                    <T.H2 style={{ fontSize: 14 }}>{m.title}</T.H2>
                    <T.Muted style={{ fontSize: 12 }}>{m.batch} · {timeAgo(m.created_at)}</T.Muted>
                    <T.Body numberOfLines={2} style={{ marginTop: 4, fontSize: 13 }}>{m.body}</T.Body>
                  </Card>
                ))}
              </View>
            ) : <Empty icon="chatbubbles-outline" title="No messages yet" text="Send your batch its first update." />}
          </Section>
        </View>
      )}
    </DataScreen>
  );
}

function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const span = (ms) => {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim();
};

/** Pulsing dot for a session that is happening right now. */
function LiveDot() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: native }));
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <View style={{ width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[st.liveRing, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }]} />
      <View style={st.liveDot} />
    </View>
  );
}

function ScheduleRow({ s, i, onPress }) {
  const now = useNow();
  const start = new Date(s.start_at).getTime();
  const end = new Date(s.end_at).getTime();
  const status = now < start ? 'upcoming' : now < end ? 'live' : 'done';
  const label = status === 'upcoming' ? `Starts in ${span(start - now)}` : status === 'live' ? `Live · ${span(end - now)} left` : 'Finished';
  const color = status === 'live' ? colors.green : status === 'upcoming' ? colors.primary : colors.muted;
  const progress = status === 'live' ? (now - start) / (end - start) : status === 'done' ? 1 : 0;
  return (
    <FadeIn index={i}>
      <Card onPress={onPress} glow={color} style={[status === 'live' && { borderColor: colors.green }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={st.timeBox}>
            <Text style={st.timeTop}>{s.start.replace(/ (AM|PM)/, '')}</Text>
            <Text style={st.timeSub}>{s.start.slice(-2)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <T.H2 style={{ fontSize: 15 }}>{s.name}</T.H2>
            <T.Muted style={{ fontSize: 12 }}>{s.program} · {s.start} – {s.end}</T.Muted>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {status === 'live' ? <LiveDot /> : <Ionicons name={status === 'done' ? 'checkmark-circle' : 'time-outline'} size={13} color={color} />}
              <Text style={[st.statusText, { color }]}>{label}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
        <View style={st.track}><View style={[st.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} /></View>
      </Card>
    </FadeIn>
  );
}

/** Bars grow in from zero: present (coral) stacked on absent (light). */
function WeekChart({ week }) {
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(grow, { toValue: 1, duration: 900, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [grow]);
  const max = Math.max(1, ...week.map((w) => w.present + w.absent));
  const present = week.reduce((s, w) => s + w.present, 0);
  const total = week.reduce((s, w) => s + w.present + w.absent, 0);
  const H = 110;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={st.weekBig}>{total ? Math.round((present * 100) / total) : 0}%</Text>
          <T.Muted style={{ fontSize: 12 }}>attendance, last 7 days</T.Muted>
        </View>
        <View style={{ gap: 4 }}>
          <Legend color={colors.primary} text={`${present} present`} />
          <Legend color="#FFD3C4" text={`${total - present} absent`} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H, gap: 8 }}>
        {week.map((w) => {
          const ph = ((w.present / max) * H) || 0;
          const ah = ((w.absent / max) * H) || 0;
          return (
            <View key={w.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: H }}>
              <Animated.View style={{ width: '70%', borderRadius: 6, overflow: 'hidden', height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(ph + ah, 3)] }) }}>
                <View style={{ flex: ah || 0.0001, backgroundColor: '#FFD3C4' }} />
                <View style={{ flex: ph || 0.0001, backgroundColor: w.today ? colors.navy : colors.primary }} />
              </Animated.View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {week.map((w) => (
          <Text key={w.date} style={[st.dayLabel, w.today && { color: colors.navy, fontFamily: fonts.bold }]}>{w.label}</Text>
        ))}
      </View>
    </Card>
  );
}

const Legend = ({ color, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
    <T.Muted style={{ fontSize: 11 }}>{text}</T.Muted>
  </View>
);

const Quick = ({ icon, label, color, onPress }) => (
  <Glow onPress={onPress} radius={radius.md} color={color} style={st.quickBtn}>
    <View style={[st.quickIcon, { backgroundColor: color + '1A' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={st.quickText}>{label}</Text>
  </Glow>
);

const HeroStat = ({ value, label, color }) => (
  <View style={{ flex: 1 }}>
    <Text style={[st.heroVal, { color }]}>{value}</Text>
    <Text style={st.heroSub}>{label}</Text>
  </View>
);

const Stat = ({ i, icon, color, value, label, onPress }) => (
  <FadeIn index={i} delay={160} style={st.stat}>
    <Card style={{ gap: 4, padding: 14 }} onPress={onPress} glow={color}>
      <IconCircle name={icon} color={color} size={36} />
      <Text style={st.statVal} numberOfLines={1}>{value}</Text>
      <T.Muted style={{ fontSize: 11 }}>{label}</T.Muted>
    </Card>
  </FadeIn>
);

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 14 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: radius.lg, padding: 18, marginTop: 14 },
  heroLabel: { fontFamily: fonts.semibold, fontSize: 11, color: '#A9B1D6', letterSpacing: 1.5 },
  heroRow: { flexDirection: 'row', marginTop: 8 },
  heroVal: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42 },
  heroSub: { fontFamily: fonts.medium, fontSize: 12, color: '#C9CEE6' },
  heroBtn: { marginTop: 14, backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  stat: { width: '48%', flexGrow: 1 },
  statVal: { fontFamily: fonts.display, fontSize: 26, color: colors.navy, marginTop: 4 },
  ratio: { fontFamily: fonts.display, fontSize: 24, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  amount: { fontFamily: fonts.semibold, fontSize: 14 },
  quick: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, alignItems: 'center', gap: 6 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.navy },
  timeBox: { width: 54, height: 54, borderRadius: 14, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  timeTop: { fontFamily: fonts.display, fontSize: 20, color: colors.navy, lineHeight: 22 },
  timeSub: { fontFamily: fonts.semibold, fontSize: 10, color: colors.primary },
  statusText: { fontFamily: fonts.semibold, fontSize: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  liveRing: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 12, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  weekBig: { fontFamily: fonts.display, fontSize: 36, color: colors.navy, lineHeight: 38 },
  dayLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  call: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 5, paddingLeft: 5, paddingRight: 10 },
  chipDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  chipInitial: { fontFamily: fonts.semibold, fontSize: 11, color: colors.green },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.navy },
  medal: { fontSize: 22, width: 28, textAlign: 'center', fontFamily: fonts.semibold, color: colors.muted },
});
