import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Role } from '@isptec/shared';
import type { RootStackParamList, TabParamList } from '../App';
import { useAuth } from '../lib/auth';
import { useTheme, type Palette, type ThemeChoice } from '../lib/theme';

// Ecrã "Conta" — centraliza o que antes estava espalhado no cabeçalho do Feed:
// perfil, escolha de tema (3 modos, paridade com a web), ações de editor/admin e sair.

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Conta'>,
  NativeStackScreenProps<RootStackParamList>
>;

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Administrador', EDITOR: 'Editor', READER: 'Leitor' };
const THEME_OPTS: { id: ThemeChoice; icon: string; label: string }[] = [
  { id: 'system', icon: '◐', label: 'Sistema' },
  { id: 'light', icon: '☀', label: 'Claro' },
  { id: 'dark', icon: '☾', label: 'Escuro' },
];

export function AccountScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { theme, choice, setChoice } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const canEdit = user?.role === 'EDITOR' || user?.role === 'ADMIN';
  const initials = (user?.name ?? '?').trim().slice(0, 1).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Perfil */}
      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name ?? '—'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>
        {user && <View style={styles.roleBadge}><Text style={styles.roleTxt}>{ROLE_LABEL[user.role]}</Text></View>}
      </View>

      {/* Tema */}
      <Text style={styles.section}>Aparência</Text>
      <View style={styles.segment}>
        {THEME_OPTS.map((o) => {
          const active = choice === o.id;
          return (
            <Pressable key={o.id} style={[styles.segBtn, active && styles.segBtnActive]} onPress={() => setChoice(o.id)}>
              <Text style={[styles.segTxt, active && styles.segTxtActive]}>{o.icon}  {o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Ações de editor/admin */}
      {canEdit && (
        <>
          <Text style={styles.section}>Redação</Text>
          <Pressable style={styles.rowBtn} onPress={() => navigation.navigate('Upload')}>
            <Text style={styles.rowBtnTxt}>🎞  Media · Compressão</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        </>
      )}

      {/* Sair */}
      <Pressable style={styles.logout} onPress={() => void logout()}>
        <Text style={styles.logoutTxt}>Terminar sessão</Text>
      </Pressable>

      <Text style={styles.footer}>ISPTEC News · Multimédia 2026</Text>
    </ScrollView>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 16, gap: 8 },
    profile: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: 16,
    },
    avatar: {
      width: 52, height: 52, borderRadius: 26, backgroundColor: theme.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarTxt: { color: '#fff', fontSize: 22, fontWeight: '800' },
    profileInfo: { flex: 1 },
    name: { color: theme.ink, fontSize: 17, fontWeight: '800' },
    email: { color: theme.muted, fontSize: 13, marginTop: 2 },
    roleBadge: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
    roleTxt: { color: theme.muted, fontSize: 11, fontWeight: '700' },
    section: { color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 18, marginBottom: 2 },
    segment: { flexDirection: 'row', gap: 8 },
    segBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10,
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
    },
    segBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    segTxt: { color: theme.text, fontWeight: '700', fontSize: 13 },
    segTxtActive: { color: '#fff' },
    rowBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 16,
    },
    rowBtnTxt: { color: theme.text, fontSize: 15, fontWeight: '600' },
    rowChevron: { color: theme.muted, fontSize: 22, fontWeight: '700' },
    logout: {
      marginTop: 24, borderColor: theme.bad, borderWidth: 1, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    logoutTxt: { color: theme.bad, fontWeight: '700', fontSize: 15 },
    footer: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 24 },
  });
}
