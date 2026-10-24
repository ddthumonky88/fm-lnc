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

export function applySort<T>(items: T[], sortCriteria: SortCriteria[]): T[] {
  if (!sortCriteria || sortCriteria.length === 0) return items;

  return [...items].sort((a: any, b: any) => {
    for (const { property, direction } of sortCriteria) {
      const valA = a[property];
      const valB = b[property];

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

export interface PaginatedResult<T> {
  content: T[];
  items: T[];
  totalElements: number;
  total: number;
  totalPages: number;
  size: number;
  number: number;
  page: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

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
  const totalElements = sorted.length;
  const totalPages = Math.ceil(totalElements / size);
  const start = page * size;
  const content = sorted.slice(start, start + size);

  return {
    content,
    items: content,
    totalElements,
    total: totalElements,
    totalPages,
    size,
    number: page,
    page,
    numberOfElements: content.length,
    first: page === 0,
    last: page >= totalPages - 1 || totalPages === 0,
    empty: content.length === 0,
  };
}
