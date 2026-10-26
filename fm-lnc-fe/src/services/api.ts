import { RecordType } from '../types';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_api_base');
    if (custom) return custom;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'https://fm-lnc-backend.onrender.com/api';
}

export function getLocalApiBase(): string {
  if (typeof window !== 'undefined') {
    const customLocal = localStorage.getItem('custom_local_api_base');
    if (customLocal) return customLocal;
  }
  if (process.env.NEXT_PUBLIC_LOCAL_API_URL) {
    return process.env.NEXT_PUBLIC_LOCAL_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    return `http://${host}:3001/api`;
  }
  return 'http://127.0.0.1:3001/api';
}

export function setCustomLocalApiBase(url: string | null) {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem('custom_local_api_base', url);
    } else {
      localStorage.removeItem('custom_local_api_base');
    }
  }
}

export function setCustomApiBase(url: string | null) {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem('custom_api_base', url);
    } else {
      localStorage.removeItem('custom_api_base');
    }
    clearApiCache();
  }
}

export interface PaginationQuery {
  page?: number;
  size?: number;
  sort?: string | string[];
  keyword?: string;
}

export interface NationFilterQuery extends PaginationQuery {
  confedId?: string;
}

export interface CompetitionFilterQuery extends PaginationQuery {
  confedId?: string;
  nationId?: string;
  isInternational?: boolean;
  category?: string;
  topLevelOnly?: boolean;
}

export interface IndependentClubFilterQuery extends PaginationQuery {
  extinct?: boolean | string;
}

export interface CityFilterQuery extends PaginationQuery {
  category?: string;
  regionId?: number;
}

export interface PageData<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  first: boolean;
  last: boolean;
}

export type PaginatedResponse<T> = PageData<T>;

export type PaginatedList<T> = T[] &
  Partial<Omit<PageData<T>, 'content'>> & {
    content?: T[];
  };

/**
 * Envelope chuẩn mà backend bọc quanh mọi response JSON.
 */
export interface ApiEnvelope<T = unknown> {
  status: number;
  success: boolean;
  message: string;
  data: T | null;
  error: { code: string; message: string; validationErrors: string | null } | null;
  timestamp: number;
  path: string;
  correlationId: string;
}

function isApiEnvelope(body: unknown): body is ApiEnvelope {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.success === 'boolean' && 'data' in b && 'timestamp' in b && 'correlationId' in b;
}

