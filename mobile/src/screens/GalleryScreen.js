import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { sized } from '../images';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Empty, ErrorState, FadeIn, Glow, Img, PageHeader, Pill, Skeleton, T } from '../components/ui';
import { useApi } from '../useApi';
import { colors, fonts, gradients, radius } from '../theme';

const TABS = [
  { key: 'image', label: 'Photos', icon: 'images-outline' },
  { key: 'video', label: 'Videos', icon: 'play-circle-outline' },
  { key: 'transformation', label: 'Transformations', icon: 'trending-up-outline' },
];

export default function GalleryScreen({ navigation, route }) {
  const [kind, setKind] = useState(route.params?.kind || 'image');
  const [program, setProgram] = useState('All');
  const [preview, setPreview] = useState(null);
  const q = useApi('/media/');

  useEffect(() => {
    if (route.params?.kind) setKind(route.params.kind);
  }, [route.params?.kind]);

  const programs = useMemo(() => ['All', ...new Set((q.data || []).map((m) => m.program).filter(Boolean))], [q.data]);
  const items = useMemo(
    () => (q.data || []).filter((m) => m.kind === kind && (program === 'All' || m.program === program)),
    [q.data, kind, program]
  );

  const header = (
    <View style={{ backgroundColor: colors.bg }}>
      <PageHeader title="Gallery" subtitle="Moments, workouts & real results" />
      <View style={st.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setKind(t.key)} style={[st.tab, kind === t.key && st.tabActive]}>
            <Ionicons name={t.icon} size={15} color={kind === t.key ? '#fff' : colors.muted} />
            <Text style={[st.tabText, kind === t.key && { color: '#fff' }]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 12 }}>
        {programs.map((p) => (
          <Pressable key={p} onPress={() => setProgram(p)} style={[st.chip, program === p && st.chipActive]}>
            <Text style={[st.chipText, program === p && { color: colors.primary }]}>{p}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  if (q.loading && !q.data) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{header}<Skeleton /></View>;
  if (q.error && !q.data) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{header}<ErrorState message={q.error} onRetry={q.reload} /></View>;

  const common = {
    style: { flex: 1, backgroundColor: colors.bg },
    showsVerticalScrollIndicator: false,
    ListHeaderComponent: header,
    ListEmptyComponent: <Empty title="Nothing here yet" text="New content from your coaches will show up here." />,
    refreshControl: <RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} colors={[colors.primary]} />,
    initialNumToRender: 6,
    windowSize: 7,
    removeClippedSubviews: true,
  };

  if (kind === 'image') {
    return (
      <View style={{ flex: 1 }}>
        <FlatList key="grid" {...common} data={items} numColumns={2} keyExtractor={(i) => String(i.id)}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }} contentContainerStyle={{ gap: 12, paddingBottom: 30 }}
          renderItem={({ item, index }) => (
            <FadeIn index={index} style={{ flex: 1 }}><Glow radius={radius.lg} onPress={() => setPreview(item)}>
              <Img uri={item.image} style={{ height: index % 3 === 0 ? 210 : 170 }} radius={radius.lg}>
                <LinearGradient colors={gradients.fade} style={st.fade}>
                  <Text style={st.caption} numberOfLines={1}>{item.title}</Text>
                </LinearGradient>
              </Img>
            </Glow></FadeIn>
          )} />
        {preview ? (
          <Pressable style={[StyleSheet.absoluteFill, st.lightbox]} onPress={() => setPreview(null)}>
            {preview ? (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Image source={{ uri: sized(preview.image, 'lg') }} placeholder={{ uri: sized(preview.image, 'sm') }} style={{ width: '100%', aspectRatio: 0.8, borderRadius: radius.lg }} contentFit="cover" cachePolicy="memory-disk" />
                <Text style={[st.progName, { marginTop: 14 }]}>{preview.title}</Text>
                {preview.description ? <Text style={st.lbDesc}>{preview.description}</Text> : null}
                <Text style={st.lbClose}>Tap anywhere to close</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (kind === 'video') {
    return (
      <FlatList key="videos" {...common} data={items} keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ gap: 14, paddingBottom: 30 }}
        renderItem={({ item, index }) => (
          <FadeIn index={index}><Glow radius={radius.lg} style={{ marginHorizontal: 20 }} onPress={() => navigation.navigate('Video', { item })}>
            <Img uri={item.image} style={{ height: 190 }} radius={radius.lg}>
              <LinearGradient colors={gradients.fade} style={StyleSheet.absoluteFill} />
              <View style={st.play}><Ionicons name="play" size={26} color={colors.primary} /></View>
              {item.duration ? <View style={st.duration}><Text style={st.durationText}>{item.duration}</Text></View> : null}
              <View style={st.videoInfo}>
                <Text style={st.progName}>{item.title}</Text>
                <Text style={st.caption}>{item.program} · {item.description}</Text>
              </View>
            </Img>
          </Glow></FadeIn>
        )} />
    );
  }

  return (
    <FlatList key="transform" {...common} data={items} keyExtractor={(i) => String(i.id)}
      contentContainerStyle={{ gap: 16, paddingBottom: 30 }}
      renderItem={({ item, index }) => (
        <FadeIn index={index}><View style={st.tCard}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Img uri={item.before_image} style={{ flex: 1, height: 200 }} radius={14}>
              <View style={[st.tag, { backgroundColor: colors.navy }]}><Text style={st.tagText}>BEFORE</Text></View>
            </Img>
            <Img uri={item.image} style={{ flex: 1, height: 200 }} radius={14}>
              <View style={[st.tag, { backgroundColor: colors.primary }]}><Text style={st.tagText}>AFTER</Text></View>
            </Img>
          </View>
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T.H2 style={{ flex: 1 }}>{item.title}</T.H2>
              {item.result ? <Pill text={item.result} color={colors.green} icon="trending-down" /> : null}
            </View>
            <T.Muted style={{ marginTop: 4 }}>{item.member_name} · {item.program}</T.Muted>
            {item.description ? <T.Body style={{ marginTop: 6 }}>{item.description}</T.Body> : null}
          </View>
        </View></FadeIn>
      )} />
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, backgroundColor: '#fff', borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.soft },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, paddingTop: 26 },
  caption: { fontFamily: fonts.medium, color: '#fff', fontSize: 12 },
  progName: { fontFamily: fonts.display, color: '#fff', fontSize: 26, letterSpacing: 1 },
  play: { position: 'absolute', top: 60, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  duration: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(27,35,64,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  durationText: { fontFamily: fonts.semibold, color: '#fff', fontSize: 11 },
  videoInfo: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  tCard: { marginHorizontal: 20, boxShadow: '0px 10px 30px rgba(255,90,54,0.10)', backgroundColor: '#fff', borderRadius: radius.lg, padding: 6, borderWidth: 1, borderColor: colors.border },
  tag: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontFamily: fonts.bold, color: '#fff', fontSize: 10, letterSpacing: 1 },
  lightbox: { flex: 1, backgroundColor: 'rgba(27,35,64,0.92)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  lbDesc: { fontFamily: fonts.regular, color: '#FFE3D8', textAlign: 'center', marginTop: 4 },
  lbClose: { fontFamily: fonts.regular, color: '#9AA1B8', fontSize: 12, marginTop: 16 },
});
