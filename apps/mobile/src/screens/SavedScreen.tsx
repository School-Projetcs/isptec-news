import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { api, mediaUrl } from '../lib/api';
import { useTheme, type Palette } from '../lib/theme';
import { useSaved } from '../lib/saved';
import type { NewsItem } from '../lib/types';

// Vista "Guardadas" — notícias que o utilizador guardou (server-side, por conta).
// Recarrega sempre que o conjunto de guardadas muda (guardar/remover noutro sítio).

type Props = NativeStackScreenProps<RootStackParamList, 'Saved'>;

export function SavedScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { version } = useSaved();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.get<NewsItem[]>('/news/saved').then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.text} />}
      ListEmptyComponent={
        <Text style={styles.muted}>Ainda não guardaste nenhuma notícia. Usa o 🔖 nos cards ou no detalhe.</Text>
      }
      renderItem={({ item }) => {
        const cover = item.cover ? mediaUrl(item.cover.id, 'webp-q80') : null;
        return (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('NewsDetail', { slug: item.slug, title: item.title })}
          >
            {cover && <Image source={{ uri: cover }} style={styles.cover} />}
            <View style={styles.cardBody}>
              <Text style={styles.cat}>{item.category?.name ?? 'Geral'}</Text>
              <Text style={styles.title}>{item.title}</Text>
              {!!item.summary && (
                <Text style={styles.summary} numberOfLines={2}>
                  {item.summary}
                </Text>
              )}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    list: { padding: 16, gap: 12 },
    card: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
    cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: theme.surface },
    cardBody: { padding: 14 },
    cat: { color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
    title: { color: theme.ink, fontSize: 18, fontWeight: '800', lineHeight: 23 },
    summary: { color: theme.muted, marginTop: 6, lineHeight: 20 },
    muted: { color: theme.muted, textAlign: 'center', marginTop: 40 },
    error: { color: theme.bad, textAlign: 'center', marginTop: 40 },
  });
}