function normalizeEntityFields(item: any): any {
  if (!item || typeof item !== 'object') return item;
  if (Array.isArray(item)) {
    item.forEach(normalizeEntityFields);
    return item;
  }
  if (item.content && Array.isArray(item.content)) {
    item.content.forEach(normalizeEntityFields);
  }

  // Stats normalization
  if (item.stats && typeof item.stats === 'object') {
    const s = item.stats;
    if (s.nations !== undefined && item.totalNations === undefined) item.totalNations = s.nations;
    if (s.intComps !== undefined && item.totalIntComps === undefined)
      item.totalIntComps = s.intComps;
    if (s.comps !== undefined && item.totalComps === undefined) item.totalComps = s.comps;
    if (s.clubs !== undefined && item.totalClubs === undefined) item.totalClubs = s.clubs;
    if (s.stadiums !== undefined && item.totalStadiums === undefined)
      item.totalStadiums = s.stadiums;
    if (s.cities !== undefined && item.totalCities === undefined) item.totalCities = s.cities;
    if (s.awards !== undefined && item.totalAwards === undefined) item.totalAwards = s.awards;
    if (s.children !== undefined && item.totalChildren === undefined)
      item.totalChildren = s.children;
  }

  // Name fields aliases
  if (item.name_lg !== undefined && item.long_name === undefined) item.long_name = item.name_lg;
  if (item.long_name !== undefined && item.name_lg === undefined) item.name_lg = item.long_name;
  if (item.name_sh !== undefined && item.short_name === undefined) item.short_name = item.name_sh;
  if (item.short_name !== undefined && item.name_sh === undefined) item.name_sh = item.short_name;
  if (item.name_3l !== undefined && item.three_letter_name === undefined)
    item.three_letter_name = item.name_3l;
  if (item.three_letter_name !== undefined && item.name_3l === undefined)
    item.name_3l = item.three_letter_name;
  if (item.name_6l !== undefined && item.six_letter_name === undefined)
    item.six_letter_name = item.name_6l;
  if (item.six_letter_name !== undefined && item.name_6l === undefined)
    item.name_6l = item.six_letter_name;

  // City region / categories
  if (item.region !== undefined && item.categories === undefined) item.categories = item.region;
  if (item.categories !== undefined && item.region === undefined) item.region = item.categories;

  // Competition & Stadium type / categories
  if (item.type !== undefined && item.categories === undefined) item.categories = item.type;
  if (item.categories !== undefined && item.type === undefined) item.type = item.categories;
  if (item.type === undefined && item.stadium_type !== undefined) item.type = item.stadium_type;

  // City & Stadium is_disabled
  if (item.is_disabled !== undefined && item.isDisabled === undefined)
    item.isDisabled = item.is_disabled;
  if (item.isDisabled !== undefined && item.is_disabled === undefined)
    item.is_disabled = item.isDisabled;
  const isClubRecord =
    item.six_letter_name !== undefined ||
    item.name_6l !== undefined ||
    item.comp_id !== undefined ||
    item.is_extinct !== undefined;
  if (!isClubRecord && item.is_disabled === undefined && item.inactive_fields !== undefined) {
    const list = String(item.inactive_fields)
      .split(',')
      .map((s: string) => s.trim().toLowerCase());
    item.is_disabled = list.includes('name');
    item.isDisabled = item.is_disabled;
  }

  // Confed / nation ID aliases
  if (item.confed_id !== undefined && item.confederation_id === undefined)
    item.confederation_id = item.confed_id;
  if (item.confederation_id !== undefined && item.confed_id === undefined)
    item.confed_id = item.confederation_id;
  if (item.nation_id !== undefined && item.country_id === undefined)
    item.country_id = item.nation_id;
  if (item.country_id !== undefined && item.nation_id === undefined)
    item.nation_id = item.country_id;

  // Nested relations
  if (item.confed && !item.confederation) item.confederation = item.confed;
  if (item.confederation && !item.confed) item.confed = item.confederation;
  if (item.confed) {
    if (item.confed_name === undefined) item.confed_name = item.confed.name;
    if (item.confederation_name === undefined) item.confederation_name = item.confed.name;
  }
  if (item.comp && !item.competition) item.competition = item.comp;
  if (item.competition && !item.comp) item.comp = item.competition;

  if (item.nation) normalizeEntityFields(item.nation);
  if (item.competition) normalizeEntityFields(item.competition);
  if (item.comp) normalizeEntityFields(item.comp);
  if (item.parent) normalizeEntityFields(item.parent);

  return item;
}

/** Bóc `data` ra khỏi envelope (nếu body không phải envelope thì trả nguyên body). */
export function unwrapApiResponse<T>(body: unknown): T {
  const data = isApiEnvelope(body) ? body.data : body;
  return normalizeEntityFields(data) as T;
}

/**
 * Đọc response JSON: ném Error với message từ server (error.message / message) khi lỗi,
 * ngược lại trả về `data` của envelope.
 */
async function parseApiResponse<T = any>(res: Response, fallbackError: string): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const envelope = isApiEnvelope(body) ? body : null;
  if (!res.ok || (envelope && !envelope.success)) {
    const raw =
      envelope?.error?.message ||
      envelope?.message ||
      (body && typeof body === 'object' ? (body as { message?: unknown }).message : undefined);
    const message = Array.isArray(raw) ? raw.join('; ') : raw;
    throw new Error(typeof message === 'string' && message ? message : fallbackError);
  }
  return unwrapApiResponse<T>(body);
}

export interface EntityStats {
  nations?: number;
  intComps?: number;
  comps?: number;
  clubs?: number;
  stadiums?: number;
  cities?: number;
  awards?: number;
  children?: number;
}

export interface ConfederationItem {
  id: string;
  name: string;
  totalNations?: number;
  totalIntComps?: number;
  stats?: EntityStats;
}

export interface NationItem {
  id: string;
  name_lg?: string;
  long_name: string;
  name_sh?: string;
  short_name: string;
  name_3l?: string;
  three_letter_name: string;
  confed_id?: string;
  confederation_id: string;
  confed_name?: string;
  confederation_name?: string;
  confed?: ConfederationItem;
  confederation?: ConfederationItem;
  totalChildren?: number;
  totalComps?: number;
  totalClubs?: number;
  totalStadiums?: number;
  totalCities?: number;
  totalAwards?: number;
  stats?: EntityStats;
}

