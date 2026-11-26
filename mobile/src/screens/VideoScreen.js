import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pill, T } from '../components/ui';
import { colors, fonts, radius } from '../theme';

export default function VideoScreen({ route, navigation }) {
  const { item } = route.params;
  const player = useVideoPlayer(item.video, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={st.player}>
        <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain"
          fullscreenOptions={{ enable: true }} />
        <Pressable onPress={() => navigation.goBack()} style={st.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
      </View>
      <View style={{ padding: 20, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {item.program ? <Pill text={item.program} /> : null}
          {item.duration ? <Pill text={item.duration} color={colors.navy} icon="time-outline" /> : null}
        </View>
        <Text style={st.title}>{item.title}</Text>
        <T.Body>{item.description}</T.Body>
        <View style={st.tip}>
          <Ionicons name="water-outline" size={18} color={colors.primary} />
          <T.Muted style={{ flex: 1 }}>Warm up first, keep water nearby and stop if anything feels painful.</T.Muted>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  player: { width: '100%', aspectRatio: 16 / 10, backgroundColor: '#000' },
  back: { position: 'absolute', top: 12, left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.navy, letterSpacing: 1 },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.soft, padding: 14, borderRadius: radius.md, marginTop: 8 },
});
