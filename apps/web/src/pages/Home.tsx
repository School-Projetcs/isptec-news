import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import type { Category, Media, NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';
import { WeatherWidget } from '../components/WeatherWidget';
import { MarketsWidget } from '../components/MarketsWidget';
import { LiveSection } from '../components/LiveSection';
import { NewsCard } from '../components/NewsCard';
import { VideoCard } from '../components/VideoCard';

// Landing single-page com hierarquia clara e sem duplicação:
//   Hero (1 destaque + widgets) → Últimas (carrossel) → Ao Vivo → Todas as notícias.
// Cada notícia aparece num único sítio: destaque = item 0, carrossel = 1..5, resto = "Todas".

function videoOf(item: NewsItem): Media | undefined {
  return item.media?.find((m) => m.type === 'VIDEO');
}

function Card({ item }: { item: NewsItem }) {
  const v = videoOf(item);
  return v ? <VideoCard item={item} video={v} /> : <NewsCard item={item} />;
}

function FeaturedHero({ item }: { item: NewsItem }) {
  return (
    <Link to={`/noticia/${item.slug}`} className="hero-feature">
      {item.cover ? (
        <img className="hero-media" src={`${API_BASE}/media/${item.cover.id}/raw?variant=webp-q80`} alt="" />
      ) : (
        <div className="hero-media hero-media-empty" />
      )}
      <div className="hero-overlay">
        <span className="tag new">Em destaque</span>
        <h2>{item.title}</h2>
        {item.summary && <p>{item.summary}</p>}
      </div>
    </Link>
  );
}

export function Home() {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [cat, setCat] = useState('');

  const load = () => {
    setError(null);
    setNews(null);
    api.get<NewsItem[]>('/news').then(setNews).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    api.get<Category[]>('/categories').then(setCats).catch(() => {});
  }, []);

  const featured = news?.[0] ?? null;
  const latest = news?.slice(1, 4) ?? []; // carrossel "Últimas" (até 3)
  const rest = useMemo(() => news?.slice(4) ?? [], [news]); // "Todas" = o restante (disjunto)
  // "Todas as notícias": sem filtro mostra as restantes (evita duplicar hero/carrossel);
  // com filtro mostra todas as da categoria escolhida.
  const todas = useMemo(
    () => (cat ? (news ?? []).filter((n) => n.category?.slug === cat) : rest),
    [news, cat, rest],
  );

  if (error) return <div className="card"><ErrorState message={error} onRetry={load} /></div>;
  if (!news) return <Loading />;

  return (
    <div className="home">
      {/* HERO — 1 destaque + widgets (tempo e mercados, dados reais) */}
      <section className="hero">
        {featured ? <FeaturedHero item={featured} /> : <div className="hero-empty muted">Sem notícias.</div>}
        <aside className="hero-rail">
          <WeatherWidget />
          <MarketsWidget />
        </aside>
      </section>

      {/* ÚLTIMAS — carrossel horizontal */}
      {latest.length > 0 && (
        <section className="section">
          <h2 className="section-h">Últimas</h2>
          <div className="carousel">
            {latest.map((n) => (
              <div className="carousel-item" key={n.id}>
                <Card item={n} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AO VIVO — secção própria (fonte única: /stream/live/status) */}
      <section className="section">
        <h2 className="section-h">Ao Vivo</h2>
        <LiveSection />
      </section>

      {/* TODAS AS NOTÍCIAS — consolidadas + filtro por categoria */}
      <section className="section">
        <div className="row between section-head">
          <h2 className="section-h">{cat ? cats.find((c) => c.slug === cat)?.name ?? 'Notícias' : 'Todas as notícias'}</h2>
          <div className="catfilter">
            <button className={`chip ${cat === '' ? 'sel' : ''}`} onClick={() => setCat('')}>Todas</button>
            {cats.map((c) => (
              <button key={c.id} className={`chip ${cat === c.slug ? 'sel' : ''}`} onClick={() => setCat(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        {todas.length === 0 ? (
          <p className="muted">{cat ? 'Sem notícias nesta categoria.' : 'Sem mais notícias.'}</p>
        ) : (
          <div className="grid">
            {todas.map((n) => <Card key={n.id} item={n} />)}
          </div>
        )}
      </section>
    </div>
  );
}
