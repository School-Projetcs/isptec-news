import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { LiveMode, LiveStatus } from '@isptec/shared';
import { streamUrl } from '../lib/api';
import { useLiveStatus } from '../lib/useLiveStatus';
import { useTheme, type Palette } from '../lib/theme';
import { LiveBadge } from '../components/LiveBadge';

// Ecrã "Ao Vivo" — apenas visualização. Sonda o estado da emissão e, quando há sinal,
// reproduz o HLS (`/stream/hls/<key>/index.m3u8`) com o expo-video, que suporta HLS
// nativamente. Transmitir continua a fazer-se pelo browser (/transmitir, via QR) — o
// mobile é o ecrã de quem assiste.

const MODE_LABEL: Record<LiveMode, string> = {
  camera: 'Câmara', file: 'Ficheiro de vídeo', simulated: 'Simulada', rtmp: 'RTMP', offline: 'Offline',
};

export function LiveScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const status = useLiveStatus(4000);
  const live = !!status?.live;

  return (
    <View style={styles.container}>
      {live ? (
        <LivePlayer status={status} styles={styles} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📡</Text>
          <LiveBadge label="FORA DO AR" dim />
          <Text style={styles.emptyTitle}>Sem emissão ao vivo</Text>
          <Text style={styles.emptyText}>
            Quando a redação da ISPTEC News entrar no ar, a transmissão aparece aqui automaticamente.
          </Text>
        </View>
      )}
    </View>
  );
}

function LivePlayer({ status, styles }: { status: LiveStatus; styles: Styles }) {
  const uri = streamUrl(status.hlsUrl);
  const player = useVideoPlayer(uri, (p) => { p.loop = false; p.play(); });

  // Cronómetro "no ar há…": atualiza a cada segundo a partir de startedAt.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = status.startedAt ? fmtElapsed(now - status.startedAt) : null;

  return (
    <View>
      <View style={styles.videoWrap}>
        <VideoView style={styles.video} player={player} contentFit="contain" nativeControls allowsFullscreen />
        <View style={styles.badgeOver}>
          <LiveBadge />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Emissão ISPTEC News</Text>
        <Text style={styles.infoMeta}>
          Fonte: {MODE_LABEL[status.mode] ?? status.mode}
          {elapsed ? `  ·  no ar há ${elapsed}` : ''}
        </Text>
        <Text style={styles.hint}>
          Transmite a partir do computador ou do telemóvel pelo painel da web (Iniciar transmissão).
        </Text>
      </View>
    </View>
  );
}

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    videoWrap: { position: 'relative', width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
    video: { width: '100%', height: '100%' },
    badgeOver: { position: 'absolute', top: 12, left: 12 },
    info: { padding: 16, gap: 6 },
    infoTitle: { color: theme.ink, fontSize: 20, fontWeight: '800' },
    infoMeta: { color: theme.muted, fontSize: 13 },
    hint: { color: theme.muted, fontSize: 12, marginTop: 8, lineHeight: 18 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    emptyIcon: { fontSize: 52, marginBottom: 4 },
    emptyTitle: { color: theme.ink, fontSize: 20, fontWeight: '800', marginTop: 4 },
    emptyText: { color: theme.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  });
}
