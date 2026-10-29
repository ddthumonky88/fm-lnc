export enum ConfederationEnum {
  CAF = 'CAF',
  AFC = 'AFC',
  UEFA = 'UEFA',
  CONCACAF = 'CONCACAF',
  OFC = 'OFC',
  CONMEBOL = 'CONMEBOL',
  WORLD = 'WORLD',
  EXTINCT = 'EXTINCT',
}

export const CONFEDERATION_LIST = [
  'CAF',
  'AFC',
  'UEFA',
  'CONCACAF',
  'OFC',
  'CONMEBOL',
  'WORLD',
  'EXTINCT',
] as const;

export const CONFED_ID_MAP: Record<string, string> = {
  '1': 'CAF',
  '2': 'AFC',
  '3': 'UEFA',
  '4': 'CONCACAF',
  '5': 'OFC',
  '6': 'CONMEBOL',
  '7': 'WORLD',
  '8': 'EXTINCT',
  CAF: 'CAF',
  AFC: 'AFC',
  UEFA: 'UEFA',
  CONCACAF: 'CONCACAF',
  OFC: 'OFC',
  CONMEBOL: 'CONMEBOL',
  WORLD: 'WORLD',
  World: 'WORLD',
  EXTINCT: 'EXTINCT',
};

export function normalizeConfed(confedIdOrName?: string | null): string | null {
  if (!confedIdOrName) return null;
  const str = String(confedIdOrName).trim();
  return CONFED_ID_MAP[str] || CONFED_ID_MAP[str.toUpperCase()] || str;
}
