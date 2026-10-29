import { PageData, buildPageData } from '../common/api-response';

export interface SortCriteria {
  property: string;
  direction: 'ASC' | 'DESC';
}

export function parseSortCriteria(sort?: string | string[]): SortCriteria[] {
  if (!sort) return [];
  const list = Array.isArray(sort) ? sort : [sort];
  const results: SortCriteria[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'string') continue;
    const parts = item.split(',');
    const property = parts[0]?.trim();
    if (!property) continue;
    const dir = parts[1]?.trim().toUpperCase();
    const direction = dir === 'DESC' ? 'DESC' : 'ASC';
    results.push({ property, direction });
  }

  return results;
}

function getPropertyValue(obj: any, property: string): any {
  if (!obj || !property) return undefined;
  if (obj[property] !== undefined) return obj[property];
  if (property.includes('.')) {
    return property.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  // Name property fields
  if (property === 'name_lg' || property === 'name') return obj.name_lg ?? obj.name;
  if (property === 'name_sh') return obj.name_sh;
  if (property === 'name_3l') return obj.name_3l;
  if (property === 'name_6l') return obj.name_6l;
  if (property === 'categories' || property === 'region') return obj.region ?? obj.categories;

  // Relational aliases
  if (property === 'nation' || property === 'nation_name' || property === 'nation_name_lg') return obj.nation?.name_lg ?? obj.nation?.name;
  if (property === 'nation_3l' || property === 'nation_three_letter' || property === 'nation_name_3l') return obj.nation?.name_3l;
  if (property === 'confed' || property === 'confed_name') return obj.confed?.name;
  if (property === 'parent' || property === 'parent_name' || property === 'parent_name_sh') return obj.parent?.name_sh ?? obj.parent?.name_lg ?? obj.parent?.name;
  if (property === 'competition' || property === 'comp' || property === 'comp_name') return obj.comp?.name_sh ?? obj.comp?.name_lg ?? obj.comp?.name;
  if (property === 'affiliate_club' || property === 'affiliate_type') return obj.affiliate_club?.name_sh ?? obj.affiliate_club?.name_lg ?? obj.affiliate_club?.name;

  // Stats handling
  if (obj.stats && typeof obj.stats === 'object') {
    if (obj.stats[property] !== undefined) return obj.stats[property];
    if (property.startsWith('total')) {
      const trimmed = property.slice(5);
      const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
      if (obj.stats[lower] !== undefined) return obj.stats[lower];
    }
  }
  return undefined;
}

export function applySort<T>(items: T[], sortCriteria: SortCriteria[]): T[] {
  if (!sortCriteria || sortCriteria.length === 0) return items;

  return [...items].sort((a: any, b: any) => {
    for (const { property, direction } of sortCriteria) {
      const valA = getPropertyValue(a, property);
      const valB = getPropertyValue(b, property);

      if (valA === valB) continue;
      if (valA === undefined || valA === null) return direction === 'ASC' ? 1 : -1;
      if (valB === undefined || valB === null) return direction === 'ASC' ? -1 : 1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      if (comparison !== 0) {
        return direction === 'ASC' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

export type PaginatedResult<T> = PageData<T>;

export function paginateAndSort<T>(
  items: T[],
  options?: {
    page?: number;
    size?: number;
    sort?: string | string[];
  },
): PaginatedResult<T> | T[] {
  const sortCriteria = parseSortCriteria(options?.sort);
  const sorted = applySort(items, sortCriteria);

  // If neither page nor size is passed, return the array directly for seamless backwards compatibility
  if (options?.page === undefined && options?.size === undefined) {
    return sorted;
  }

  const page = Math.max(0, Number(options.page || 0));
  const size = Math.max(1, Number(options.size || 10));
  const start = page * size;
  const content = sorted.slice(start, start + size);

  return buildPageData(content, page, size, sorted.length);
}
