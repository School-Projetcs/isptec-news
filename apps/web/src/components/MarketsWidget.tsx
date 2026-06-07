import { useEffect, useState } from 'react';

// Mercados com DADOS REAIS (gratuitos, sem chave):
//  • Câmbios via open.er-api.com (base USD; inclui AOA) — atualização diária.
//  • Bitcoin via CoinGecko, com variação real de 24 h.
// Sem mocks: se offline, mostra "indisponível".

type Row = { label: string; value: string; chg?: number };

function fmt(n: number): string {
  return n.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
}

export function MarketsWidget() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let on = true;
    async function load() {
      try {
        const [fxRes, btcRes] = await Promise.all([
          fetch('https://open.er-api.com/v6/latest/USD').then((r) => r.json()),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
            .then((r) => r.json())
            .catch(() => null),
        ]);
        if (!on) return;
        if (fxRes?.result !== 'success' || !fxRes.rates?.AOA) {
          setErr(true);
          return;
        }
        const aoaPerUsd = fxRes.rates.AOA as number;
        const eur = fxRes.rates.EUR as number;
        const next: Row[] = [
          { label: 'USD/AOA', value: fmt(aoaPerUsd) },
          { label: 'EUR/AOA', value: fmt(aoaPerUsd / eur) },
        ];
        const btc = btcRes?.bitcoin;
        if (btc?.usd) next.push({ label: 'BTC/USD', value: '$' + fmt(btc.usd), chg: btc.usd_24h_change });
        setRows(next);
        if (fxRes.time_last_update_utc) {
          setUpdated(new Date(fxRes.time_last_update_utc).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }));
        }
      } catch {
        if (on) setErr(true);
      }
    }
    void load();
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="widget">
      <div className="widget-h">
        <span>📈 Mercados</span>
        {updated && <span className="muted small">{updated}</span>}
      </div>
      {err ? (
        <p className="muted small">Indisponível offline.</p>
      ) : !rows ? (
        <p className="muted small">A carregar…</p>
      ) : (
        <ul className="ticker">
          {rows.map((r) => (
            <li key={r.label}>
              <span className="ticker-sym">{r.label}</span>
              <span className="ticker-val">
                {r.value}
                {typeof r.chg === 'number' && (
                  <span className={r.chg >= 0 ? 'good' : 'bad'}>
                    {' '}{r.chg >= 0 ? '▲' : '▼'} {Math.abs(r.chg).toFixed(1)}%
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