export interface CompetitionItem {
  id: string;
  name_lg?: string;
  long_name: string;
  name_sh?: string;
  short_name: string;
  name_3l?: string;
  three_letter_name: string;
  fg_color?: string;
  bg_color?: string;
  confed_id?: string;
  confed_name?: string;
  nation_id?: string;
  nation_name?: string;
  nation_three_letter?: string;
  parent_id?: string;
  parent_name?: string;
  parent_long_name?: string;
  parent_short_name?: string;
  childrenCount?: number;
  type?: string;
  categories?: string;
  is_international?: boolean;
  note?: string;
  inactive_fields?: string;
  nation?: NationItem;
  confed?: ConfederationItem;
  confederation?: ConfederationItem;
  comp?: CompetitionItem;
  parent?: CompetitionItem;
  is_virtual?: boolean;
  virtual_type?: string;
  clubsCount?: number;
  awardsCount?: number;
  totalChildren?: number;
  stats?: EntityStats;
}

export interface ClubItem {
  id: string;
  name_lg?: string;
  long_name: string;
  name_sh?: string;
  short_name: string;
  name_6l?: string;
  six_letter_name?: string;
  name_3l?: string;
  three_letter_name?: string;
  nation_id?: string;
  comp_id?: string;
  note?: string;
  is_extinct?: boolean;
  nation?: NationItem;
  comp?: CompetitionItem;
  competition?: CompetitionItem;
}

export interface StadiumItem {
  id: string;
  name: string;
  nation_id?: string;
  type?: 'stadium' | 'training pitch' | string;
  is_disabled?: boolean;
  isDisabled?: boolean;
  note?: string;
  inactive_fields?: string;
  nation?: NationItem;
}

export interface RegionItem {
  id: number;
  name: string;
  nation_id: string;
  citiesCount?: number;
}

export interface CityItem {
  id: string;
  name: string;
  nation_id?: string;
  country_id?: string;
  region?: string;
  region_id?: number;
  categories?: string;
  is_disabled?: boolean;
  isDisabled?: boolean;
  inactive_fields?: string;
  nation?: NationItem;
}

export interface AwardItem {
  id: string;
  name_lg?: string;
  long_name: string;
  name_sh?: string;
  short_name: string;
  nation_id?: string;
  comp_id?: string;
  nation?: NationItem;
  comp?: CompetitionItem;
  competition?: CompetitionItem;
}

export interface PlayerItem {
  id: string;
  first_name: string;
  common_name?: string;
  second_name: string;
}

export interface StageItem {
  id: string;
  name: string;
}

export interface NationHubData {
  nation: NationItem;
  counts: {
    domesticComps: number;
    independentClubs: number;
    allClubs: number;
    stadiums: number;
    cities: number;
    awards: number;
  };
}

const inFlightRequests = new Map<string, Promise<any>>();
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60s in-memory cache

export function clearApiCache() {
  apiCache.clear();
  inFlightRequests.clear();
}

export function clearContinentsCache() {
  clearApiCache();
}

