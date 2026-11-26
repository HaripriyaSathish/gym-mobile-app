import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

const native = Platform.OS !== 'web';

/** Fade + rise entrance. Stagger lists by passing index. */
export function FadeIn({ children, delay = 0, index = 0, distance = 14, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1, duration: 480, delay: delay + Math.min(index, 8) * 70,
      easing: Easing.out(Easing.cubic), useNativeDriver: native,
    }).start();
  }, [v, delay, index]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Springs up a little when it becomes active (tab icons, toggles). */
export function Pop({ active, children, to = 1.18, style }) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: active ? 1 : 0, friction: 4, tension: 160, useNativeDriver: native }).start();
  }, [active, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, to] });
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  return <Animated.View style={[style, { transform: [{ scale }, { translateY }] }]}>{children}</Animated.View>;
}

const glowShadow = (c) =>
  `0px 0px 0px 1.5px ${c}, 0px 0px 18px ${c}CC, 0px 0px 42px ${c}66, 0px 12px 30px ${c}40`;

/**
 * Neon-glow interactive surface: on hover (web) or press (touch) it lifts, scales a touch and
 * lights up a coral neon halo. Animations run on the native driver (opacity/transform only).
 */
export function Glow({ children, onPress, style, radius = 22, color = colors.primary, scaleTo = 1.025, disabled, hitSlop }) {
  const v = useRef(new Animated.Value(0)).current;
  const to = (val, d = 220) =>
    Animated.timing(v, { toValue: val, duration: d, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();

  const flat = StyleSheet.flatten(style) || {};
  const { margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, flex, width, alignSelf, ...inner } = flat;
  const outer = { margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, flex, width, alignSelf };

  return (
    <Animated.View style={[outer, { transform: [
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) },
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
    ] }]}>
      <Animated.View pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, opacity: v, boxShadow: glowShadow(color) }]} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={hitSlop}
        onHoverIn={() => to(1)}
        onHoverOut={() => to(0, 320)}
        onPressIn={() => to(1, 120)}
        onPressOut={() => to(0, 380)}
        style={[{ borderRadius: radius, cursor: onPress ? 'pointer' : 'auto' }, inner]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Continuous soft neon pulse around a child (for the primary call-to-action). */
export function PulseGlow({ children, radius = 16, color = colors.primary, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View style={style}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
        borderRadius: radius, boxShadow: `0px 0px 22px ${color}AA, 0px 0px 46px ${color}55`,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
      }]} />
      {children}
    </Animated.View>
  );
}

/** Slowly sweeping light streak across a surface (premium sheen on hero cards). */
export function Sheen({ width = 360 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(1800),
      Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', top: -40, bottom: -40, width: 70, backgroundColor: 'rgba(255,255,255,0.22)',
      transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-120, width + 60] }) }, { rotate: '18deg' }],
    }} />
  );
}
