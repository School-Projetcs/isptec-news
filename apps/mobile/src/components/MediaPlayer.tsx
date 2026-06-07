import { useMemo, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { mediaUrl } from '../lib/api';
import { useTheme, type Palette } from '../lib/theme';

type Props = {
  mediaId: string;
  type: 'IMAGE' | 'AUDIO' | 'VIDEO';
};

const DEFAULT_VARIANT: Record<Props['type'], string> = {
  IMAGE: 'webp-q80',
  AUDIO: 'mp3-128k',
  VIDEO: 'h264-720p',
};

/**
 * Reprodução por STREAMING (VOD): o URL aponta para /media/:id/raw, servido com
 * HTTP Range — o leitor faz seek real. Botão "Guardar offline" descarrega a variante
 * para o dispositivo e passa a reproduzir a partir do ficheiro local.
 *
 * SDK 54: vídeo via `expo-video` (useVideoPlayer/VideoView), áudio via `expo-audio`
 * (useAudioPlayer) — o antigo `expo-av` foi removido. Download offline usa a API
 * legacy de `expo-file-system` (documentDirectory/downloadAsync).
 */
export function MediaPlayer({ mediaId, type }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const variant = DEFAULT_VARIANT[type];
  const remoteUri = mediaUrl(mediaId, variant);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const uri = localUri ?? remoteUri;

  async function saveOffline() {
    try {
      setDownloading(true);
      const ext = variant.includes('webp') ? 'webp' : type === 'AUDIO' ? 'mp3' : 'mp4';
      const target = `${FileSystem.documentDirectory}offline-${mediaId}-${variant}.${ext}`;
      const res = await FileSystem.downloadAsync(remoteUri, target);
      setLocalUri(res.uri);
    } catch {
      // silencioso: mantém a reprodução remota
    } finally {
      setDownloading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {type === 'IMAGE' && <Image source={{ uri }} style={styles.media} resizeMode="contain" />}
      {type === 'VIDEO' && <VideoControl uri={uri} style={styles.media} />}
      {type === 'AUDIO' && <AudioControl uri={uri} />}

      <View style={styles.row}>
        <Text style={styles.tag}>{localUri ? '⤓ offline' : '⇄ streaming'}</Text>
        {!localUri && (
          <Pressable onPress={saveOffline} disabled={downloading} style={styles.btn}>
            {downloading ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <Text style={styles.btnText}>Guardar offline</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function VideoControl({ uri, style }: { uri: string; style: object }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView style={style} player={player} contentFit="contain" nativeControls allowsFullscreen />;
}

function AudioControl({ uri }: { uri: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;

  function toggle() {
    if (playing) player.pause();
    else player.play();
  }

  return (
    <Pressable onPress={toggle} style={styles.audioBtn}>
      <Text style={styles.audioBtnText}>{playing ? '⏸  Pausar' : '▶  Reproduzir áudio'}</Text>
    </Pressable>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
    wrap: { marginVertical: 8 },
    media: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#000',
      borderRadius: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    tag: { color: theme.muted, fontSize: 12 },
    btn: {
      backgroundColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    btnText: { color: theme.text, fontSize: 12, fontWeight: '600' },
    audioBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    audioBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
