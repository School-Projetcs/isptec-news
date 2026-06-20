import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import { api, mediaUrl } from '../lib/api';
import { useTheme, type Palette } from '../lib/theme';
import { useLiveStatus } from '../lib/useLiveStatus';
import { useSaved } from '../lib/saved';
import { shareNews } from '../lib/share';
import type { Category, NewsItem } from '../lib/types';
import { DailyDigest } from '../components/DailyDigest';
import { LiveBadge } from '../components/LiveBadge';

type Styles = ReturnType<typeof makeStyles>;

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
    </Pressable>
  );
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Feed'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function FeedScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const status = useLiveStatus(8000);
  const live = !!status?.live;
  const { isSaved, toggle } = useSaved();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [cat, setCat] = useState(''); // slug ativo ('' = todas)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (c = '') => {
    try {
      setError(null);
      setCat(c);
      setNews(await api.get<NewsItem[]>(`/news${c ? `?category=${encodeURIComponent(c)}` : ''}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    api.get<Category[]>('/categories').then(setCats).catch(() => {});
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={news}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(cat)} tintColor={theme.text} />}
        ListHeaderComponent={
          <>
            {live && (
              <Pressable style={styles.liveCard} onPress={() => navigation.navigate('AoVivo')}>
                <LiveBadge />
                <View style={styles.liveBody}>
                  <Text style={styles.liveTitle}>Emissão ao vivo agora</Text>
                  <Text style={styles.liveSub}>Toca para assistir à transmissão</Text>
                </View>
                <Text style={styles.liveChevron}>›</Text>
              </Pressable>
            )}
            {cats.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                <Chip label="Todas" active={cat === ''} onPress={() => load('')} styles={styles} />
                {cats.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    active={cat === c.slug}
                    onPress={() => load(c.slug)}
                    styles={styles}
                  />
                ))}
              </ScrollView>
            )}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.muted}>
            {error ?? (cat ? 'Sem notícias nesta categoria.' : 'Sem notícias publicadas ainda.')}
          </Text>
        }
        renderItem={({ item, index }) => {
          const cover = item.cover ? mediaUrl(item.cover.id, 'webp-q80') : null;
          const featured = index === 0 && !cat;
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('NewsDetail', { slug: item.slug, title: item.title })}
            >
              {cover && <Image source={{ uri: cover }} style={featured ? styles.coverFeatured : styles.cover} />}
              <View style={styles.cardBody}>
                <Text style={styles.cat}>
                  {item.category?.name ?? 'Geral'}
                  {item.media && item.media.length > 0 ? '  ·  🎞 multimédia' : ''}
                </Text>
                <Text style={[styles.title, featured && styles.titleFeatured]}>{item.title}</Text>
                {!!item.summary && (
                  <Text style={styles.summary} numberOfLines={featured ? 3 : 2}>
                    {item.summary}
                  </Text>
                )}
                <Text style={styles.meta}>
                  {item.author?.name ?? '—'} · {item.viewCount} visualizações
                </Text>
                <View style={styles.cardActions}>
                  <Pressable hitSlop={6} style={styles.cardActionBtn} onPress={() => { void shareNews(item); }}>
                    <Text style={styles.cardActionTxt}>🔗 Partilhar</Text>
                  </Pressable>
                  <Pressable hitSlop={6} style={styles.cardActionBtn} onPress={() => { void toggle(item); }}>
                    <Text style={[styles.cardActionTxt, isSaved(item.id) && styles.cardActionOn]}>
                      {isSaved(item.id) ? '🔖 Guardado' : '🔖 Guardar'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
      <DailyDigest onOpenNews={(slug, title) => navigation.navigate('NewsDetail', { slug, title })} />
    </View>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  list: { padding: 16, gap: 12 },
  liveCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
    backgroundColor: theme.card, borderColor: theme.live, borderWidth: 1, borderRadius: 14, padding: 14,
  },
  liveBody: { flex: 1 },
  liveTitle: { color: theme.ink, fontSize: 15, fontWeight: '800', marginTop: 2 },
  liveSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  liveChevron: { color: theme.live, fontSize: 24, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  chip: { borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: theme.surface },
  chipActive: { borderColor: theme.primary, backgroundColor: theme.primary },
  chipTxt: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  chipTxtActive: { color: '#fff' },
  card: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: theme.surface },
  coverFeatured: { width: '100%', aspectRatio: 16 / 10, backgroundColor: theme.surface },
  cardBody: { padding: 14 },
  cat: { color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  title: { color: theme.ink, fontSize: 18, fontWeight: '800', lineHeight: 23 },
  titleFeatured: { fontSize: 22, lineHeight: 27 },
  summary: { color: theme.muted, marginTop: 6, lineHeight: 20 },
  meta: { color: theme.muted, fontSize: 12, marginTop: 10 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12, borderTopColor: theme.border, borderTopWidth: 1, paddingTop: 10 },
  cardActionBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  cardActionTxt: { color: theme.text, fontSize: 13, fontWeight: '600' },
  cardActionOn: { color: theme.primary, fontWeight: '800' },
  muted: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  });
}
