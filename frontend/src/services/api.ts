import { RecordType } from '../types';

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // Tự động sử dụng hostname hiện tại (dùng 127.0.0.1 thay cho localhost để tránh lỗi IPv6 ERR_CONNECTION_REFUSED trên Windows)
    const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    return `http://${host}:3001/api`;
  }
  return 'http://127.0.0.1:3001/api';
}

export interface ConfederationItem {
  id: number;
  name: string;
  totalNations: number;
  totalIntComps: number;
}

export interface NationItem {
  id: number;
  long_name: string;
  short_name: string;
  three_letter_name: string;
  confederation_id: number;
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
  id: number;
  long_name: string;
  short_name: string;
  three_letter_name: string;
  fg_color?: string;
  bg_color?: string;
  confed_id?: number;
  confed_name?: string;
  nation_id?: number;
  nation_name?: string;
  nation_three_letter?: string;
  categories?: string;
  is_international?: boolean;
  note?: string;
  inactive_fields?: string;
  nation?: NationItem;
  confederation?: ConfederationItem;
  clubsCount?: number;
  awardsCount?: number;
  totalChildren?: number;
}

export interface ClubItem {
  id: number;
  long_name: string;
  short_name: string;
  six_letter_name?: string;
  three_letter_name?: string;
  nation_id?: number;
  comp_id?: number;
  note?: string;
  nation?: NationItem;
  competition?: CompetitionItem;
}

export interface StadiumItem {
  id: number;
  name: string;
  nation_id?: number;
  note?: string;
  nation?: NationItem;
}

export interface CityItem {
  id: number;
  name: string;
  country_id?: number;
  categories?: string;
  nation?: NationItem;
}

export interface AwardItem {
  id: number;
  long_name: string;
  short_name: string;
  nation_id?: number;
  comp_id?: number;
  nation?: NationItem;
  competition?: CompetitionItem;
}

export interface PlayerItem {
  id: number;
  first_name: string;
  common_name?: string;
  second_name: string;
}

export interface StageItem {
  id: number;
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

export async function fetchContinents(): Promise<ConfederationItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/continents`);
  if (!res.ok) throw new Error('Failed to fetch continents');
  return res.json();
}

export async function fetchAllNations(confedId?: number, query?: string): Promise<NationItem[]> {
  const params = new URLSearchParams();
  if (confedId) params.append('confedId', String(confedId));
  if (query) params.append('q', query);
  const qStr = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${getApiBase()}/hierarchy/nations${qStr}`);
  if (!res.ok) throw new Error('Failed to fetch nations');
  return res.json();
}

export async function fetchAllCompetitions(options?: {
  confedId?: number;
  nationId?: number;
  query?: string;
  isInternational?: boolean;
}): Promise<CompetitionItem[]> {
  const params = new URLSearchParams();
  if (options?.confedId) params.append('confedId', String(options.confedId));
  if (options?.nationId) params.append('nationId', String(options.nationId));
  if (options?.query) params.append('q', options.query);
  if (options?.isInternational !== undefined) params.append('isInternational', String(options.isInternational));
  const qStr = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${getApiBase()}/hierarchy/competitions${qStr}`);
  if (!res.ok) throw new Error('Failed to fetch competitions');
  return res.json();
}

export async function fetchNationsByContinent(confedId: number): Promise<NationItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/continents/${confedId}/nations`);
  if (!res.ok) throw new Error('Failed to fetch nations');
  return res.json();
}

export async function fetchIntCompetitions(confedId: number): Promise<CompetitionItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/continents/${confedId}/international-competitions`);
  if (!res.ok) throw new Error('Failed to fetch international competitions');
  return res.json();
}

export async function fetchNationHub(nationId: number): Promise<NationHubData> {
  const res = await fetch(`${getApiBase()}/hierarchy/nations/${nationId}/hub`);
  if (!res.ok) throw new Error('Failed to fetch nation hub');
  return res.json();
}

export async function fetchDomesticCompetitions(nationId: number): Promise<CompetitionItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/nations/${nationId}/competitions`);
  if (!res.ok) throw new Error('Failed to fetch domestic competitions');
  return res.json();
}

export async function fetchIndependentClubs(nationId: number, isExtinct?: boolean): Promise<ClubItem[]> {
  const query = isExtinct !== undefined ? `?extinct=${isExtinct}` : '';
  const res = await fetch(`${getApiBase()}/hierarchy/nations/${nationId}/independent-clubs${query}`);
  if (!res.ok) throw new Error('Failed to fetch independent clubs');
  return res.json();
}

export async function fetchClubsInComp(compId: number): Promise<ClubItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/competitions/${compId}/clubs`);
  if (!res.ok) throw new Error('Failed to fetch clubs in competition');
  return res.json();
}

export async function fetchCompetitionInfo(compId: number): Promise<CompetitionItem & { clubsCount: number; awardsCount: number }> {
  const res = await fetch(`${getApiBase()}/hierarchy/competitions/${compId}/info`);
  if (!res.ok) throw new Error('Failed to fetch competition info');
  return res.json();
}

export async function fetchStadiums(nationId: number): Promise<StadiumItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/nations/${nationId}/stadiums`);
  if (!res.ok) throw new Error('Failed to fetch stadiums');
  return res.json();
}

export async function fetchCities(nationId: number): Promise<CityItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/nations/${nationId}/cities`);
  if (!res.ok) throw new Error('Failed to fetch cities');
  return res.json();
}

export async function fetchAwards(nationId: number): Promise<AwardItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/nations/${nationId}/awards`);
  if (!res.ok) throw new Error('Failed to fetch awards');
  return res.json();
}

export async function fetchAwardsInComp(compId: number): Promise<AwardItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/competitions/${compId}/awards`);
  if (!res.ok) throw new Error('Failed to fetch awards in competition');
  return res.json();
}

export async function fetchAllAwards(): Promise<AwardItem[]> {
  const res = await fetch(`${getApiBase()}/hierarchy/awards`);
  if (!res.ok) throw new Error('Failed to fetch awards');
  return res.json();
}

export async function fetchPlayers(query?: string): Promise<PlayerItem[]> {
  const qStr = query ? `?q=${encodeURIComponent(query)}` : '';
  const res = await fetch(`${getApiBase()}/hierarchy/players${qStr}`);
  if (!res.ok) throw new Error('Failed to fetch players');
  return res.json();
}

export async function fetchStages(query?: string): Promise<StageItem[]> {
  const qStr = query ? `?q=${encodeURIComponent(query)}` : '';
  const res = await fetch(`${getApiBase()}/hierarchy/stages${qStr}`);
  if (!res.ok) throw new Error('Failed to fetch stages');
  return res.json();
}

export async function quickSearch(query: string) {
  const res = await fetch(`${getApiBase()}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function createRecord(type: RecordType | string, data: any) {
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

export async function updateRecord(type: RecordType | string, id: number, data: any) {
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

export async function deleteRecord(type: RecordType | string, id: number) {
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

export function getConfederationLogoUrl(id: number | string): string {
  return `${getApiBase()}/logos/confederation/${id}`;
}

export function getNationLogoUrl(id: number | string, code?: string): string {
  const query = code ? `?code=${encodeURIComponent(code)}` : '';
  return `${getApiBase()}/logos/nation/${id}${query}`;
}
