import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth';
import { Brand, Button, FadeIn, T } from '../components/ui';
import { colors, fonts, radius } from '../theme';


export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hero, setHero] = useState(null);

  useEffect(() => {
    // Hero photo comes from the gym's Cloudinary media (public programs endpoint)
    api('/programs/').then((p) => setHero((p.find((x) => x.name === 'Fitness') || p[0])?.image)).catch(() => {});
  }, []);

  const submit = async () => {
    if (!username || !password) return setError('Enter your username and password');
    setBusy(true);
    setError('');
    try {
      await signIn(username.trim(), password);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={st.hero}>
          {hero ? <Image source={{ uri: hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} /> : null}
          <LinearGradient colors={['rgba(255,90,54,0.25)', 'rgba(27,35,64,0.88)']} style={StyleSheet.absoluteFill} />
          <FadeIn style={st.heroContent} distance={24}>
            <Brand size={34} light />
            <Text style={st.tagline}>TRAIN TOGETHER.{'\n'}TRANSFORM FOREVER.</Text>
            <Text style={st.sub}>Zumba · HIIT · Strength · Yoga</Text>
          </FadeIn>
        </View>

        <View style={st.sheet}>
          <T.Display style={{ fontSize: 32 }}>Welcome back</T.Display>
          <T.Muted style={{ marginBottom: 18 }}>Sign in to your PulseForge account.</T.Muted>

          <View style={st.field}>
            <Ionicons name="person-outline" size={20} color={colors.muted} />
            <TextInput style={st.input} placeholder="Username or email" placeholderTextColor={colors.muted}
              autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername}
              returnKeyType="next" />
          </View>
          <View style={st.field}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
            <TextInput style={st.input} placeholder="Password" placeholderTextColor={colors.muted}
              secureTextEntry={!show} value={password} onChangeText={setPassword} onSubmitEditing={submit}
              returnKeyType="go" />
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted}
              onPress={() => setShow(!show)} />
          </View>

          {error ? (
            <View style={st.error}>
              <Ionicons name="alert-circle" size={16} color={colors.red} />
              <Text style={st.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button title="Sign in" icon="arrow-forward" onPress={submit} loading={busy} pulse style={{ marginTop: 8 }} />
          <Pressable onPress={() => navigation.navigate('SignUp')} style={{ marginTop: 18 }}>
            <T.Muted style={{ textAlign: 'center', fontSize: 13 }}>
              New here? <Text style={{ fontFamily: fonts.semibold, color: colors.primary }}>Create an account</Text>
            </T.Muted>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  hero: { height: 380, justifyContent: 'flex-end' },
  heroContent: { padding: 24, paddingBottom: 48 },
  tagline: { fontFamily: fonts.display, color: '#fff', fontSize: 44, lineHeight: 44, letterSpacing: 1.5, marginTop: 18, textShadowColor: 'rgba(255,110,64,0.95)', textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } },
  sub: { fontFamily: fonts.medium, color: '#FFE3D8', marginTop: 8, fontSize: 13, letterSpacing: 0.5 },
  sheet: { flex: 1, backgroundColor: colors.bg, marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, marginBottom: 12, gap: 10 },
  input: { flex: 1, paddingVertical: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text, outlineStyle: 'none' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.redSoft, padding: 10, borderRadius: 10, marginBottom: 8 },
  errorText: { fontFamily: fonts.medium, color: colors.red, fontSize: 13, flex: 1 },
});
