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

export interface ConfederationItem {
  id: string;
  name: string;
  totalNations: number;
  totalIntComps: number;
}

export interface NationItem {
  id: string;
  long_name: string;
  short_name: string;
  three_letter_name: string;
  confederation_id: string;
  confederation_name?: string;
  confederation?: ConfederationItem;
  totalChildren?: number;
  totalComps?: number;
  totalClubs?: number;
  totalStadiums?: number;
  totalCities?: number;
  totalAwards?: number;
}

export interface CompetitionItem {
  id: string;
  long_name: string;
  short_name: string;
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
  categories?: string;
  is_international?: boolean;
  note?: string;
  inactive_fields?: string;
  nation?: NationItem;
  confederation?: ConfederationItem;
  parent?: CompetitionItem;
  is_virtual?: boolean;
  virtual_type?: string;
  clubsCount?: number;
  awardsCount?: number;
  totalChildren?: number;
}

export interface ClubItem {
  id: string;
  long_name: string;
  short_name: string;
  six_letter_name?: string;
  three_letter_name?: string;
  nation_id?: string;
  comp_id?: string;
  note?: string;
  is_extinct?: boolean;
  nation?: NationItem;
  competition?: CompetitionItem;
}

export interface StadiumItem {
  id: string;
  name: string;
  nation_id?: string;
  note?: string;
  nation?: NationItem;
}

export interface CityItem {
  id: string;
  name: string;
  country_id?: string;
  categories?: string;
  nation?: NationItem;
}

export interface AwardItem {
  id: string;
  long_name: string;
  short_name: string;
  nation_id?: string;
  comp_id?: string;
  nation?: NationItem;
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
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = await res.json();
      apiCache.set(url, { data, timestamp: Date.now() });
      return data as T;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, promise);
  return promise;
}

export async function fetchContinents(forceRefresh = false): Promise<ConfederationItem[]> {
  return cachedFetch<ConfederationItem[]>(`${getApiBase()}/hierarchy/continents`, forceRefresh);
}

export async function fetchAllNations(confedId?: string, query?: string, forceRefresh = false): Promise<NationItem[]> {
  const params = new URLSearchParams();
  if (confedId) params.append('confedId', String(confedId));
  if (query) params.append('q', query);
  const qStr = params.toString() ? `?${params.toString()}` : '';
  return cachedFetch<NationItem[]>(`${getApiBase()}/hierarchy/nations${qStr}`, forceRefresh);
}

export async function fetchAllCompetitions(options?: {
  confedId?: string;
  nationId?: string;
  query?: string;
  isInternational?: boolean;
}, forceRefresh = false): Promise<CompetitionItem[]> {
  const params = new URLSearchParams();
  if (options?.confedId) params.append('confedId', String(options.confedId));
  if (options?.nationId) params.append('nationId', String(options.nationId));
  if (options?.query) params.append('q', options.query);
  if (options?.isInternational !== undefined) params.append('isInternational', String(options.isInternational));
  const qStr = params.toString() ? `?${params.toString()}` : '';
  return cachedFetch<CompetitionItem[]>(`${getApiBase()}/hierarchy/competitions${qStr}`, forceRefresh);
}

export async function fetchNationsByContinent(confedId: string, forceRefresh = false): Promise<NationItem[]> {
  return cachedFetch<NationItem[]>(`${getApiBase()}/hierarchy/continents/${confedId}/nations`, forceRefresh);
}

export async function fetchIntCompetitions(confedId: string, forceRefresh = false): Promise<CompetitionItem[]> {
  return cachedFetch<CompetitionItem[]>(`${getApiBase()}/hierarchy/continents/${confedId}/international-competitions`, forceRefresh);
}

export async function fetchNationHub(nationId: string, forceRefresh = false): Promise<NationHubData> {
  return cachedFetch<NationHubData>(`${getApiBase()}/hierarchy/nations/${nationId}/hub`, forceRefresh);
}

export async function fetchDomesticCompetitions(nationId: string, forceRefresh = false): Promise<CompetitionItem[]> {
  return cachedFetch<CompetitionItem[]>(`${getApiBase()}/hierarchy/nations/${nationId}/competitions`, forceRefresh);
}

export async function fetchIndependentClubs(nationId: string, isExtinct?: boolean, forceRefresh = false): Promise<ClubItem[]> {
  const query = isExtinct !== undefined ? `?extinct=${isExtinct}` : '';
  return cachedFetch<ClubItem[]>(`${getApiBase()}/hierarchy/nations/${nationId}/independent-clubs${query}`, forceRefresh);
}

export async function fetchClubsInComp(compId: string, forceRefresh = false): Promise<ClubItem[]> {
  return cachedFetch<ClubItem[]>(`${getApiBase()}/hierarchy/competitions/${compId}/clubs`, forceRefresh);
}

export async function fetchCompetitionInfo(compId: string, forceRefresh = false): Promise<CompetitionItem & { clubsCount: number; awardsCount: number; childrenCount?: number }> {
  return cachedFetch<CompetitionItem & { clubsCount: number; awardsCount: number; childrenCount?: number }>(`${getApiBase()}/hierarchy/competitions/${compId}/info`, forceRefresh);
}

export async function fetchConfederationInfo(confedId: string, forceRefresh = false): Promise<ConfederationItem & { totalNations: number; totalIntComps: number; totalComps: number; totalClubs: number; totalStadiums: number; totalCities: number; totalAwards: number }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/continents/${confedId}/info`, forceRefresh);
}

export async function fetchNationInfo(nationId: string, forceRefresh = false): Promise<NationItem & { counts: any }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/nations/${nationId}/info`, forceRefresh);
}

