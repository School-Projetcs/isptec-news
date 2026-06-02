import { useEffect, useState, type FormEvent } from 'react';
import { api, uploadForm } from '../lib/api';
import type { CompressionReport, Media, NewsItem } from '../types';

const fmtBytes = (n: number) =>
  n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : (n / 1024).toFixed(1) + ' KB';

export function MediaLab() {
  const [file, setFile] = useState<File | null>(null);
  const [newsId, setNewsId] = useState('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [media, setMedia] = useState<Media | null>(null);
  const [report, setReport] = useState<CompressionReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<NewsItem[]>('/news/manage/all').then(setNews).catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setMedia(null);
    setReport(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (newsId) form.append('newsId', newsId);
      const m = await uploadForm<Media>('/media', form);
      setMedia(m);
      const r = await api.get<CompressionReport>(`/media/${m.id}/report`);
      setReport(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h1>Laboratório de Media &amp; Compressão</h1>
        <p className="muted">
          Carrega uma imagem, áudio ou vídeo. A API comprime automaticamente para vários
          formatos/codecs e apresenta o relatório comparativo (antes/depois).
        </p>
        <form onSubmit={submit} className="form">
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label>
            Associar a uma notícia (opcional)
            <select value={newsId} onChange={(e) => setNewsId(e.target.value)}>
              <option value="">— não associar —</option>
              {news.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button disabled={busy || !file} type="submit">
              {busy ? 'A processar…' : 'Carregar e comprimir'}
            </button>
          </div>
        </form>
        {error && <p className="bad">{error}</p>}
        {busy && <p className="muted">A comprimir/transcodificar no servidor… (vídeo pode demorar)</p>}
      </div>

      {media && report && (
        <div className="card">
          <h2>Relatório de compressão — {report.originalName}</h2>
          <p className="meta">
            Tipo {report.type} · Original <strong>{fmtBytes(report.originalSize)}</strong>
            {report.width ? ` · ${report.width}×${report.height}` : ''}
            {report.durationMs ? ` · ${(report.durationMs / 1000).toFixed(1)}s` : ''}
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Variante</th>
                <th>Formato / Codec</th>
                <th>Tamanho</th>
                <th>Taxa</th>
                <th>Poupança</th>
                <th>Qualidade</th>
                <th>Tempo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>original</strong></td>
                <td>{report.type.toLowerCase()}</td>
                <td>{fmtBytes(report.originalSize)}</td>
                <td>1.00×</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>
                  <a href={`/api/media/${media.id}/raw`} target="_blank" rel="noreferrer">abrir</a>
                </td>
              </tr>
              {report.variants.map((v) => (
                <tr key={v.label}>
                  <td>{v.label}</td>
                  <td>{v.format}{v.codec ? ` / ${v.codec}` : ''}</td>
                  <td>{fmtBytes(v.size)}</td>
                  <td>{v.compressionRatio.toFixed(2)}×</td>
                  <td className={v.savingPct > 0 ? 'good' : 'bad'}>
                    {v.savingPct > 0 ? `−${v.savingPct}%` : `${v.savingPct}%`}
                  </td>
                  <td>{v.qualityScore != null ? `${v.qualityScore} dB` : '—'}</td>
                  <td>{v.processingMs} ms</td>
                  <td>
                    <a href={`/api/media/${media.id}/download?variant=${v.label}`}>↓</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">
            Taxa = tamanho de entrada ÷ tamanho de saída. <code>huffman-own</code> é o nosso
            algoritmo (Huffman) sobre os pixels em bruto — compressão sem perdas.
          </p>

          <h3>Pré-visualização / reprodução (streaming)</h3>
          <MediaPreview report={report} mediaId={media.id} />
        </div>
      )}
    </div>
  );
}

function MediaPreview({ report, mediaId }: { report: CompressionReport; mediaId: string }) {
  const base = `/api/media/${mediaId}/raw`;
  if (report.type === 'IMAGE') {
    return (
      <div className="comparerow">
        <figure>
          <figcaption className="muted small">original ({fmtBytes(report.originalSize)})</figcaption>
          <img className="preview" src={base} alt="original" />
        </figure>
        <figure>
          <figcaption className="muted small">webp-q80</figcaption>
          <img className="preview" src={`${base}?variant=webp-q80`} alt="webp" />
        </figure>
      </div>
    );
  }
  if (report.type === 'AUDIO') {
    return <audio controls src={`${base}?variant=mp3-128k`} />;
  }
  return <video className="preview" controls poster={`${base}?variant=thumbnail`} src={`${base}?variant=h264-720p`} />;
}