async function cachedFetch<T>(url: string, forceRefresh = false, ttl = CACHE_TTL_MS): Promise<T> {
  const now = Date.now();
  if (!forceRefresh) {
    const cached = apiCache.get(url);
    if (cached && now - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  if (!forceRefresh && inFlightRequests.has(url)) {
    return inFlightRequests.get(url) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url);
      const data = await parseApiResponse<any>(res, `Request failed with status ${res.status}`);
      let processedData = data;
      if (data && typeof data === 'object' && Array.isArray(data.content)) {
        const arr = [...data.content] as any;
        Object.assign(arr, data);
        processedData = arr;
      }
      apiCache.set(url, { data: processedData, timestamp: Date.now() });
      return processedData as T;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, promise);
  return promise;
}

function normalizeFilterAndRefresh<T extends PaginationQuery>(
  queryOrFilter?: T | boolean | string,
  maybeForceRefresh = false,
  stringParamKey?: keyof T,
  defaultSize = 20,
): { filter: T; forceRefresh: boolean } {
  let filter: any = {};
  let forceRefresh = false;

  if (typeof queryOrFilter === 'boolean') {
    filter = {};
    forceRefresh = queryOrFilter;
  } else if (typeof queryOrFilter === 'string' && stringParamKey) {
    filter = { [stringParamKey]: queryOrFilter };
    forceRefresh = maybeForceRefresh;
  } else if (typeof queryOrFilter === 'object' && queryOrFilter !== null) {
    filter = { ...queryOrFilter };
    forceRefresh = maybeForceRefresh;
  }

  if (filter.page === undefined) filter.page = 0;
  if (filter.size === undefined) filter.size = defaultSize;
  if (filter.keyword === undefined) filter.keyword = filter.q ?? '';
  delete filter.q;

  return { filter: filter as unknown as T, forceRefresh };
}

async function cachedPost<T>(
  url: string,
  filterAndPage: any = {},
  forceRefresh = false,
  ttl = CACHE_TTL_MS,
): Promise<T> {
  const { page, size, sort, ...rawPayload } = filterAndPage || {};

  const payload: Record<string, any> = {};
  for (const [key, val] of Object.entries(rawPayload)) {
    if (val !== undefined && val !== null && val !== '') {
      payload[key] = val;
    }
  }

  // Yêu cầu: search body chỉ dùng "keyword", bỏ "q"
  const kw = rawPayload.keyword ?? rawPayload.q ?? rawPayload.query ?? '';
  payload.keyword = String(kw);
  delete payload.q;
  delete payload.query;

  // Luôn gắn ?page=...&size=... lên URL query string
  const effectivePage = page !== undefined && page !== null && page !== '' ? page : 0;
  const effectiveSize = size !== undefined && size !== null && size !== '' ? size : 20;

  const [baseUrl, existingSearch] = url.split('?');
  const queryParams = new URLSearchParams(existingSearch || '');
  if (
    rawPayload.confedId !== undefined &&
    rawPayload.confedId !== null &&
    rawPayload.confedId !== '' &&
    String(rawPayload.confedId).toLowerCase() !== 'all'
  ) {
    queryParams.set('confedId', String(rawPayload.confedId));
    delete payload.confedId;
  }
  if (
    rawPayload.nationId !== undefined &&
    rawPayload.nationId !== null &&
    rawPayload.nationId !== '' &&
    String(rawPayload.nationId).toLowerCase() !== 'all'
  ) {
    queryParams.set('nationId', String(rawPayload.nationId));
    delete payload.nationId;
  }
  if (
    rawPayload.compId !== undefined &&
    rawPayload.compId !== null &&
    rawPayload.compId !== '' &&
    String(rawPayload.compId).toLowerCase() !== 'all'
  ) {
    queryParams.set('compId', String(rawPayload.compId));
    delete payload.compId;
  }
  if (
    rawPayload.regionId !== undefined &&
    rawPayload.regionId !== null &&
    rawPayload.regionId !== '' &&
    String(rawPayload.regionId).toLowerCase() !== 'all'
  ) {
    queryParams.set('regionId', String(rawPayload.regionId));
    delete payload.regionId;
  }
  if (
    rawPayload.category !== undefined &&
    rawPayload.category !== null &&
    rawPayload.category !== '' &&
    String(rawPayload.category).toLowerCase() !== 'all'
  ) {
    queryParams.set('category', String(rawPayload.category));
    delete payload.category;
  }
  if (
    rawPayload.extinct !== undefined &&
    rawPayload.extinct !== null &&
    rawPayload.extinct !== ''
  ) {
    queryParams.set('extinct', String(rawPayload.extinct));
    delete payload.extinct;
  }
  queryParams.set('page', String(effectivePage));
  queryParams.set('size', String(effectiveSize));
  if (sort !== undefined && sort !== null && sort !== '') {
    if (Array.isArray(sort)) {
      sort.forEach((s) => queryParams.append('sort', String(s)));
    } else {
      queryParams.set('sort', String(sort));
    }
  }

  const queryString = queryParams.toString();
  const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
  const cacheKey = `POST::${finalUrl}::${JSON.stringify(payload)}`;
  const now = Date.now();
  if (!forceRefresh) {
    const cached = apiCache.get(cacheKey);
    if (cached && now - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  if (!forceRefresh && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse<any>(res, `Request failed with status ${res.status}`);
      let processedData = data;
      if (data && typeof data === 'object' && Array.isArray(data.content)) {
        const arr = [...data.content] as any;
        Object.assign(arr, data);
        if (data.totalElements !== undefined && arr.total === undefined) {
          arr.total = data.totalElements;
        }
        processedData = arr;
      }
      apiCache.set(cacheKey, { data: processedData, timestamp: Date.now() });
      return processedData as T;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export async function fetchListConfederations(
  queryOrForceRefresh?: PaginationQuery | boolean,
  maybeForceRefresh = false,
): Promise<ConfederationItem[]> {
  const forceRefresh =
    typeof queryOrForceRefresh === 'boolean' ? queryOrForceRefresh : maybeForceRefresh;
  const kw =
    typeof queryOrForceRefresh === 'object' && queryOrForceRefresh !== null
      ? queryOrForceRefresh.keyword || (queryOrForceRefresh as any).q || ''
      : '';
  const url = kw
    ? `${getApiBase()}/hierarchy/list-confederations?keyword=${encodeURIComponent(kw)}`
    : `${getApiBase()}/hierarchy/list-confederations`;
  return cachedFetch<ConfederationItem[]>(url, forceRefresh);
}

export async function fetchContinents(
  queryOrForceRefresh?: PaginationQuery | boolean,
  maybeForceRefresh = false,
): Promise<PaginatedList<ConfederationItem>> {
  return fetchListConfederations(queryOrForceRefresh, maybeForceRefresh) as Promise<
    PaginatedList<ConfederationItem>
  >;
}

export async function fetchAllNations(
  optionsOrConfedId?: string | NationFilterQuery | boolean,
  maybeQueryOrForceRefresh?: string | boolean,
  forceRefresh = false,
): Promise<PaginatedList<NationItem>> {
  let filter: NationFilterQuery = {};
  let refresh = forceRefresh;

  if (typeof optionsOrConfedId === 'string') {
    filter = {
      confedId: optionsOrConfedId,
      keyword: typeof maybeQueryOrForceRefresh === 'string' ? maybeQueryOrForceRefresh : '',
    };
    refresh =
      typeof maybeQueryOrForceRefresh === 'boolean' ? maybeQueryOrForceRefresh : forceRefresh;
  } else if (typeof optionsOrConfedId === 'boolean') {
    refresh = optionsOrConfedId;
  } else if (typeof optionsOrConfedId === 'object' && optionsOrConfedId !== null) {
    filter = { ...optionsOrConfedId };
    refresh =
      typeof maybeQueryOrForceRefresh === 'boolean' ? maybeQueryOrForceRefresh : forceRefresh;
  }
  if (filter.size === undefined) filter.size = 300;
  if (filter.page === undefined) filter.page = 0;
  if (filter.keyword === undefined) filter.keyword = '';
  return cachedPost<PaginatedList<NationItem>>(
    `${getApiBase()}/hierarchy/nations/search`,
    filter,
    refresh,
  );
}

export async function fetchAllCompetitions(
  queryOrForceRefresh?: CompetitionFilterQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if ((filter as any).nationId) {
    return fetchDomesticCompetitions((filter as any).nationId, filter, refresh);
  }
  return fetchIntCompetitions((filter as any).confedId, filter, refresh);
}

export async function fetchNationsByContinent(
  confedId?: string | null,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<NationItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (
    confedId !== undefined &&
    confedId !== null &&
    String(confedId).trim() !== '' &&
    String(confedId).toLowerCase() !== 'all'
  ) {
    (filter as any).confedId = String(confedId);
  }
  return cachedPost<PaginatedList<NationItem>>(
    `${getApiBase()}/hierarchy/nations/search`,
    filter,
    refresh,
  );
}

export async function searchNations(
  query?: PaginationQuery & { confedId?: string | null },
  forceRefresh = false,
): Promise<PaginatedList<NationItem>> {
  return fetchNationsByContinent(query?.confedId, query, forceRefresh);
}

export async function fetchIntCompetitions(
  confedId?: string | null,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (
    confedId !== undefined &&
    confedId !== null &&
    String(confedId).trim() !== '' &&
    String(confedId).toLowerCase() !== 'all'
  ) {
    (filter as any).confedId = String(confedId);
  }
  return cachedPost<PaginatedList<CompetitionItem>>(
    `${getApiBase()}/hierarchy/int-competitions/search`,
    filter,
    refresh,
  );
}

export async function searchIntCompetitions(
  query?: PaginationQuery & { confedId?: string | null },
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  return fetchIntCompetitions(query?.confedId, query, forceRefresh);
}

export async function fetchNationHub(
  nationId: string,
  forceRefresh = false,
): Promise<NationHubData> {
  return cachedFetch<NationHubData>(
    `${getApiBase()}/hierarchy/nations/${nationId}/hub`,
    forceRefresh,
  );
}

export async function fetchDomesticCompetitions(
  nationId?: string | null,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (
    nationId !== undefined &&
    nationId !== null &&
    String(nationId).trim() !== '' &&
    String(nationId).toLowerCase() !== 'all'
  ) {
    (filter as any).nationId = String(nationId);
  }
  return cachedPost<PaginatedList<CompetitionItem>>(
    `${getApiBase()}/hierarchy/domestic-competitions/search`,
    filter,
    refresh,
  );
}

export async function searchDomesticCompetitions(
  query?: PaginationQuery & { nationId?: string | null },
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  return fetchDomesticCompetitions(query?.nationId, query, forceRefresh);
}

export async function fetchIndependentClubs(
  nationId: string,
  filterOrExtinct?: IndependentClubFilterQuery | boolean | string,
  forceRefresh = false,
): Promise<PaginatedList<ClubItem>> {
  let filter: IndependentClubFilterQuery = {};
  let refresh = forceRefresh;
  if (typeof filterOrExtinct === 'boolean' || typeof filterOrExtinct === 'string') {
    filter = { extinct: filterOrExtinct };
  } else if (typeof filterOrExtinct === 'object' && filterOrExtinct !== null) {
    filter = { ...filterOrExtinct };
  }
  if (filter.size === undefined) filter.size = 20;
  if (filter.page === undefined) filter.page = 0;
  if (filter.keyword === undefined) filter.keyword = '';
  const isExtinct = String(filter.extinct) === 'true';
  const compId = isExtinct ? `ext-${nationId}` : `oth-${nationId}`;
  delete filter.extinct;
  return cachedPost<PaginatedList<ClubItem>>(
    `${getApiBase()}/hierarchy/club/search`,
    {
      ...filter,
      nationId,
      compId,
    },
    refresh,
  );
}

export async function fetchAllClubsInNation(
  nationId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<ClubItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  return cachedPost<PaginatedList<ClubItem>>(
    `${getApiBase()}/hierarchy/club/search`,
    filter,
    refresh,
  );
}

export async function fetchClubsInComp(
  compId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<ClubItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (compId && String(compId).toLowerCase() !== 'all') {
    (filter as any).compId = String(compId);
  }
  return cachedPost<PaginatedList<ClubItem>>(
    `${getApiBase()}/hierarchy/club/search`,
    filter,
    refresh,
  );
}

export async function searchClubs(
  query?: PaginationQuery & { nationId?: string | null; compId?: string | null },
  forceRefresh = false,
): Promise<PaginatedList<ClubItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    query,
    forceRefresh,
    undefined,
    20,
  );
  if (query?.nationId && String(query.nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(query.nationId);
  }
  if (query?.compId && String(query.compId).toLowerCase() !== 'all') {
    (filter as any).compId = String(query.compId);
  }
  return cachedPost<PaginatedList<ClubItem>>(
    `${getApiBase()}/hierarchy/club/search`,
    filter,
    refresh,
  );
}

export async function fetchCompetitionInfo(
  compId: string,
  forceRefresh = false,
): Promise<CompetitionItem & { clubsCount: number; awardsCount: number; childrenCount?: number }> {
  return cachedFetch<
    CompetitionItem & { clubsCount: number; awardsCount: number; childrenCount?: number }
  >(`${getApiBase()}/hierarchy/competitions/${compId}/info`, forceRefresh);
}

export async function fetchConfederationInfo(
  confedId: string,
  forceRefresh = false,
): Promise<
  ConfederationItem & {
    totalNations: number;
    totalIntComps: number;
    totalComps: number;
    totalClubs: number;
    totalStadiums: number;
    totalCities: number;
    totalAwards: number;
  }
> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/continents/${confedId}/info`, forceRefresh);
}

export async function fetchNationInfo(
  nationId: string,
  forceRefresh = false,
): Promise<NationItem & { counts: any }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/nations/${nationId}/info`, forceRefresh);
}

export async function fetchClubInfo(
  clubId: string,
  forceRefresh = false,
): Promise<
  ClubItem & {
    competition_name?: string;
    parent_competition_name?: string;
    nation_name?: string;
    nation_three_letter?: string;
  }
> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/clubs/${clubId}/info`, forceRefresh);
}

export async function fetchCityInfo(
  cityId: string,
  forceRefresh = false,
): Promise<CityItem & { nation_name?: string; nation_three_letter?: string }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/cities/${cityId}/info`, forceRefresh);
}

