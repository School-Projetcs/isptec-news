// Capa de notícia SEMPRE visível por inteiro (nunca cortada). Mantém uma moldura
// 16:9 consistente, preenchendo as margens com uma cópia desfocada da própria
// imagem (efeito "letterbox" usado por sites de notícias/vídeo) e mostrando a
// imagem real por cima com `object-fit: contain`.

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** `loading="lazy"` por defeito (cards do feed); usa "eager" na capa do detalhe. */
  eager?: boolean;
};

export function CoverImage({ src, alt = '', className = '', eager = false }: Props) {
  return (
    <div className={`cover ${className}`}>
      <div className="cover-bg" style={{ backgroundImage: `url("${src}")` }} aria-hidden="true" />
      <img className="cover-img" src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} />
    </div>
  );
}
