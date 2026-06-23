import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PublicUser } from '@isptec/shared';
import type { RootStackParamList } from '../App';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme, type Palette } from '../lib/theme';

// Gestão de perfil no Mobile: editar nome/email e alterar palavra-passe.
// Liga a PATCH /auth/me e POST /auth/change-password (paridade com a Web).

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen(_props: Props) {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const updated = await api.patch<PublicUser>('/auth/me', { name, email });
      updateUser(updated);
      Alert.alert('Perfil', 'Perfil atualizado.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível guardar.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'A confirmação não coincide.');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Palavra-passe', 'Palavra-passe alterada.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível alterar.');
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Dados do perfil</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Nome</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={theme.muted} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={theme.muted}
        />
      </View>
      <Pressable style={[styles.btn, savingProfile && styles.btnOff]} disabled={savingProfile} onPress={saveProfile}>
        <Text style={styles.btnTxt}>{savingProfile ? 'A guardar…' : 'Guardar alterações'}</Text>
      </Pressable>

      <Text style={styles.section}>Alterar palavra-passe</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Palavra-passe atual</Text>
        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholderTextColor={theme.muted} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Nova palavra-passe</Text>
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholderTextColor={theme.muted} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Confirmar nova palavra-passe</Text>
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor={theme.muted} />
      </View>
      <Pressable style={[styles.btn, savingPw && styles.btnOff]} disabled={savingPw} onPress={changePassword}>
        <Text style={styles.btnTxt}>{savingPw ? 'A alterar…' : 'Alterar palavra-passe'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 16, gap: 10 },
    section: { color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 2 },
    field: { gap: 4 },
    label: { color: theme.muted, fontSize: 13, fontWeight: '600' },
    input: {
      backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, color: theme.ink, fontSize: 15,
    },
    btn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
    btnOff: { opacity: 0.6 },
    btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  });
}
