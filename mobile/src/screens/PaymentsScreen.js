import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { Button, Card, DataScreen, IconCircle, PageHeader, Pill, T, fmtDate, rupee } from '../components/ui';
import { useApi } from '../useApi';
import { colors, fonts, gradients, radius, shadow } from '../theme';

const METHOD_ICON = { upi: 'phone-portrait-outline', card: 'card-outline', cash: 'cash-outline' };

export default function PaymentsScreen() {
  const q = useApi('/payments/');
  const [paying, setPaying] = useState(null);
  const [msg, setMsg] = useState('');

  // Refresh when returning to the screen / browser tab (after Cashfree checkout)
  useFocusEffect(useCallback(() => { q.reload(); }, [q.reload]));
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onFocus = () => q.reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [q.reload]);

  const pay = async (p) => {
    setPaying(p.id);
    setMsg('');
    // Open the tab synchronously on web so popup blockers allow it
    const win = Platform.OS === 'web' ? window.open('', '_blank') : null;
    try {
      const r = await api(`/payments/${p.id}/pay/`, { method: 'POST' });
      if (win) win.location.href = r.checkout_url;
      else await WebBrowser.openBrowserAsync(r.checkout_url, { toolbarColor: colors.primary });
      await q.reload();
    } catch (e) {
      if (win) win.close();
      setMsg(e.message);
    } finally {
      setPaying(null);
    }
  };

  return (
    <DataScreen q={q} header={<PageHeader title="Payments" subtitle="Fees, receipts & secure checkout" />}>
      {({ items, cashfree_mode }) => {
        const pending = items.filter((p) => p.status !== 'paid');
        const paid = items.filter((p) => p.status === 'paid');
        const due = pending.reduce((s, p) => s + Number(p.amount), 0);
        return (
          <View style={{ paddingHorizontal: 20, gap: 14, marginTop: 6 }}>
            <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.summary}>
              <Text style={st.sumLabel}>TOTAL DUE</Text>
              <Text style={st.sumValue}>{rupee(due)}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <View style={st.badge}><Ionicons name="shield-checkmark" size={12} color="#9FE3C6" />
                  <Text style={st.badgeText}>Secured by Cashfree</Text></View>
                <View style={[st.badge, { backgroundColor: 'rgba(255,176,32,0.2)' }]}>
                  <Text style={[st.badgeText, { color: '#FFD27A' }]}>{cashfree_mode === 'sandbox' ? 'TEST MODE' : 'DEMO MODE'}</Text></View>
              </View>
            </LinearGradient>

            {msg ? <Card style={{ backgroundColor: colors.redSoft, borderColor: '#F7C5C7' }}><T.Body style={{ color: colors.red }}>{msg}</T.Body></Card> : null}

            <Text style={st.h}>Pending</Text>
            {pending.length ? pending.map((p) => (
              <Card key={p.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <IconCircle name="receipt-outline" color={p.is_overdue ? colors.red : colors.primary} />
                  <View style={{ flex: 1 }}>
                    <T.H2 style={{ fontSize: 15 }}>{p.title}</T.H2>
                    <T.Muted style={{ fontSize: 12 }}>Due {fmtDate(p.due_date)}</T.Muted>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={st.amt}>{rupee(p.amount)}</Text>
                    <Pill text={p.is_overdue ? 'Overdue' : 'Pending'} color={p.is_overdue ? colors.red : colors.amber} />
                  </View>
                </View>
                <Button title={`Pay ${rupee(p.amount)}`} icon="lock-closed" loading={paying === p.id} onPress={() => pay(p)} />
              </Card>
            )) : (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconCircle name="checkmark-done" color={colors.green} />
                <T.Body style={{ flex: 1 }}>All clear! No pending fees.</T.Body>
              </Card>
            )}

            <Text style={st.h}>History</Text>
            <Card style={{ paddingVertical: 4 }}>
              {paid.map((p, i) => (
                <View key={p.id} style={[st.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <IconCircle name={METHOD_ICON[p.method] || 'checkmark'} color={colors.green} size={36} />
                  <View style={{ flex: 1 }}>
                    <T.Body style={{ fontFamily: fonts.medium }}>{p.title}</T.Body>
                    <T.Muted style={{ fontSize: 12 }}>Paid {p.paid_at ? fmtDate(p.paid_at) : ''} · {(p.method || '').toUpperCase()}</T.Muted>
                  </View>
                  <Text style={[st.amt, { fontSize: 20 }]}>{rupee(p.amount)}</Text>
                </View>
              ))}
              {!paid.length ? <T.Muted style={{ padding: 12 }}>No payments yet.</T.Muted> : null}
            </Card>
          </View>
        );
      }}
    </DataScreen>
  );
}

const st = StyleSheet.create({
  summary: { borderRadius: radius.xl, padding: 22, ...shadow },
  sumLabel: { fontFamily: fonts.semibold, color: '#9AA1B8', fontSize: 11, letterSpacing: 1.5 },
  sumValue: { fontFamily: fonts.display, color: '#fff', fontSize: 52, letterSpacing: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34,176,125,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: fonts.semibold, color: '#9FE3C6', fontSize: 11 },
  h: { fontFamily: fonts.display, fontSize: 24, color: colors.navy, letterSpacing: 1, marginTop: 6 },
  amt: { fontFamily: fonts.display, fontSize: 24, color: colors.navy },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
