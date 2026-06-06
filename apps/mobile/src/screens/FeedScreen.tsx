import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { theme } from '../lib/theme';
import type { NewsItem } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

export function FeedScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setNews(await api.get<NewsItem[]>('/news'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = user?.role === 'EDITOR' || user?.role === 'ADMIN';

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerBtns}>
          {canEdit && (
            <Pressable onPress={() => navigation.navigate('Upload')} hitSlop={8}>
              <Text style={styles.headerLink}>＋ Media</Text>
            </Pressable>
          )}
          <Pressable onPress={() => void logout()} hitSlop={8}>
            <Text style={styles.headerLink}>Sair</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, canEdit, logout]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={news}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.text} />}
      ListEmptyComponent={
        <Text style={styles.muted}>{error ?? 'Sem notícias publicadas ainda.'}</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('NewsDetail', { slug: item.slug, title: item.title })}
        >
          <Text style={styles.cat}>
            {item.category?.name ?? 'Geral'}
            {item.media && item.media.length > 0 ? '  ·  🎞 multimédia' : ''}
          </Text>
          <Text style={styles.title}>{item.title}</Text>
          {!!item.summary && (
            <Text style={styles.summary} numberOfLines={2}>
              {item.summary}
            </Text>
          )}
          <Text style={styles.meta}>
            {item.author?.name ?? '—'} · {item.viewCount} visualizações
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cat: { color: theme.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  title: { color: theme.text, fontSize: 18, fontWeight: '700' },
  summary: { color: theme.muted, marginTop: 6, lineHeight: 20 },
  meta: { color: theme.muted, fontSize: 12, marginTop: 10 },
  muted: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  headerBtns: { flexDirection: 'row', gap: 16 },
  headerLink: { color: theme.primary, fontWeight: '600', fontSize: 15 },
});
