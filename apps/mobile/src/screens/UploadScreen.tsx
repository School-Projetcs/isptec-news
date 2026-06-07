import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadForm } from '../lib/api';
import { useTheme, fmtBytes, type Palette } from '../lib/theme';
import type { CompressionReport, Media } from '../lib/types';
import { MediaPlayer } from '../components/MediaPlayer';

export function UploadScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<Media | null>(null);
  const [report, setReport] = useState<CompressionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'upload';
    const mime = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

    setBusy(true);
    setMedia(null);
    setReport(null);
    try {
      const form = new FormData();
      // No React Native, um ficheiro multipart é { uri, name, type }.
      form.append('file', { uri: asset.uri, name, type: mime } as unknown as Blob);
      const m = await uploadForm<Media>('/media', form);
      setMedia(m);
      setReport(await api.get<CompressionReport>(`/media/${m.id}/report`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no upload');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.intro}>
        Carrega uma imagem, áudio ou vídeo. A API comprime automaticamente para vários
        formatos/codecs e devolve o relatório comparativo (antes/depois).
      </Text>

      <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={pickAndUpload} disabled={busy}>
        <Text style={styles.btnText}>{busy ? 'A processar…' : '＋ Escolher e enviar media'}</Text>
      </Pressable>

      {busy && <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {report && (
        <View style={styles.result}>
          <Text style={styles.h3}>Relatório de compressão</Text>
          <Text style={styles.muted}>
            Original: {report.originalName} · {fmtBytes(report.originalSize)}
          </Text>

          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colLabel]}>variante</Text>
            <Text style={[styles.th, styles.colNum]}>tamanho</Text>
            <Text style={[styles.th, styles.colNum]}>taxa</Text>
            <Text style={[styles.th, styles.colNum]}>poupança</Text>
          </View>
          {report.variants.map((v) => (
            <View key={v.label} style={styles.tr}>
              <Text style={[styles.td, styles.colLabel]}>{v.label}</Text>
              <Text style={[styles.td, styles.colNum]}>{fmtBytes(v.size)}</Text>
              <Text style={[styles.td, styles.colNum]}>{v.compressionRatio.toFixed(2)}×</Text>
              <Text
                style={[styles.td, styles.colNum, { color: v.savingPct > 0 ? theme.good : theme.bad }]}
              >
                {v.savingPct > 0 ? `−${v.savingPct}%` : `${v.savingPct}%`}
              </Text>
            </View>
          ))}
          <Text style={styles.note}>
            Taxa = tamanho de entrada ÷ saída. <Text style={styles.code}>huffman-own</Text> é o nosso
            algoritmo (Huffman) sobre os pixels em bruto — sem perdas.
          </Text>

          {media && (
            <View style={styles.preview}>
              <Text style={styles.h3}>Reprodução (streaming)</Text>
              <MediaPlayer mediaId={media.id} type={media.type} />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
  wrap: { padding: 16 },
  intro: { color: theme.muted, lineHeight: 20, marginBottom: 16 },
  btn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: theme.bad, marginTop: 16, textAlign: 'center' },
  result: { marginTop: 24 },
  h3: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  muted: { color: theme.muted, fontSize: 13, marginBottom: 12 },
  tableHead: {
    flexDirection: 'row',
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  th: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  tr: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomColor: theme.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  td: { color: theme.text, fontSize: 13 },
  colLabel: { flex: 2 },
  colNum: { flex: 1, textAlign: 'right' },
  note: { color: theme.muted, fontSize: 12, marginTop: 12, lineHeight: 18 },
  code: { color: theme.good, fontFamily: 'monospace' },
  preview: { marginTop: 20 },
  });
}
