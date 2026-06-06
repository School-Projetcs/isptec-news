import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { mediaUrl } from '../lib/api';
import { theme } from '../lib/theme';

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
 */
export function MediaPlayer({ mediaId, type }: Props) {
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

      {type === 'VIDEO' && (
        <Video
          source={{ uri }}
          style={styles.media}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          usePoster
          posterSource={{ uri: mediaUrl(mediaId, 'thumbnail') }}
        />
      )}

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

function AudioControl({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) void sound.unloadAsync();
    };
  }, [sound]);

  async function toggle() {
    if (!sound) {
      const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      s.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded) setPlaying(st.isPlaying);
      });
      setSound(s);
      setPlaying(true);
      return;
    }
    if (playing) await sound.pauseAsync();
    else await sound.playAsync();
  }

  return (
    <Pressable onPress={toggle} style={styles.audioBtn}>
      <Text style={styles.audioBtnText}>{playing ? '⏸  Pausar' : '▶  Reproduzir áudio'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
