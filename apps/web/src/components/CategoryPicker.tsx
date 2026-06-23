import type { Category } from '../types';
import { CUSTOM_CATEGORY, groupCategories } from '../lib/categories';

// Seletor de categoria agrupado por departamento (optgroups) + opção "Outra…"
// que revela um campo para escrever uma categoria nova.
//
// Estado controlado pelo pai com dois valores:
//   • categoryId  → '' (Geral) | id de uma categoria | CUSTOM_CATEGORY
//   • categoryName → nome escrito quando categoryId === CUSTOM_CATEGORY

type Props = {
  cats: Category[];
  categoryId: string;
  categoryName: string;
  onChange: (next: { categoryId: string; categoryName: string }) => void;
};

export function CategoryPicker({ cats, categoryId, categoryName, onChange }: Props) {
  const groups = groupCategories(cats);
  return (
    <label>
      Categoria
      <select
        value={categoryId}
        onChange={(e) => onChange({ categoryId: e.target.value, categoryName })}
      >
        <option value="">— Geral —</option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM_CATEGORY}>➕ Outra (escrever…)</option>
      </select>
      {categoryId === CUSTOM_CATEGORY && (
        <input
          className="mt8"
          value={categoryName}
          onChange={(e) => onChange({ categoryId, categoryName: e.target.value })}
          placeholder="Escreve o nome da nova categoria"
          autoFocus
        />
      )}
    </label>
  );
}
