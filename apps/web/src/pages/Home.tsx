import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Category, Media, NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';
import { HeroLive } from '../components/HeroLive';
import { WeatherWidget } from '../components/WeatherWidget';
import { MarketsWidget } from '../components/MarketsWidget';
import { NewsCard } from '../components/NewsCard';
import { VideoCard } from '../components/VideoCard';
import { fmtDate } from '../lib/format';

// Landing single-page (estilo Euronews): hero (ao vivo / destaque) + rail de
// widgets, grelha "bento" de destaques e secção "mais notícias" filtrável.

function videoOf(item: NewsItem): Media | undefined {
  return item.media?.find((m) => m.type === 'VIDEO');
}

function Card({ item }: { item: NewsItem }) {
  const v = videoOf(item);
  return v ? <VideoCard item={item} video={v} /> : <NewsCard item={item} />;
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
  const bento = news?.slice(1, 5) ?? [];
  const rest = useMemo(() => news?.slice(5) ?? [], [news]);
  const lower = useMemo(
    () => (cat ? (news ?? []).filter((n) => n.category?.slug === cat) : rest),
    [news, cat, rest],
  );

  if (error) return <div className="card"><ErrorState message={error} onRetry={load} /></div>;
  if (!news) return <Loading />;

  return (
    <div className="home">
      <section className="hero">
        <HeroLive featured={featured} />
        <aside className="hero-rail">
          <WeatherWidget />
          <MarketsWidget />
          <div className="widget">
            <div className="widget-h"><span>🕒 Últimas</span></div>
            <ul className="latest">
              {news.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <Link to={`/noticia/${n.slug}`}>{n.title}</Link>
                  <span className="muted small">{fmtDate(n.publishedAt ?? n.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {bento.length > 0 && (
        <section className="section">
          <h2 className="section-h">Em destaque</h2>
          <div className="bento">
            {bento.map((n) => <Card key={n.id} item={n} />)}
          </div>
        </section>
      )}

      <section className="section">
        <div className="row between section-head">
          <h2 className="section-h">{cat ? cats.find((c) => c.slug === cat)?.name ?? 'Notícias' : 'Mais notícias'}</h2>
          <div className="catfilter">
            <button className={`chip ${cat === '' ? 'sel' : ''}`} onClick={() => setCat('')}>Todas</button>
            {cats.map((c) => (
              <button key={c.id} className={`chip ${cat === c.slug ? 'sel' : ''}`} onClick={() => setCat(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        {lower.length === 0 ? (
          <p className="muted">{cat ? 'Sem notícias nesta categoria.' : 'Sem mais notícias.'}</p>
        ) : (
          <div className="grid">
            {lower.map((n) => <Card key={n.id} item={n} />)}
          </div>
        )}
      </section>
    </div>
  );
}
