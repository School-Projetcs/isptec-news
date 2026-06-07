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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { api, mediaUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme, type Palette } from '../lib/theme';
import type { Category, NewsItem } from '../lib/types';
import { DailyDigest } from '../components/DailyDigest';
import { ThemeToggle } from '../components/ThemeToggle';

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

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

export function FeedScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  const canEdit = user?.role === 'EDITOR' || user?.role === 'ADMIN';

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <ThemeToggle />,
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
    <View style={styles.container}>
      <FlatList
        data={news}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(cat)} tintColor={theme.text} />}
        ListHeaderComponent={
          cats.length > 0 ? (
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
          ) : null
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
  muted: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  headerBtns: { flexDirection: 'row', gap: 16 },
  headerLink: { color: theme.primary, fontWeight: '700', fontSize: 15 },
  });
}