export async function fetchAwardInfo(
  awardId: string,
  forceRefresh = false,
): Promise<
  AwardItem & { nation_name?: string; nation_three_letter?: string; competition_name?: string }
> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/awards/${awardId}/info`, forceRefresh);
}

export async function fetchStadiumInfo(
  stadiumId: string,
  forceRefresh = false,
): Promise<StadiumItem & { nation_name?: string; nation_three_letter?: string }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/stadiums/${stadiumId}/info`, forceRefresh);
}

export async function fetchEntityInfo(
  type: string,
  id: string,
  forceRefresh = false,
): Promise<any> {
  return cachedFetch<any>(`${getApiBase()}/records/${type}/${id}/info`, forceRefresh);
}

export async function fetchSubCompetitions(
  compId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    1000,
  );
  return cachedPost<PaginatedList<CompetitionItem>>(
    `${getApiBase()}/hierarchy/competitions/${compId}/sub-competitions`,
    filter,
    refresh,
  );
}

export async function fetchStadiums(
  nationId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<StadiumItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  return cachedPost<PaginatedList<StadiumItem>>(
    `${getApiBase()}/hierarchy/stadiums/search`,
    filter,
    refresh,
  );
}

export async function fetchCities(
  nationId: string,
  queryOrForceRefresh?: CityFilterQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CityItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  return cachedPost<PaginatedList<CityItem>>(
    `${getApiBase()}/hierarchy/cities/search`,
    filter,
    refresh,
  );
}

