// Estados de UI reutilizáveis (carregamento / erro / vazio) — usados pelas páginas
// para dar feedback consistente em vez de engolir erros silenciosamente.

export function Loading({ label = 'A carregar…' }: { label?: string }) {
  return <p className="muted">{label}</p>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="muted">{children}</p>;
}

/** Mensagem de erro com botão opcional de "Tentar novamente". */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="errorstate">
      <p className="bad">⚠️ {message}</p>
      {onRetry && (
        <button className="ghost" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
