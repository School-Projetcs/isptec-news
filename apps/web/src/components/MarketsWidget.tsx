// Ticker de mercados — valores ILUSTRATIVOS (não há fonte gratuita fiável sem
// chave para câmbios/índices de Angola). Rotulado como "ilustrativo" para ser
// honesto na demo/defesa.

const TICKERS = [
  { sym: 'AOA/USD', val: '0,00109', chg: 0.4 },
  { sym: 'AOA/EUR', val: '0,00101', chg: -0.2 },
  { sym: 'BVDA', val: '1 248,7', chg: 1.1 },
  { sym: 'Brent', val: '78,3', chg: 0.6 },
];

export function MarketsWidget() {
  return (
    <div className="widget">
      <div className="widget-h">
        <span>📈 Mercados</span>
        <span className="tag" title="Valores ilustrativos (sem fonte real)">ilustrativo</span>
      </div>
      <ul className="ticker">
        {TICKERS.map((t) => (
          <li key={t.sym}>
            <span className="ticker-sym">{t.sym}</span>
            <span className="ticker-val">
              {t.val} <span className={t.chg >= 0 ? 'good' : 'bad'}>{t.chg >= 0 ? '▲' : '▼'} {Math.abs(t.chg)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
