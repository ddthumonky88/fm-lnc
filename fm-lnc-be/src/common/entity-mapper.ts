export interface NestedNation {
  id: string;
  name_lg: string | null;
  name_sh: string | null;
  name_3l: string | null;
}

export interface NestedConfed {
  id: string;
  name: string | null;
}

export interface NestedComp {
  id: string;
  name_lg: string | null;
  name_sh: string | null;
  name_3l: string | null;
}

export interface NestedParent {
  id: string;
  name_lg: string | null;
  name_sh: string | null;
  name_3l: string | null;
}

export function mapNationRef(nation: any): NestedNation | null {
  if (!nation) return null;
  const id = nation.id !== undefined && nation.id !== null ? String(nation.id) : null;
  if (!id) return null;
  return {
    id,
    name_lg: nation.name_lg ?? nation.long_name ?? nation.name ?? null,
    name_sh: nation.name_sh ?? nation.short_name ?? null,
    name_3l: nation.name_3l ?? nation.three_letter_name ?? null,
  };
}

export function mapConfedRef(confed: any): NestedConfed | null {
  if (!confed) return null;
  const id = confed.id !== undefined && confed.id !== null ? String(confed.id) : null;
  if (!id) return null;
  return {
    id,
    name: confed.name ?? null,
  };
}

export function mapCompRef(comp: any): NestedComp | null {
  if (!comp) return null;
  const id = comp.id !== undefined && comp.id !== null ? String(comp.id) : null;
  if (!id) return null;
  return {
    id,
    name_lg: comp.name_lg ?? comp.long_name ?? comp.name ?? null,
    name_sh: comp.name_sh ?? comp.short_name ?? null,
    name_3l: comp.name_3l ?? comp.three_letter_name ?? null,
  };
}

export function mapParentRef(parent: any): NestedParent | null {
  return mapCompRef(parent);
}

export function mapNation(nation: any, extraStats?: any) {
  if (!nation) return null;
  return {
    id: String(nation.id),
    name_lg: nation.long_name ?? nation.name_lg ?? null,
    name_sh: nation.short_name ?? nation.name_sh ?? null,
    name_3l: nation.three_letter_name ?? nation.name_3l ?? null,
    confed: nation.confederation
      ? mapConfedRef(nation.confederation)
      : nation.confed_id || nation.confederation_id
      ? {
          id: String(nation.confed_id || nation.confederation_id),
          name: nation.confed_name || nation.confederation_name || null,
        }
      : null,
    ...(extraStats !== undefined ? { stats: extraStats } : {}),
  };
}

export function mapCompetition(comp: any, extraStats?: any) {
  if (!comp) return null;
  const nation = comp.nation
    ? mapNationRef(comp.nation)
    : comp.nation_id
    ? {
        id: String(comp.nation_id),
        name_lg: comp.nation_long_name || comp.nation_name || null,
        name_sh: comp.nation_short_name || null,
        name_3l: comp.nation_three_letter || null,
      }
    : null;

  const confed = comp.confederation
    ? mapConfedRef(comp.confederation)
    : comp.confed_id
    ? {
        id: String(comp.confed_id),
        name: comp.confed_name || null,
      }
    : null;

  const parent = comp.parent
    ? mapParentRef(comp.parent)
    : comp.parent_id
    ? {
        id: String(comp.parent_id),
        name_lg: comp.parent_long_name || null,
        name_sh: comp.parent_short_name || null,
        name_3l: comp.parent_three_letter || comp.parent_three_letter_name || null,
      }
    : null;

  return {
    id: String(comp.id),
    name_lg: comp.long_name ?? comp.name_lg ?? null,
    name_sh: comp.short_name ?? comp.name_sh ?? null,
    name_3l: comp.three_letter_name ?? comp.name_3l ?? null,
    fg_color: comp.fg_color ?? null,
    bg_color: comp.bg_color ?? null,
    type: comp.type ?? comp.categories ?? null,
    categories: comp.type ?? comp.categories ?? null,
    is_international: comp.is_international !== undefined ? !!comp.is_international : (!comp.nation && !comp.nation_id),
    note: comp.note ?? null,
    inactive_fields: comp.inactive_fields ?? null,
    nation,
    confed,
    parent,
    ...(comp.clubs_count !== undefined
      ? { clubsCount: comp.clubs_count }
      : comp.clubsCount !== undefined
      ? { clubsCount: comp.clubsCount }
      : {}),
    ...(comp.awards_count !== undefined
      ? { awardsCount: comp.awards_count }
      : comp.awardsCount !== undefined
      ? { awardsCount: comp.awardsCount }
      : {}),
    ...(comp.children_count !== undefined
      ? { childrenCount: comp.children_count }
      : comp.childrenCount !== undefined
      ? { childrenCount: comp.childrenCount }
      : {}),
    ...(extraStats !== undefined ? { stats: extraStats } : {}),
  };
}

