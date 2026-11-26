import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Glow } from './motion';

const native = Platform.OS !== 'web';
const H = 210;

/** Ken-Burns zoom on the visible slide for a premium, alive feel. */
function Slide({ item, width, active, onPress }) {
  const zoom = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      zoom.setValue(1);
      return;
    }
    const a = Animated.timing(zoom, { toValue: 1.12, duration: 5200, easing: Easing.out(Easing.quad), useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [active, zoom]);

  return (
    <View style={{ width, paddingHorizontal: 20 }}>
      <View style={st.slide}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
          <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={350}
            cachePolicy="memory-disk" priority="high" />
        </Animated.View>
        <LinearGradient colors={['rgba(27,35,64,0.05)', 'rgba(27,35,64,0.55)', 'rgba(27,35,64,0.92)']}
          locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(255,90,54,0.35)', 'rgba(255,90,54,0)']} start={{ x: 0, y: 1 }} end={{ x: 0.7, y: 0.3 }}
          style={StyleSheet.absoluteFill} />
        <View style={st.content}>
          {item.tag ? <View style={st.tag}><Text style={st.tagText}>{item.tag}</Text></View> : null}
          <Text style={st.title} numberOfLines={2}>{item.title}</Text>
          {item.subtitle ? <Text style={st.sub} numberOfLines={2}>{item.subtitle}</Text> : null}
          {item.target !== 'none' ? (
            <Glow onPress={onPress} radius={22} color="#FFFFFF" style={st.cta}>
              <Text style={st.ctaText}>{item.cta_label}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Glow>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function BannerCarousel({ banners, onOpen }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const ref = useRef(null);
  const paused = useRef(false);
  const x = useRef(new Animated.Value(0)).current;

  // Auto-advance every 4.5s (pauses while the user is swiping)
  useEffect(() => {
    if (!width || banners.length < 2) return;
    const t = setInterval(() => {
      if (paused.current) return;
      const next = (index + 1) % banners.length;
      ref.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, 4500);
    return () => clearInterval(t);
  }, [index, width, banners.length]);

  if (!banners?.length) return null;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ marginTop: 16 }}>
      {width ? (
        <Animated.ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: false })}
          onScrollBeginDrag={() => { paused.current = true; }}
          onMomentumScrollEnd={(e) => {
            paused.current = false;
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          onScrollEndDrag={(e) => {
            if (Platform.OS === 'web') {
              paused.current = false;
              setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
            }
          }}
          style={Platform.OS === 'web' ? { scrollSnapType: 'x mandatory' } : undefined}
        >
          {banners.map((b, i) => (
            <View key={b.id} style={Platform.OS === 'web' ? { scrollSnapAlign: 'start' } : undefined}>
              <Slide item={b} width={width} active={i === index} onPress={() => onOpen(b)} />
            </View>
          ))}
        </Animated.ScrollView>
      ) : <View style={{ height: H }} />}

      <View style={st.dots}>
        {banners.map((b, i) => {
          const w = width
            ? x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [7, 24, 7], extrapolate: 'clamp' })
            : 7;
          const o = width
            ? x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' })
            : 0.35;
          return <Animated.View key={b.id} style={[st.dot, { width: w, opacity: o }]} />;
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  slide: { height: H, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.navy,
    boxShadow: '0px 16px 36px rgba(27,35,64,0.25)' },
  content: { position: 'absolute', left: 18, right: 18, bottom: 16 },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
    marginBottom: 6, boxShadow: '0px 0px 14px rgba(255,90,54,0.9)' },
  tagText: { fontFamily: fonts.bold, color: '#fff', fontSize: 10, letterSpacing: 1.5 },
  title: { fontFamily: fonts.display, color: '#fff', fontSize: 32, lineHeight: 33, letterSpacing: 1,
    textShadowColor: 'rgba(255,110,64,0.75)', textShadowRadius: 16, textShadowOffset: { width: 0, height: 0 } },
  sub: { fontFamily: fonts.regular, color: '#E8EAF3', fontSize: 12.5, marginTop: 2, maxWidth: '88%' },
  cta: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 },
  ctaText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 12.5 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { height: 7, borderRadius: 4, backgroundColor: colors.primary },
});
