import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { theme } from '../lib/theme';

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@isptec.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>📰 ISPTEC News</Text>
        <Text style={styles.sub}>
          {mode === 'login' ? 'Entrar na tua conta' : 'Criar conta nova'}
        </Text>

        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Nome"
            placeholderTextColor={theme.muted}
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Palavra-passe"
          placeholderTextColor={theme.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={submit} disabled={busy}>
          <Text style={styles.btnText}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Registar'}
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={styles.toggle}>
            {mode === 'login' ? 'Não tens conta? Regista-te' : 'Já tens conta? Entrar'}
          </Text>
        </Pressable>

        <Text style={styles.hint}>Demo: admin@isptec.local / admin123</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  logo: { color: theme.text, fontSize: 30, fontWeight: '800', textAlign: 'center' },
  sub: { color: theme.muted, textAlign: 'center', marginBottom: 12 },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 16,
  },
  btn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggle: { color: theme.primary, textAlign: 'center', marginTop: 8 },
  error: { color: theme.bad, textAlign: 'center' },
  hint: { color: theme.muted, textAlign: 'center', fontSize: 12, marginTop: 16 },
});
