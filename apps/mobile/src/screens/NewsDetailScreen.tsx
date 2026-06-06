import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { api } from '../lib/api';
import { theme } from '../lib/theme';
import type { NewsItem } from '../lib/types';
import { MediaPlayer } from '../components/MediaPlayer';
import { ListenButton } from '../components/ListenButton';

type Props = NativeStackScreenProps<RootStackParamList, 'NewsDetail'>;

export function NewsDetailScreen({ route }: Props) {
  const { slug } = route.params;
  const [news, setNews] = useState<NewsItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<NewsItem>(`/news/${slug}`)
      .then(setNews)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
  }, [slug]);

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!news) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.cat}>{news.category?.name ?? 'Geral'}</Text>
      <Text style={styles.title}>{news.title}</Text>
      <Text style={styles.meta}>
        {news.author?.name ?? '—'} · {news.viewCount} visualizações
      </Text>
      <ListenButton text={`${news.title}. ${news.summary ? news.summary + '. ' : ''}${news.body ?? ''}`} />
      {!!news.summary && <Text style={styles.lead}>{news.summary}</Text>}

      {news.body?.split('\n').map((p, i) => (
        <Text key={i} style={styles.body}>
          {p}
        </Text>
      ))}

      {news.media && news.media.length > 0 && (
        <View style={styles.mediaBlock}>
          <Text style={styles.h3}>Multimédia</Text>
          {news.media.map((m) => (
            <MediaPlayer key={m.id} mediaId={m.id} type={m.type} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  wrap: { padding: 16 },
  cat: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  title: { color: theme.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  meta: { color: theme.muted, fontSize: 12, marginTop: 6 },
  lead: { color: theme.text, fontSize: 16, fontWeight: '600', marginTop: 14, lineHeight: 22 },
  body: { color: theme.text, fontSize: 15, lineHeight: 23, marginTop: 10 },
  h3: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  mediaBlock: { marginTop: 22, borderTopColor: theme.border, borderTopWidth: 1, paddingTop: 16 },
  error: { color: theme.bad, textAlign: 'center', marginTop: 40 },
});
