import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth';
import { Button, FadeIn, T, rupee } from '../components/ui';
import { colors, fonts, radius } from '../theme';

function Field({ icon, right, ...props }) {
  return (
    <View style={st.field}>
      <Ionicons name={icon} size={20} color={colors.muted} />
      <TextInput style={st.input} placeholderTextColor={colors.muted} autoCorrect={false} {...props} />
      {right}
    </View>
  );
}

export default function SignUpScreen({ navigation }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: '', username: '', email: '', phone: '', password: '', confirm: '' });
  const [batch, setBatch] = useState(null);
  const [batches, setBatches] = useState([]);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api('/batches/').then(setBatches).catch(() => {});
  }, []);

  const submit = async () => {
    const { name, username, email, phone, password, confirm } = form;
    if (!name.trim() || !username.trim() || !email.trim() || !password) return setError('Fill in name, username, email and password');
    if (password !== confirm) return setError("Passwords don't match");
    setBusy(true);
    setError('');
    try {
      await signUp({ name: name.trim(), username: username.trim(), email: email.trim(), phone: phone.trim(), password, batch });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={st.back} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </Pressable>

        <FadeIn distance={16}>
          <T.Display style={{ fontSize: 34 }}>Create account</T.Display>
          <T.Muted style={{ marginBottom: 20 }}>Join PulseForge and pick the batch you want to train with.</T.Muted>

          <Field icon="person-outline" placeholder="Full name" value={form.name} onChangeText={set('name')} autoCapitalize="words" />
          <Field icon="at-outline" placeholder="Username" value={form.username} onChangeText={set('username')} autoCapitalize="none" />
          <Field icon="mail-outline" placeholder="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none"
            keyboardType="email-address" />
          <Field icon="call-outline" placeholder="Phone (optional)" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <Field icon="lock-closed-outline" placeholder="Password (min 8 characters)" value={form.password} onChangeText={set('password')}
            secureTextEntry={!show}
            right={<Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} onPress={() => setShow(!show)} />} />
          <Field icon="shield-checkmark-outline" placeholder="Confirm password" value={form.confirm} onChangeText={set('confirm')}
            secureTextEntry={!show} onSubmitEditing={submit} returnKeyType="go" />

          {batches.length ? (
            <>
              <Text style={st.label}>Choose a batch <Text style={st.optional}>(optional)</Text></Text>
              {batches.map((b) => {
                const full = b.member_count >= b.capacity;
                const on = batch === b.id;
                return (
                  <Pressable key={b.id} disabled={full} onPress={() => setBatch(on ? null : b.id)}
                    style={[st.batch, on && st.batchOn, full && { opacity: 0.45 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.batchName}>{b.name}</Text>
                      <Text style={st.batchMeta}>{b.program} · {b.start} · {b.days}</Text>
                      <Text style={st.batchMeta}>{full ? 'Full' : `${b.capacity - b.member_count} spots left`} · {rupee(b.monthly_fee)}/month</Text>
                    </View>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? colors.primary : colors.border} />
                  </Pressable>
                );
              })}
            </>
          ) : null}

          {error ? (
            <View style={st.error}>
              <Ionicons name="alert-circle" size={16} color={colors.red} />
              <Text style={st.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button title="Create account" icon="person-add" onPress={submit} loading={busy} pulse style={{ marginTop: 12 }} />
          <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 18, marginBottom: 12 }}>
            <T.Muted style={{ textAlign: 'center', fontSize: 13 }}>
              Already a member? <Text style={st.link}>Sign in</Text>
            </T.Muted>
          </Pressable>
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24, paddingTop: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, marginBottom: 12, gap: 10 },
  input: { flex: 1, paddingVertical: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text, outlineStyle: 'none' },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy, marginTop: 8, marginBottom: 10 },
  optional: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12 },
  batch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.border, padding: 14, marginBottom: 10, gap: 10 },
  batchOn: { borderColor: colors.primary, backgroundColor: '#FFF4EF' },
  batchName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy },
  batchMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  link: { fontFamily: fonts.semibold, color: colors.primary },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.redSoft, padding: 10, borderRadius: 10, marginTop: 4, marginBottom: 4 },
  errorText: { fontFamily: fonts.medium, color: colors.red, fontSize: 13, flex: 1 },
});