export async function fetchClubInfo(clubId: string, forceRefresh = false): Promise<ClubItem & { competition_name?: string; parent_competition_name?: string; nation_name?: string; nation_three_letter?: string }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/clubs/${clubId}/info`, forceRefresh);
}

export async function fetchCityInfo(cityId: string, forceRefresh = false): Promise<CityItem & { nation_name?: string; nation_three_letter?: string }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/cities/${cityId}/info`, forceRefresh);
}

export async function fetchAwardInfo(awardId: string, forceRefresh = false): Promise<AwardItem & { nation_name?: string; nation_three_letter?: string; competition_name?: string }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/awards/${awardId}/info`, forceRefresh);
}

export async function fetchStadiumInfo(stadiumId: string, forceRefresh = false): Promise<StadiumItem & { nation_name?: string; nation_three_letter?: string }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/stadiums/${stadiumId}/info`, forceRefresh);
}

export async function fetchEntityInfo(type: string, id: string, forceRefresh = false): Promise<any> {
  return cachedFetch<any>(`${getApiBase()}/records/${type}/${id}/info`, forceRefresh);
}

export async function fetchSubCompetitions(compId: string, forceRefresh = false): Promise<CompetitionItem[]> {
  return cachedFetch<CompetitionItem[]>(`${getApiBase()}/hierarchy/competitions/${compId}/sub-competitions`, forceRefresh);
}

export async function fetchStadiums(nationId: string, forceRefresh = false): Promise<StadiumItem[]> {
  return cachedFetch<StadiumItem[]>(`${getApiBase()}/hierarchy/nations/${nationId}/stadiums`, forceRefresh);
}

export async function fetchCities(nationId: string, forceRefresh = false): Promise<CityItem[]> {
  return cachedFetch<CityItem[]>(`${getApiBase()}/hierarchy/nations/${nationId}/cities`, forceRefresh);
}

export async function fetchAwards(nationId: string, forceRefresh = false): Promise<AwardItem[]> {
  return cachedFetch<AwardItem[]>(`${getApiBase()}/hierarchy/nations/${nationId}/awards`, forceRefresh);
}

export async function fetchAwardsInComp(compId: string, forceRefresh = false): Promise<AwardItem[]> {
  return cachedFetch<AwardItem[]>(`${getApiBase()}/hierarchy/competitions/${compId}/awards`, forceRefresh);
}

export async function fetchAllAwards(forceRefresh = false): Promise<AwardItem[]> {
  return cachedFetch<AwardItem[]>(`${getApiBase()}/hierarchy/awards`, forceRefresh);
}

export async function fetchPlayers(query?: string, forceRefresh = false): Promise<PlayerItem[]> {
  const qStr = query ? `?q=${encodeURIComponent(query)}` : '';
  return cachedFetch<PlayerItem[]>(`${getApiBase()}/hierarchy/players${qStr}`, forceRefresh);
}

export async function fetchStages(query?: string, forceRefresh = false): Promise<StageItem[]> {
  const qStr = query ? `?q=${encodeURIComponent(query)}` : '';
  return cachedFetch<StageItem[]>(`${getApiBase()}/hierarchy/stages${qStr}`, forceRefresh);
}

export async function quickSearch(query: string) {
  const res = await fetch(`${getApiBase()}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function createRecord(type: RecordType | string, data: any) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Create failed' }));
    throw new Error(err.message || 'Create failed');
  }
  return res.json();
}

export async function updateRecord(type: RecordType | string, id: string, data: any) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Update failed' }));
    throw new Error(err.message || 'Update failed');
  }
  return res.json();
}

export async function deleteRecord(type: RecordType | string, id: string) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Delete failed' }));
    throw new Error(err.message || 'Delete failed');
  }
  return res.json();
}

export async function reimportLnc() {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/lnc/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Reimport failed');
  return res.json();
}

export function getExportUrl(): string {
  return `${getApiBase()}/lnc/export?download=true`;
}

export function getConfederationLogoUrl(id: string): string {
  return `${getLocalApiBase()}/logos/confederation/${id}`;
}

export function getNationLogoUrl(id: string, code?: string): string {
  const query = code ? `?code=${encodeURIComponent(code)}` : '';
  return `${getLocalApiBase()}/logos/nation/${id}${query}`;
}

export function getCompetitionLogoUrl(id: string | number): string {
  return `${getLocalApiBase()}/logos/competition/${id}`;
}

export function getClubLogoUrl(id: string | number): string {
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
  if (!res.ok) throw new Error('Không thể tải cấu hình thư mục local từ backend localhost:3001');
  return res.json();
}

export async function updateAppConfig(config: Partial<AppPathsConfig>): Promise<ConfigStatusResponse> {
  const res = await fetch(`${getLocalApiBase()}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Không thể cập nhật cấu hình local');
  return res.json();
}

export async function testDirectoryPath(targetPath: string) {
  const res = await fetch(`${getLocalApiBase()}/config/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetPath }),
  });
  if (!res.ok) throw new Error('Kiểm tra thư mục local thất bại');
  return res.json();
}

export async function syncLncFromConfig() {
  clearApiCache();
  const res = await fetch(`${getLocalApiBase()}/config/sync`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Đồng bộ LNC local thất bại');
  return res.json();
}

export async function reloadLogosFromConfig() {
  const res = await fetch(`${getLocalApiBase()}/config/reload-logos`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Quét lại logo local thất bại');
  return res.json();
}

export async function uploadLncFiles(files: { name: string; content: string }[]) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/lnc/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(err.message || 'Upload failed');
  }
  return res.json();
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

