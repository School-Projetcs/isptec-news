// Agrupamento visual das categorias por departamento do ISPTEC.
// A fonte de verdade do grupo é o campo `group` da categoria (vindo da API);
// aqui só definimos a ORDEM de apresentação e a forma de agrupar.
import type { Category } from '../types';

/** Valor especial do <select> que ativa a escrita de uma categoria nova. */
export const CUSTOM_CATEGORY = '__custom__';

/** Ordem de apresentação dos grupos (departamentos). Os não listados vão para o fim. */
export const CATEGORY_GROUP_ORDER = [
  'Geral',
  'Engenharia',
  'Ciências Sociais',
  'Geociências',
  'Outras',
];

export type CategoryGroup = { group: string; items: Category[] };

/** Agrupa as categorias por `group`, respeitando `CATEGORY_GROUP_ORDER`. */
export function groupCategories(cats: Category[]): CategoryGroup[] {
  const map = new Map<string, Category[]>();
  for (const c of cats) {
    const g = c.group?.trim() || 'Outras';
    (map.get(g) ?? map.set(g, []).get(g)!).push(c);
  }
  const ordered: CategoryGroup[] = [];
  for (const g of CATEGORY_GROUP_ORDER) {
    const items = map.get(g);
    if (items) {
      ordered.push({ group: g, items });
      map.delete(g);
    }
  }
  for (const [group, items] of map) ordered.push({ group, items });
  return ordered;
}
