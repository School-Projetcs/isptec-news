import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeChoice, type Palette } from '../lib/theme';

// Botão compacto do cabeçalho (paridade com a Web): avança sistema → claro →
// escuro → sistema. O ícone + nome refletem a escolha atual. O default é "sistema".

const ICON: Record<ThemeChoice, string> = { system: '◐', light: '☀', dark: '☾' };
const NAME: Record<ThemeChoice, string> = { system: 'Sistema', light: 'Claro', dark: 'Escuro' };

export function ThemeToggle() {
  const { choice, cycle, theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <Pressable
      onPress={cycle}
      hitSlop={8}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={`Tema: ${NAME[choice]}. Tocar para alternar.`}
    >
      <Text style={styles.txt}>
        {ICON[choice]} {NAME[choice]}
      </Text>
    </Pressable>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
    btn: { paddingVertical: 4, paddingHorizontal: 2 },
    txt: { color: theme.primary, fontWeight: '700', fontSize: 14 },
  });
}
