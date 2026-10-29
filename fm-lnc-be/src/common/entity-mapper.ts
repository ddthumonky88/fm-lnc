export interface NestedNation {
  id: string;
  name_lg: string | null;
  name_sh: string | null;
  name_3l: string | null;
  confed?: NestedConfed | null;
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

export interface NestedClub {
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
  const confed = nation.confed
    ? mapConfedRef(nation.confed)
    : nation.confederation
    ? mapConfedRef(nation.confederation)
    : nation.confed_id || nation.confederation_id
    ? {
        id: String(nation.confed_id || nation.confederation_id),
        name: nation.confed_name || nation.confederation_name || null,
      }
    : null;
  return {
    id,
    name_lg: nation.name_lg ?? nation.name ?? null,
    name_sh: nation.name_sh ?? null,
    name_3l: nation.name_3l ?? null,
    confed,
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
    name_lg: comp.name_lg ?? comp.name ?? null,
    name_sh: comp.name_sh ?? null,
    name_3l: comp.name_3l ?? null,
  };
}

export function mapClubRef(club: any): NestedClub | null {
  if (!club) return null;
  const id = club.id !== undefined && club.id !== null ? String(club.id) : null;
  if (!id) return null;
  return {
    id,
    name_lg: club.name_lg ?? club.name ?? null,
    name_sh: club.name_sh ?? null,
    name_3l: club.name_3l ?? null,
  };
}

export function mapParentRef(parent: any): NestedParent | null {
  return mapCompRef(parent);
}

export function mapNation(nation: any, extraStats?: any) {
  if (!nation) return null;
  const confedObj = nation.confed
    ? mapConfedRef(nation.confed)
    : nation.confederation
    ? mapConfedRef(nation.confederation)
    : nation.confed_id || nation.confederation_id
    ? {
        id: String(nation.confed_id || nation.confederation_id),
        name: nation.confed_name || nation.confederation_name || null,
      }
    : null;
  return {
    id: String(nation.id),
    name: nation.name_lg ?? nation.name ?? null,
    name_lg: nation.name_lg ?? nation.name ?? null,
    name_sh: nation.name_sh ?? null,
    name_3l: nation.name_3l ?? null,
    confed: confedObj,
    inactive_fields: nation.inactive_fields ?? null,
    note: nation.note ?? null,
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
        name_lg: comp.nation_name_lg || comp.nation_name || null,
        name_sh: comp.nation_name_sh || null,
        name_3l: comp.nation_name_3l || comp.nation_three_letter || null,
      }
    : null;

  const confed = comp.confed
    ? mapConfedRef(comp.confed)
    : comp.confederation
    ? mapConfedRef(comp.confederation)
    : comp.confed_id
    ? {
        id: String(comp.confed_id),
        name: comp.confed_name || null,
      }
    : comp.nation?.confed
    ? mapConfedRef(comp.nation.confed)
    : comp.nation?.confederation
    ? mapConfedRef(comp.nation.confederation)
    : comp.nation?.confed_id || comp.nation?.confederation_id
    ? {
        id: String(comp.nation.confed_id || comp.nation.confederation_id),
        name: comp.nation.confed_name || comp.nation.confed?.name || comp.nation.confederation?.name || null,
      }
    : null;

  const parent_comp = comp.parent_comp
    ? mapParentRef(comp.parent_comp)
    : comp.parent
    ? mapParentRef(comp.parent)
    : comp.parent_id
    ? {
        id: String(comp.parent_id),
        name_lg: comp.parent_name_lg || null,
        name_sh: comp.parent_name_sh || null,
        name_3l: comp.parent_name_3l || comp.parent_three_letter || null,
      }
    : null;

  const clubCount =
    comp.clubs_count !== undefined
      ? Number(comp.clubs_count)
      : comp.clubsCount !== undefined
      ? Number(comp.clubsCount)
      : extraStats?.club !== undefined
      ? Number(extraStats.club)
      : 0;

  const awardCount =
    comp.awards_count !== undefined
      ? Number(comp.awards_count)
      : comp.awardsCount !== undefined
      ? Number(comp.awardsCount)
      : extraStats?.award !== undefined
      ? Number(extraStats.award)
      : 0;

  const childrenCount =
    comp.children_count !== undefined
      ? Number(comp.children_count)
      : comp.childrenCount !== undefined
      ? Number(comp.childrenCount)
      : extraStats?.children !== undefined
      ? Number(extraStats.children)
      : 0;

  return {
    id: String(comp.id),
    name: comp.name_sh ?? comp.name_lg ?? comp.name ?? null,
    name_lg: comp.name_lg ?? comp.name ?? null,
    name_sh: comp.name_sh ?? null,
    name_3l: comp.name_3l ?? null,
    fg_color: comp.fg_color ?? null,
    bg_color: comp.bg_color ?? null,
    type: comp.type ?? comp.categories ?? null,
    note: comp.note ?? null,
    inactive_fields: comp.inactive_fields ?? null,
    confed,
    parent_comp,
    nation,
    stats: {
      club: clubCount,
      award: awardCount,
      children: childrenCount,
    },
  };
}

export function mapClub(club: any) {
  if (!club) return null;
  const nation = club.nation
    ? mapNationRef(club.nation)
    : club.nation_id
    ? {
        id: String(club.nation_id),
        name_lg: club.nation_name_lg || club.nation_name || null,
        name_sh: club.nation_name_sh || null,
        name_3l: club.nation_name_3l || club.nation_three_letter || null,
        confed: null,
      }
    : null;

  const comp = club.competition || club.comp
    ? mapCompRef(club.competition || club.comp)
    : club.comp_id
    ? {
        id: String(club.comp_id),
        name_lg: club.comp_name_lg || club.competition_name || null,
        name_sh: club.comp_name_sh || null,
        name_3l: club.comp_name_3l || club.comp_three_letter || null,
      }
    : null;

  const affClubEntity = club.affiliateClub || club.affiliate_club || club.parent_club;
  const affId = club.affiliate_club_id ?? club.affiliate_club?.id ?? club.parent_id ?? null;
  const affType = club.affiliate_club_type ?? club.affiliate_club?.type ?? club.affiliate_type ?? null;

  const affiliateClub = (affClubEntity || affId)
    ? {
        id: String(affClubEntity?.id || affId),
        name_lg: affClubEntity?.name_lg ?? affClubEntity?.name ?? null,
        name_sh: affClubEntity?.name_sh ?? null,
        name_6l: affClubEntity?.name_6l ?? null,
        name_3l: affClubEntity?.name_3l ?? null,
        type: affType ? String(affType) : null,
      }
    : null;

  const confed = club.confed
    ? mapConfedRef(club.confed)
    : club.confederation
    ? mapConfedRef(club.confederation)
    : nation?.confed
    ? nation.confed
    : null;

  return {
    id: String(club.id),
    name: club.name_sh ?? club.name_lg ?? club.name ?? null,
    name_lg: club.name_lg ?? club.name ?? null,
    name_sh: club.name_sh ?? null,
    name_6l: club.name_6l ?? null,
    name_3l: club.name_3l ?? null,
    note: club.note ?? null,
    inactive_fields: club.inactive_fields ?? null,
    is_extinct: !!club.is_extinct,
    affiliate_club: affiliateClub,
    nation,
    confed,
    comp,
    ...(club.affiliates_count !== undefined
      ? { affiliatesCount: club.affiliates_count }
      : club.affiliatesCount !== undefined
      ? { affiliatesCount: club.affiliatesCount }
      : {}),
    ...(club.affiliates ? { affiliates: club.affiliates.map((a: any) => mapClub(a)) } : {}),
  };
}

export function mapCity(city: any) {
  if (!city) return null;
  const nation = city.nation
    ? mapNationRef(city.nation)
    : (city.nation_id || city.country_id)
    ? {
        id: String(city.nation_id || city.country_id),
        name_lg: city.nation_name_lg || city.nation_name || null,
        name_sh: city.nation_name_sh || null,
        name_3l: city.nation_name_3l || city.nation_three_letter || null,
      }
    : null;

  const regEntity = city.regionEntity;
  const regName = regEntity?.name ?? null;
  const cleanRegionName = regName || (city.region ? String(city.region).replace(/^\[[^\]]+\]\s*/, '').trim() : null);

  return {
    id: String(city.id),
    name: city.name,
    name_lg: city.name_lg ?? city.name ?? null,
    name_sh: city.name_sh ?? null,
    region: cleanRegionName,
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
        name_lg: stadium.nation_name_lg || stadium.nation_name || null,
        name_sh: stadium.nation_name_sh || null,
        name_3l: stadium.nation_name_3l || stadium.nation_three_letter || null,
      }
    : null;

  return {
    id: String(stadium.id),
    name: stadium.name,
    name_lg: stadium.name_lg ?? stadium.name ?? null,
    name_sh: stadium.name_sh ?? null,
    type: stadium.type || 'stadium',
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
        name_lg: award.nation_name_lg || award.nation_name || null,
        name_sh: award.nation_name_sh || null,
        name_3l: award.nation_name_3l || award.nation_three_letter || null,
      }
    : null;

  const comp = award.competition
    ? mapCompRef(award.competition)
    : award.comp_id
    ? {
        id: String(award.comp_id),
        name_lg: award.comp_name_lg || award.competition_name || null,
        name_sh: award.comp_name_sh || null,
        name_3l: award.comp_name_3l || award.comp_three_letter || null,
      }
    : null;

  return {
    id: String(award.id),
    name: award.name_sh ?? award.name_lg ?? award.name ?? null,
    name_lg: award.name_lg ?? award.name ?? null,
    name_sh: award.name_sh ?? null,
    name_3l: award.name_3l ?? null,
    nation,
    comp,
  };
}

export function mapRegion(region: any) {
  if (!region) return null;
  return {
    id: region.id,
    name: region.name,
    name_lg: region.name_lg ?? region.name ?? null,
    name_sh: region.name_sh ?? null,
    code: region.code || null,
    nation_id: region.nation_id ? String(region.nation_id) : null,
    nation: region.nation ? mapNationRef(region.nation) : null,
    citiesCount: region.citiesCount ?? (region.cities ? region.cities.length : undefined),
  };
}
