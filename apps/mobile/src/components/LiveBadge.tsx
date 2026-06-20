import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Palette } from '../lib/theme';

// Selo "AO VIVO" (ponto + texto). Usado no card de live do Feed e sobre o vídeo da
// emissão. `dim` mostra o estado "fora do ar" em tom neutro.
export function LiveBadge({ label = 'AO VIVO', dim = false }: { label?: string; dim?: boolean }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={[styles.badge, dim && styles.badgeDim]}>
      <View style={[styles.dot, dim && styles.dotDim]} />
      <Text style={[styles.txt, dim && styles.txtDim]}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.live,
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    badgeDim: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
    dotDim: { backgroundColor: theme.muted },
    txt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    txtDim: { color: theme.muted },
  });
}
