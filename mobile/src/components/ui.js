import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { sized } from '../images';
import { colors, fonts, gradients, radius, shadow, shadowSm } from '../theme';
import { FadeIn, Glow, Pop, PulseGlow, Sheen } from './motion';

export { FadeIn, Glow, Pop, PulseGlow, Sheen };

/* ---------- typography ---------- */
export const T = {
  Display: ({ style, ...p }) => <Text {...p} style={[s.display, style]} />,
  H2: ({ style, ...p }) => <Text {...p} style={[s.h2, style]} />,
  Body: ({ style, ...p }) => <Text {...p} style={[s.body, style]} />,
  Muted: ({ style, ...p }) => <Text {...p} style={[s.muted, style]} />,
  Label: ({ style, ...p }) => <Text {...p} style={[s.label, style]} />,
};

/* ---------- brand ---------- */
export function Brand({ size = 30, light = false }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={[s.bolt, { width: size * 1.05, height: size * 1.05, borderRadius: size * 0.32 }]}>
        <Ionicons name="flash" size={size * 0.62} color="#fff" />
      </View>
      <Text style={[s.brand, { fontSize: size, color: light ? '#fff' : colors.navy }]}>
        PULSE<Text style={{ color: light ? '#FFE3D8' : colors.primary }}>FORGE</Text>
      </Text>
    </View>
  );
}

/* ---------- layout ---------- */
export function Screen({ children, refreshing = false, onRefresh, contentStyle, header }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ paddingBottom: 32 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}
            colors={[colors.primary]} />
        ) : undefined
      }
    >
      {header}
      {children}
    </ScrollView>
  );
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <View style={s.pageHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.pageTitle}>{title}</Text>
        {subtitle ? <T.Muted>{subtitle}</T.Muted> : null}
      </View>
      {right}
    </View>
  );
}

export function Section({ title, action, onAction, children, style }) {
  return (
    <View style={[{ marginTop: 22 }, style]}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        {action ? (
          <Pressable onPress={onAction} hitSlop={10}>
            <Text style={s.sectionAction}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      <FadeIn delay={80}>{children}</FadeIn>
    </View>
  );
}

export function Card({ children, style, onPress, glow = colors.primary }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Glow onPress={onPress} radius={radius.lg} color={glow} style={[s.card, style]}>
      {children}
    </Glow>
  );
}

export function Pill({ text, color = colors.primary, bg, icon }) {
  return (
    <View style={[s.pill, { backgroundColor: bg || color + '1A' }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={[s.pillText, { color }]}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, loading, icon, variant = 'primary', style, disabled, pulse }) {
  const ghost = variant === 'ghost';
  const inner = (
    <View style={s.btnInner}>
      {loading ? (
        <ActivityIndicator color={ghost ? colors.primary : '#fff'} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={ghost ? colors.primary : '#fff'} style={{ marginRight: 8 }} /> : null}
          <Text style={[s.btnText, ghost && { color: colors.primary }]}>{title}</Text>
        </>
      )}
    </View>
  );
  const btn = (
    <Glow onPress={onPress} disabled={loading || disabled} radius={radius.md} scaleTo={1.02}
      style={[s.btn, ghost && s.btnGhost, disabled && { opacity: 0.7 }, style]}>
      {ghost ? inner : (
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnGrad}>
          {inner}
          <Sheen width={340} />
        </LinearGradient>
      )}
    </Glow>
  );
  return pulse && !ghost ? <PulseGlow radius={radius.md}>{btn}</PulseGlow> : btn;
}

export function IconCircle({ name, color = colors.primary, size = 42 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '1A',
      alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.48} color={color} />
    </View>
  );
}

/** size: 'sm' for thumbnails/cards, 'md' for wide banners, 'lg' for full-screen heroes (see images.js). */
export function Img({ uri, style, radius: r = radius.md, children, size = 'sm' }) {
  return (
    <View style={[{ borderRadius: r, overflow: 'hidden', backgroundColor: colors.soft }, style]}>
      <Image source={{ uri: sized(uri, size) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150}
        cachePolicy="memory-disk" />
      {children}
    </View>
  );
}

/* ---------- loading / errors ---------- */
function Shimmer({ style }) {
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ backgroundColor: '#F6E6DA', borderRadius: radius.md, opacity: v }, style]} />;
}

export function Skeleton() {
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <Shimmer style={{ height: 26, width: '55%' }} />
      <Shimmer style={{ height: 160 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Shimmer style={{ height: 90, flex: 1 }} />
        <Shimmer style={{ height: 90, flex: 1 }} />
      </View>
      <Shimmer style={{ height: 72 }} />
      <Shimmer style={{ height: 72 }} />
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
      <IconCircle name="cloud-offline-outline" color={colors.red} size={64} />
      <T.H2 style={{ textAlign: 'center' }}>Couldn't load this</T.H2>
      <T.Muted style={{ textAlign: 'center' }}>{message}</T.Muted>
      {onRetry ? <Button title="Try again" icon="refresh" onPress={onRetry} style={{ alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

export function Empty({ icon = 'sparkles-outline', title, text }) {
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 8 }}>
      <IconCircle name={icon} size={56} />
      <T.H2>{title}</T.H2>
      {text ? <T.Muted style={{ textAlign: 'center' }}>{text}</T.Muted> : null}
    </View>
  );
}

/** Standard data screen wrapper: skeleton → error → content. */
export function DataScreen({ q, header, children, contentStyle }) {
  if (q.loading && !q.data) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{header}<Skeleton /></View>;
  if (q.error && !q.data) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{header}<ErrorState message={q.error} onRetry={() => q.reload()} /></View>;
  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh} header={header} contentStyle={contentStyle}>
      {children(q.data)}
    </Screen>
  );
}

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtShort = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const timeAgo = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 0) {
    const a = -diff;
    if (a < 3600) return `in ${Math.max(1, Math.round(a / 60))} min`;
    if (a < 86400) return `in ${Math.round(a / 3600)} h`;
    return `in ${Math.round(a / 86400)} d`;
  }
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return `${Math.round(diff / 86400)} d ago`;
};
export const rupee = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const s = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 34, color: colors.navy, letterSpacing: 1 },
  h2: { fontFamily: fonts.semibold, fontSize: 17, color: colors.navy },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 21 },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 19 },
  label: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  brand: { fontFamily: fonts.display, letterSpacing: 2, marginLeft: 8 },
  bolt: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  pageHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  pageTitle: { fontFamily: fonts.display, fontSize: 38, color: colors.navy, letterSpacing: 1.2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.navy, letterSpacing: 1 },
  sectionAction: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, ...shadowSm },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.semibold, fontSize: 11 },
  btn: { borderRadius: radius.md, overflow: 'hidden', ...shadow },
  btnGhost: { backgroundColor: colors.soft, boxShadow: 'none' },
  btnGrad: { borderRadius: radius.md },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 18, minHeight: 50 },
  btnText: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff' },
});