export async function fetchRegions(
  nationId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<RegionItem[]> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  return cachedPost<RegionItem[]>(
    `${getApiBase()}/hierarchy/regions/search`,
    filter,
    refresh,
  );
}

export async function fetchAwards(
  nationId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<AwardItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  return cachedPost<PaginatedList<AwardItem>>(
    `${getApiBase()}/hierarchy/awards/search`,
    filter,
    refresh,
  );
}

export async function fetchAwardsInComp(
  compId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<AwardItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (compId && String(compId).toLowerCase() !== 'all') {
    (filter as any).compId = String(compId);
  }
  return cachedPost<PaginatedList<AwardItem>>(
    `${getApiBase()}/hierarchy/awards/search`,
    filter,
    refresh,
  );
}

export async function fetchAllAwards(
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<AwardItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  return cachedPost<PaginatedList<AwardItem>>(`${getApiBase()}/hierarchy/awards`, filter, refresh);
}

export async function fetchPlayers(
  queryOrFilter?: PaginationQuery | string | boolean,
  forceRefresh = false,
): Promise<PaginatedList<PlayerItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrFilter,
    forceRefresh,
    'keyword',
    20,
  );
  return cachedPost<PaginatedList<PlayerItem>>(
    `${getApiBase()}/hierarchy/players`,
    filter,
    refresh,
  );
}

