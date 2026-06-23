import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { api, mediaUrl } from '../lib/api';
import { useTheme, type Palette } from '../lib/theme';
import type { NewsItem } from '../lib/types';
import { MediaPlayer } from '../components/MediaPlayer';
import { ListenButton } from '../components/ListenButton';
import { Comments } from '../components/Comments';
import { shareNews } from '../lib/share';
import { useSaved } from '../lib/saved';
import { fmtRelative } from '../lib/format';

type Props = NativeStackScreenProps<RootStackParamList, 'NewsDetail'>;

export function NewsDetailScreen({ route }: Props) {
  const { slug } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { isSaved, toggle } = useSaved();
  const scrollRef = useRef<ScrollView>(null);
  const commentsY = useRef(0);

  // Ao focar o input de comentário, traz a secção para cima do teclado (no mobile o
  // teclado tapava o campo, impedindo ver o que se escrevia).
  const focusComments = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, commentsY.current - 12), animated: true }), 150);
  };

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.cat}>{news.category?.name ?? 'Geral'}</Text>
        <Text style={styles.title}>{news.title}</Text>
        <Text style={styles.meta}>
          {fmtRelative(news.publishedAt ?? news.createdAt)} · {news.viewCount} visualizações
        </Text>
        {news.cover && (
          <Image source={{ uri: mediaUrl(news.cover.id, 'webp-q80') }} style={styles.hero} />
        )}
        <View style={styles.actions}>
          <ListenButton text={`${news.title}. ${news.summary ? news.summary + '. ' : ''}${news.body ?? ''}`} />
          <Pressable style={styles.shareBtn} onPress={() => { void shareNews(news); }}>
            <Text style={styles.shareTxt}>🔗 Partilhar</Text>
          </Pressable>
          <Pressable
            style={[styles.shareBtn, isSaved(news.id) && styles.saveBtnOn]}
            onPress={() => { void toggle(news); }}
          >
            <Text style={[styles.shareTxt, isSaved(news.id) && styles.saveTxtOn]}>
              {isSaved(news.id) ? '🔖 Guardado' : '🔖 Guardar'}
            </Text>
          </Pressable>
        </View>
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

        <Comments
          slug={news.slug}
          onLayoutY={(y) => { commentsY.current = y; }}
          onInputFocus={focusComments}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  wrap: { padding: 16, paddingBottom: 48 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  shareBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  shareTxt: { color: theme.text, fontWeight: '600', fontSize: 14 },
  saveBtnOn: { borderColor: theme.primary, backgroundColor: theme.surface },
  saveTxtOn: { color: theme.primary, fontWeight: '800' },
  cat: { color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { color: theme.ink, fontSize: 25, fontWeight: '800', marginTop: 4, lineHeight: 30 },
  meta: { color: theme.muted, fontSize: 12, marginTop: 6 },
  hero: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginTop: 14, backgroundColor: theme.surface },
  lead: { color: theme.text, fontSize: 16, fontWeight: '600', marginTop: 14, lineHeight: 22 },
  body: { color: theme.text, fontSize: 15, lineHeight: 23, marginTop: 10 },
  h3: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  mediaBlock: { marginTop: 22, borderTopColor: theme.border, borderTopWidth: 1, paddingTop: 16 },
  error: { color: theme.bad, textAlign: 'center', marginTop: 40 },
  });
}