export function mapClub(club: any) {
  if (!club) return null;
  const nation = club.nation
    ? mapNationRef(club.nation)
    : club.nation_id
    ? {
        id: String(club.nation_id),
        name_lg: club.nation_long_name || club.nation_name || null,
        name_sh: club.nation_short_name || null,
        name_3l: club.nation_three_letter || null,
      }
    : null;

  const comp = club.competition
    ? mapCompRef(club.competition)
    : club.comp_id
    ? {
        id: String(club.comp_id),
        name_lg: club.comp_long_name || club.competition_name || null,
        name_sh: club.comp_short_name || null,
        name_3l: club.comp_three_letter || null,
      }
    : null;

  return {
    id: String(club.id),
    name_lg: club.long_name ?? club.name_lg ?? null,
    name_sh: club.short_name ?? club.name_sh ?? null,
    name_6l: club.six_letter_name ?? club.name_6l ?? null,
    name_3l: club.three_letter_name ?? club.name_3l ?? null,
    note: club.note ?? null,
    inactive_fields: club.inactive_fields ?? null,
    is_extinct: !!club.is_extinct,
    nation,
    comp,
    ...(club.competition?.parent ? { parent: mapParentRef(club.competition.parent) } : {}),
  };
}

export function mapCity(city: any) {
  if (!city) return null;
  const nation = city.nation
    ? mapNationRef(city.nation)
    : (city.nation_id || city.country_id)
    ? {
        id: String(city.nation_id || city.country_id),
        name_lg: city.nation_long_name || city.nation_name || null,
        name_sh: city.nation_short_name || null,
        name_3l: city.nation_three_letter || null,
      }
    : null;

  return {
    id: String(city.id),
    name: city.name,
    region: city.region ?? city.categories ?? null,
    categories: city.region ?? city.categories ?? null,
    is_disabled: !!city.is_disabled,
    inactive_fields: city.is_disabled ? 'name' : null,
    nation,
  };
}

export function mapStadium(stadium: any) {
  if (!stadium) return null;
  const nation = stadium.nation
    ? mapNationRef(stadium.nation)
    : stadium.nation_id
    ? {
        id: String(stadium.nation_id),
        name_lg: stadium.nation_long_name || stadium.nation_name || null,
        name_sh: stadium.nation_short_name || null,
        name_3l: stadium.nation_three_letter || null,
      }
    : null;

  return {
    id: String(stadium.id),
    name: stadium.name,
    is_disabled: !!stadium.is_disabled,
    inactive_fields: stadium.is_disabled ? 'name' : null,
    nation,
  };
}

export function mapAward(award: any) {
  if (!award) return null;
  const nation = award.nation
    ? mapNationRef(award.nation)
    : award.nation_id
    ? {
        id: String(award.nation_id),
        name_lg: award.nation_long_name || award.nation_name || null,
        name_sh: award.nation_short_name || null,
        name_3l: award.nation_three_letter || null,
      }
    : null;

  const comp = award.competition
    ? mapCompRef(award.competition)
    : award.comp_id
    ? {
        id: String(award.comp_id),
        name_lg: award.comp_long_name || award.competition_name || null,
        name_sh: award.comp_short_name || null,
        name_3l: award.comp_three_letter || null,
      }
    : null;

  return {
    id: String(award.id),
    name_lg: award.long_name ?? award.name_lg ?? null,
    name_sh: award.short_name ?? award.name_sh ?? null,
    name_3l: award.three_letter_name ?? award.name_3l ?? null,
    nation,
    comp,
  };
}