export async function fetchStages(
  queryOrFilter?: PaginationQuery | string | boolean,
  forceRefresh = false,
): Promise<PaginatedList<StageItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrFilter,
    forceRefresh,
    'keyword',
    20,
  );
  return cachedPost<PaginatedList<StageItem>>(`${getApiBase()}/hierarchy/stages`, filter, refresh);
}

export async function quickSearch(query: string, limit = 20) {
  const res = await fetch(`${getApiBase()}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: query, limit }),
  });
  return parseApiResponse(res, 'Search failed');
}

export async function createRecord(type: RecordType | string, data: any) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseApiResponse(res, 'Create failed');
}

export async function updateRecord(type: RecordType | string, id: string, data: any) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseApiResponse(res, 'Update failed');
}

export async function deleteRecord(type: RecordType | string, id: string) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}/${id}`, {
    method: 'DELETE',
  });
  return parseApiResponse(res, 'Delete failed');
}

export async function reimportLnc() {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/lnc/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseApiResponse(res, 'Reimport failed');
}

export function getExportUrl(): string {
  return `${getApiBase()}/lnc/export?download=true`;
}

// Cờ tạm thời tắt hiển thị ảnh theo yêu cầu người dùng
export const ENABLE_IMAGE_LOGOS = false;

export function getConfederationLogoUrl(id: string): string {
  if (!ENABLE_IMAGE_LOGOS) return '';
  return `${getLocalApiBase()}/logos/confederation/${id}`;
}

