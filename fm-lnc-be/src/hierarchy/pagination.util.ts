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

  // Name property aliases
  if (property === 'long_name' || property === 'name_lg') return obj.name_lg ?? obj.long_name ?? obj.name;
  if (property === 'short_name' || property === 'name_sh') return obj.name_sh ?? obj.short_name;
  if (property === 'three_letter_name' || property === 'name_3l') return obj.name_3l ?? obj.three_letter_name;
  if (property === 'six_letter_name' || property === 'name_6l') return obj.name_6l ?? obj.six_letter_name;
  if (property === 'categories' || property === 'region') return obj.region ?? obj.categories;

  // Relational aliases
  if (property === 'nation_name') return obj.nation?.name_lg ?? obj.nation?.long_name ?? obj.nation_name;
  if (property === 'nation_three_letter') return obj.nation?.name_3l ?? obj.nation?.three_letter_name ?? obj.nation_three_letter;
  if (property === 'confed_name') return obj.confed?.name ?? obj.confed_name;
  if (property === 'parent_name') return obj.parent?.name_sh ?? obj.parent?.name_lg ?? obj.parent_name;
  if (property === 'competition_name') return obj.comp?.name_sh ?? obj.comp?.name_lg ?? obj.competition_name;

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
