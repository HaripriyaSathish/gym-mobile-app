import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, FadeIn, Glow, Img, Pill, Screen, Section, Skeleton, T, rupee } from '../components/ui';
import { useApi } from '../useApi';
import { colors, fonts, gradients, radius } from '../theme';

const INTENSITY = { low: [colors.green, 'Low intensity'], medium: [colors.amber, 'Medium intensity'], high: [colors.red, 'High intensity'] };

export default function ProgramScreen({ route, navigation }) {
  const { program } = route.params;
  const batches = useApi(`/batches/?program=${encodeURIComponent(program.name)}`);
  const media = useApi(`/media/?program=${encodeURIComponent(program.name)}`);
  const [ic, il] = INTENSITY[program.intensity] || INTENSITY.medium;
  const videos = (media.data || []).filter((m) => m.kind === 'video');
  const photos = (media.data || []).filter((m) => m.kind === 'image');

  return (
    <Screen refreshing={batches.refreshing} onRefresh={() => { batches.refresh(); media.refresh(); }}>
      <Img uri={program.image} style={{ height: 300 }} radius={0} size="lg">
        <LinearGradient colors={gradients.fade} style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => navigation.goBack()} style={st.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <FadeIn style={st.heroText}>
          <Text style={st.title}>{program.name}</Text>
          <Text style={st.tag}>{program.tagline}</Text>
        </FadeIn>
      </Img>

      <View style={{ padding: 20, gap: 10 }}>
        <Pill text={il} color={ic} icon="flame" />
        <T.Body>{program.description}</T.Body>
      </View>

      <Section title="Batches" style={{ marginTop: 4 }}>
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {batches.loading && !batches.data ? <Skeleton /> : (batches.data || []).map((b, i) => (
            <FadeIn key={b.id} index={i}><Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={st.time}>
                <Text style={st.timeText}>{b.start.split(' ')[0]}</Text>
                <Text style={st.ampm}>{b.start.split(' ')[1]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <T.H2 style={{ fontSize: 15 }}>{b.name}</T.H2>
                <T.Muted style={{ fontSize: 12 }}>{b.days} · {b.trainer}</T.Muted>
                <T.Muted style={{ fontSize: 12 }}>{b.member_count}/{b.capacity} members · small batch</T.Muted>
              </View>
              <Text style={st.fee}>{rupee(b.monthly_fee)}<Text style={st.per}>/mo</Text></Text>
            </Card></FadeIn>
          ))}
        </View>
      </Section>

      {videos.length ? (
        <Section title="Workout videos">
          <FlatList horizontal data={videos} keyExtractor={(i) => String(i.id)} showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item }) => (
              <Glow radius={radius.lg} onPress={() => navigation.navigate('Video', { item })}>
                <Img uri={item.image} style={{ width: 220, height: 130 }} radius={radius.lg}>
                  <LinearGradient colors={gradients.fade} style={StyleSheet.absoluteFill} />
                  <View style={st.play}><Ionicons name="play" size={20} color={colors.primary} /></View>
                  <Text style={st.vidTitle} numberOfLines={1}>{item.title}</Text>
                </Img>
              </Glow>
            )} />
        </Section>
      ) : null}

      {photos.length ? (
        <Section title="Inside the class">
          <FlatList horizontal data={photos} keyExtractor={(i) => String(i.id)} showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item }) => <Img uri={item.image} style={{ width: 150, height: 150 }} radius={radius.lg} />} />
        </Section>
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  back: { position: 'absolute', top: 14, left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 18 },
  title: { fontFamily: fonts.display, fontSize: 54, color: '#fff', letterSpacing: 2, lineHeight: 56, textShadowColor: 'rgba(255,90,54,0.9)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  tag: { fontFamily: fonts.medium, fontSize: 14, color: '#FFE3D8' },
  time: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  timeText: { fontFamily: fonts.display, fontSize: 22, color: colors.primary, lineHeight: 24 },
  ampm: { fontFamily: fonts.semibold, fontSize: 10, color: colors.primary },
  fee: { fontFamily: fonts.display, fontSize: 22, color: colors.navy },
  per: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  play: { position: 'absolute', top: 40, alignSelf: 'center', width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  vidTitle: { position: 'absolute', left: 12, right: 12, bottom: 10, fontFamily: fonts.semibold, color: '#fff', fontSize: 13 },
});