export function getNationLogoUrl(id: string, code?: string): string {
  if (!ENABLE_IMAGE_LOGOS) return '';
  const query = code ? `?code=${encodeURIComponent(code)}` : '';
  return `${getLocalApiBase()}/logos/nation/${id}${query}`;
}

/**
 * Cờ quốc gia lấy từ nguồn FIFA (dùng mã 3 ký tự FIFA, vd: AUS, ENG, VIE).
 */
export function getFifaFlagUrl(code?: string | null): string {
  const c = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return '';
  return `https://api.fifa.com/api/v3/picture/flags-sq-2/${c}`;
}

export function getCompetitionLogoUrl(id: string | number): string {
  if (!ENABLE_IMAGE_LOGOS) return '';
  return `${getLocalApiBase()}/logos/competition/${id}`;
}

export function getClubLogoUrl(id: string | number): string {
  if (!ENABLE_IMAGE_LOGOS) return '';
  return `${getLocalApiBase()}/logos/club/${id}`;
}

export interface AppPathsConfig {
  lncDir: string;
  confedLogoDir: string;
  nationLogoDir: string;
  compLogoDir: string;
  clubLogoDir: string;
}

export interface DirCheckStatus {
  path: string;
  exists: boolean;
  fileCount?: number;
}

export interface ConfigStatusResponse {
  config: AppPathsConfig;
  status: {
    lnc: {
      dir: string;
      exists: boolean;
      files: {
        cityNation: { name: string; exists: boolean; size?: number; mtime?: string };
        clubStadium: { name: string; exists: boolean; size?: number; mtime?: string };
        compOther: { name: string; exists: boolean; size?: number; mtime?: string };
      };
      allFilesFound: boolean;
    };
    confedLogo: DirCheckStatus;
    nationLogo: DirCheckStatus;
    compLogo: DirCheckStatus;
    clubLogo: DirCheckStatus;
  };
}

export async function fetchAppConfig(): Promise<ConfigStatusResponse> {
  const res = await fetch(`${getLocalApiBase()}/config`, {
    cache: 'no-store',
  });
  return parseApiResponse<ConfigStatusResponse>(
    res,
    'Không thể tải cấu hình thư mục local từ backend localhost:3001',
  );
}

export async function updateAppConfig(
  config: Partial<AppPathsConfig>,
): Promise<ConfigStatusResponse> {
  const res = await fetch(`${getLocalApiBase()}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return parseApiResponse<ConfigStatusResponse>(res, 'Không thể cập nhật cấu hình local');
}

export async function testDirectoryPath(targetPath: string) {
  const res = await fetch(`${getLocalApiBase()}/config/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetPath }),
  });
  return parseApiResponse(res, 'Kiểm tra thư mục local thất bại');
}

export async function syncLncFromConfig() {
  clearApiCache();
  const res = await fetch(`${getLocalApiBase()}/config/sync`, {
    method: 'POST',
  });
  return parseApiResponse(res, 'Đồng bộ LNC local thất bại');
}

export async function reloadLogosFromConfig() {
  const res = await fetch(`${getLocalApiBase()}/config/reload-logos`, {
    method: 'POST',
  });
  return parseApiResponse(res, 'Quét lại logo local thất bại');
}

export async function uploadLncFiles(files: { name: string; content: string }[]) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/lnc/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  return parseApiResponse(res, 'Upload failed');
}

export async function syncLocalLncToProd(): Promise<{ success: boolean; message: string }> {
  clearApiCache();
  const exportRes = await fetch(`${getLocalApiBase()}/lnc/export`);
  if (!exportRes.ok) {
    throw new Error('Không thể đọc dữ liệu LNC từ backend local');
  }
  const lncContent = await exportRes.text();
  return uploadLncFiles([{ name: 'FM24_Merged_Names.lnc', content: lncContent }]);
}
