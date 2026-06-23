import { Link } from 'react-router-dom';
import type { NewsItem } from '../types';
import { fmtRelative, isRecent, metaLine, readingMinutes } from '../lib/format';
import { imageThumbSrc } from '../lib/media';
import { CardActions } from './CardActions';

// Card de notícia reutilizável (feed/landing). Image-forward, com metadados.

export function NewsCard({ item }: { item: NewsItem }) {
  const when = item.publishedAt ?? item.createdAt;
  const mins = readingMinutes(item.body ?? item.summary);
  return (
    <Link to={`/noticia/${item.slug}`} className="newscard">
      <CardActions news={item} />
      {item.cover && (
        <div className="thumbwrap">
          <img
            className="thumb"
            src={imageThumbSrc(item.cover.id)}
            alt=""
            loading="lazy"
          />
          {isRecent(when) && <span className="tag new floating">Recente</span>}
        </div>
      )}
      <div className="cardmeta-top">
        <span className="tag">{item.category?.name ?? 'Geral'}</span>
        {!item.cover && isRecent(when) && <span className="tag new">Recente</span>}
      </div>
      <h3>{item.title}</h3>
      <p className="muted">{item.summary || '—'}</p>
      <p className="meta">
        {metaLine([fmtRelative(when), mins > 0 && `${mins} min`, `${item.viewCount} visualizações`])}
      </p>
    </Link>
  );
}
