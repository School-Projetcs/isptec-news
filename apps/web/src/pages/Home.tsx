import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import type { Category, Media, NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';
import { fmtDate } from '../lib/format';
import { WeatherWidget } from '../components/WeatherWidget';
import { MarketsWidget } from '../components/MarketsWidget';
import { LiveSection } from '../components/LiveSection';
import { NewsCard } from '../components/NewsCard';
import { VideoCard } from '../components/VideoCard';

// Landing single-page com hierarquia clara:
//   Hero (1 destaque, só título) + widgets → Últimas (2 itens + "Ver mais") →
//   Live (card único) → Todas as notícias (lista completa, filtrável).
// "Todas" mostra SEMPRE todo o acervo (nunca vazio se houver dados); o filtro por
// categoria restringe; "Todas" repõe o conjunto completo.

function videoOf(item: NewsItem): Media | undefined {
  return item.media?.find((m) => m.type === 'VIDEO');
}

function Card({ item }: { item: NewsItem }) {
  const v = videoOf(item);
  return v ? <VideoCard item={item} video={v} /> : <NewsCard item={item} />;
}

// Hero: UM único card em destaque, com foco visual único — apenas o TÍTULO
// (mais a label discreta "Em destaque"). Sem descrições nem metadata.
function FeaturedHero({ item }: { item: NewsItem }) {
  return (
    <Link to={`/noticia/${item.slug}`} className="hero-feature">
      {item.cover ? (
        <img className="hero-media" src={`${API_BASE}/media/${item.cover.id}/raw?variant=webp-q80`} alt="" />
      ) : (
        <div className="hero-media hero-media-empty" />
      )}
      <span className="hero-kicker">Em destaque</span>
      <div className="hero-overlay">
        <h2>{item.title}</h2>
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
  const latest = news?.slice(1, 3) ?? []; // "Últimas notícias": no máximo 2 itens

  // "Todas as notícias": sem categoria → TODO o acervo (nunca vazio se houver dados);
  // com categoria → filtra. Fallback de segurança: se o filtro não casar nada mas
  // existirem notícias, repõe a lista completa em vez de mostrar vazio.
  const todas = useMemo(() => {
    const all = news ?? [];
    if (!cat) return all;
    const filtered = all.filter((n) => n.category?.slug === cat);
    return filtered.length > 0 ? filtered : all;
  }, [news, cat]);

  const scrollToAll = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('todas-noticias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (error) return <div className="card"><ErrorState message={error} onRetry={load} /></div>;
  if (!news) return <Loading />;

  return (
    <div className="home">
      {/* HERO — 1 destaque (só título) + widgets (tempo e mercados, dados reais) */}
      <section className="hero">
        {featured ? <FeaturedHero item={featured} /> : <div className="hero-empty muted">Sem notícias.</div>}
        <aside className="hero-rail">
          <WeatherWidget />
          <MarketsWidget />
        </aside>
      </section>

      {/* ÚLTIMAS NOTÍCIAS — máx. 2 itens, texto leve + "Ver mais" (scroll suave) */}
      {latest.length > 0 && (
        <section className="section">
          <div className="row between section-head">
            <h2 className="section-h subtle">Últimas notícias</h2>
            <a className="seemore" href="#todas-noticias" onClick={scrollToAll}>Ver mais →</a>
          </div>
          <ul className="latest">
            {latest.map((n) => (
              <li key={n.id}>
                <Link to={`/noticia/${n.slug}`} className="latest-link">
                  <span className="latest-title">{n.title}</span>
                  <time className="latest-date">{fmtDate(n.publishedAt ?? n.createdAt)}</time>
                </Link>
                {n.summary && <p className="latest-snippet">{n.summary}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* LIVE — card único (sem título de secção); fonte única /stream/live/status */}
      <section className="section">
        <LiveSection />
      </section>

      {/* TODAS AS NOTÍCIAS — lista completa + filtro por categoria (alvo do "Ver mais") */}
      <section className="section" id="todas-noticias">
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
          <p className="muted">Ainda não há notícias publicadas.</p>
        ) : (
          <div className="grid">
            {todas.map((n) => <Card key={n.id} item={n} />)}
          </div>
        )}
      </section>
    </div>
  );
}
