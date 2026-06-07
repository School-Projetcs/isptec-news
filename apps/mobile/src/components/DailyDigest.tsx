import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';
import { useTheme, type Palette } from '../lib/theme';
import { ListenButton } from './ListenButton';
import type { NewsItem } from '../lib/types';

// "Resumo do dia" (paridade com a Web): botão flutuante que abre uma folha com o
// top de notícias (vistas + recência, via /news/digest). Tocar abre a notícia;
// "Ouvir" lê o resumo em voz alta (expo-speech).

export function DailyDigest({ onOpenNews }: { onOpenNews: (slug: string, title: string) => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openPanel() {
    setOpen(true);
    if (!items && !error) {
      api
        .get<NewsItem[]>('/news/digest')
        .then(setItems)
        .catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
    }
  }

  const digestText =
    items && items.length
      ? 'Resumo do dia. ' + items.map((n, i) => `${i + 1}. ${n.title}. ${n.summary || ''}`).join(' ')
      : '';

  return (
    <>
      <Pressable style={styles.fab} onPress={openPanel}>
        <Text style={styles.fabTxt}>🗞️ Resumo do dia</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.head}>
              <Text style={styles.title}>🗞️ Resumo do dia</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            {items && items.length > 0 && (
              <View style={styles.listen}>
                <ListenButton text={digestText} />
              </View>
            )}

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {error ? (
                <Text style={styles.err}>{error}</Text>
              ) : !items ? (
                <ActivityIndicator color={theme.primary} />
              ) : items.length === 0 ? (
                <Text style={styles.muted}>Ainda não há notícias publicadas.</Text>
              ) : (
                items.map((n, i) => (
                  <Pressable
                    key={n.id}
                    style={styles.item}
                    onPress={() => {
                      setOpen(false);
                      onOpenNews(n.slug, n.title);
                    }}
                  >
                    <Text style={styles.itemTitle}>
                      {i + 1}. {n.title}
                    </Text>
                    {!!n.summary && (
                      <Text style={styles.itemSummary} numberOfLines={2}>
                        {n.summary}
                      </Text>
                    )}
                    <Text style={styles.itemMeta}>
                      {n.category?.name ?? 'Geral'} · {n.viewCount} visualizações
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    backgroundColor: theme.primary,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTxt: { color: '#fff', fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
  },
  title: { color: theme.text, fontSize: 18, fontWeight: '800' },
  close: { color: theme.muted, fontSize: 20 },
  listen: { paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16 },
  bodyContent: { paddingVertical: 12 },
  err: { color: theme.bad },
  muted: { color: theme.muted },
  item: { paddingVertical: 12, borderBottomColor: theme.border, borderBottomWidth: 1 },
  itemTitle: { color: theme.text, fontSize: 15, fontWeight: '700' },
  itemSummary: { color: theme.muted, marginTop: 4, lineHeight: 19 },
  itemMeta: { color: theme.muted, fontSize: 12, marginTop: 6 },
  });
}
