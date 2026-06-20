import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme, type Palette } from '../lib/theme';
import type { Comment } from '../lib/types';

// Comentários no detalhe (paridade com a Web). No mobile o utilizador está sempre
// autenticado nas telas internas, por isso o formulário aparece sempre; eliminar
// só para o autor (ou admin).

function fmt(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  );
}

export function Comments({
  slug,
  onLayoutY,
  onInputFocus,
}: {
  slug: string;
  /** Reporta a posição vertical da secção dentro do ScrollView pai (p/ revelar o input). */
  onLayoutY?: (y: number) => void;
  /** Chamado quando o input ganha foco (o pai faz scroll para o trazer acima do teclado). */
  onInputFocus?: () => void;
}) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Comment[]>(`/news/${slug}/comments`)
      .then(setComments)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/news/${slug}/comments`, { body: body.trim() });
      setBody('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao comentar');
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    Alert.alert('Eliminar comentário', 'Queres eliminar este comentário?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/comments/${id}`);
            load();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro ao eliminar');
          }
        },
      },
    ]);
  }

  const count = comments?.length ?? 0;

  return (
    <View style={styles.wrap} onLayout={(e) => onLayoutY?.(e.nativeEvent.layout.y)}>
      <Text style={styles.h3}>Comentários{count ? ` (${count})` : ''}</Text>

      {user && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Escreve um comentário…"
            placeholderTextColor={theme.muted}
            value={body}
            onChangeText={setBody}
            onFocus={onInputFocus}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[styles.btn, (busy || !body.trim()) && styles.btnOff]}
            disabled={busy || !body.trim()}
            onPress={submit}
          >
            <Text style={styles.btnTxt}>{busy ? 'A enviar…' : 'Comentar'}</Text>
          </Pressable>
        </View>
      )}

      {!!error && <Text style={styles.err}>{error}</Text>}

      {!comments ? (
        <ActivityIndicator color={theme.primary} />
      ) : comments.length === 0 ? (
        <Text style={styles.muted}>Ainda não há comentários. Sê o primeiro.</Text>
      ) : (
        comments.map((c) => {
          const canDelete = !!user && (user.id === c.user.id || user.role === 'ADMIN');
          return (
            <View key={c.id} style={styles.comment}>
              <View style={styles.cHead}>
                <Text style={styles.cAuthor}>{c.user.name}</Text>
                <Text style={styles.cDate}>{fmt(c.createdAt)}</Text>
              </View>
              <Text style={styles.cBody}>{c.body}</Text>
              {canDelete && (
                <Pressable onPress={() => remove(c.id)} hitSlop={8}>
                  <Text style={styles.del}>Eliminar</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
  wrap: { marginTop: 24, borderTopColor: theme.border, borderTopWidth: 1, paddingTop: 16 },
  h3: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  form: { marginBottom: 16, gap: 8 },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    color: theme.text,
    padding: 10,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  btn: { alignSelf: 'flex-start', backgroundColor: theme.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  btnOff: { opacity: 0.5 },
  btnTxt: { color: '#fff', fontWeight: '700' },
  err: { color: theme.bad, marginBottom: 10 },
  muted: { color: theme.muted },
  comment: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  cHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cAuthor: { color: theme.text, fontWeight: '700' },
  cDate: { color: theme.muted, fontSize: 12 },
  cBody: { color: theme.text, lineHeight: 20 },
  del: { color: theme.bad, marginTop: 8, fontSize: 13 },
  });
}
