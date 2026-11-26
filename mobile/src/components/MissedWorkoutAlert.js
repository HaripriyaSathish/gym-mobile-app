import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Button } from './ui';

const native = Platform.OS !== 'web';
const loop = (anim) => Animated.loop(anim);

/** Emoji that keeps moving: a sad face that sways, a tear that drops, a flexed arm that bounces. */
function Sway({ children, size = 72 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: -1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    a.start();
    return () => a.stop();
  }, [v]);
  const rotate = v.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  return <Animated.Text style={{ fontSize: size, transform: [{ rotate }] }}>{children}</Animated.Text>;
}

function Drop({ children, delay = 0, left }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.in(Easing.quad), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }),
      Animated.delay(500),
    ]));
    a.start();
    return () => a.stop();
  }, [v, delay]);
  return (
    <Animated.Text style={[st.drop, { left, opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 46] }) }] }]}>
      {children}
    </Animated.Text>
  );
}

function Bounce({ children, delay = 0 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 520, easing: Easing.bounce, useNativeDriver: native }),
      Animated.delay(700),
    ]));
    a.start();
    return () => a.stop();
  }, [v, delay]);
  return (
    <Animated.Text style={{ fontSize: 26, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }}>
      {children}
    </Animated.Text>
  );
}

/**
 * Pops up once per day on the member Home screen when the server auto-marked them absent
 * because their batch session ended without a check-in.
 */
export default function MissedWorkoutAlert({ missed, onCheckIn }) {
  const key = missed ? `pf_missed_seen_${missed.date}` : null;
  const [open, setOpen] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!key) return;
    AsyncStorage.getItem(key).then((seen) => { if (!seen) setOpen(true); });
  }, [key]);

  useEffect(() => {
    if (!open) return;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: native }),
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 70, useNativeDriver: native }),
    ]).start();
  }, [open, fade, pop]);

  const close = (after) => {
    AsyncStorage.setItem(key, '1');
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: native }),
      Animated.timing(pop, { toValue: 0, duration: 200, useNativeDriver: native }),
    ]).start(() => {
      setOpen(false);
      after?.();
    });
  };

  if (!open || !missed) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.backdrop, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close" />
      <Animated.View style={[st.card, { transform: [
        { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
        { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
      ] }]}>
        <View style={st.emojiWrap}>
          <Sway>😢</Sway>
          <Drop left={30}>💧</Drop>
          <Drop left={62} delay={550}>💧</Drop>
        </View>
        <Text style={st.title}>YOU MISSED TODAY&apos;S WORKOUT</Text>
        <Text style={st.batch}>{missed.batch} · {missed.start} – {missed.end}</Text>
        <Text style={st.msg}>You were marked absent because there was no check-in. Your batch missed you today!</Text>
        <View style={st.row}>
          <Bounce>💪</Bounce>
          <Bounce delay={150}>🔥</Bounce>
          <Bounce delay={300}>🏋️</Bounce>
        </View>
        <Button title="I'll be there next class" icon="flash" onPress={() => close()} pulse style={{ alignSelf: 'stretch' }} />
        {onCheckIn ? (
          <Pressable onPress={() => close(onCheckIn)} style={{ marginTop: 12 }} hitSlop={8}>
            <Text style={st.link}>I did attend, check me in</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(27,35,64,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: radius.xl, padding: 24, alignItems: 'center',
    boxShadow: '0px 24px 60px rgba(27,35,64,0.35)' },
  emojiWrap: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center',
    marginTop: -70, borderWidth: 6, borderColor: '#fff' },
  drop: { position: 'absolute', top: 58, fontSize: 14 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.navy, letterSpacing: 1, textAlign: 'center', marginTop: 12 },
  batch: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary, marginTop: 2 },
  msg: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 10 },
  row: { flexDirection: 'row', gap: 18, marginVertical: 16 },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
});
