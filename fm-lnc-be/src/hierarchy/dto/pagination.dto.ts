import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for pagination and sorting: {path}?page=0&size=10&sort=property,asc
 */
export class PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Zero-based page index (0..N)',
    default: 0,
    type: Number,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'The size of the page to be returned',
    default: 10,
    type: Number,
  })
  size?: number;

  @ApiPropertyOptional({
    description:
      'Sorting criteria in the format: property,(asc|desc). Default sort order is ascending. Multiple sort criteria are supported.',
    type: [String],
    example: ['name,asc'],
  })
  sort?: string | string[];

  keyword?: string;
}

/**
 * Request payload body for searching and filtering: { keyword: "string" }
 */
export class SearchFilterDto {
  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm (tên, ID, mã ký tự, ...)',
    type: String,
    example: 'string',
    required: false,
  })
  keyword?: string;

  page?: number;
  size?: number;
  sort?: string | string[];
}

/**
 * Combined DTO for pagination and search
 */
export class PaginationQueryDto extends SearchFilterDto {
  @ApiPropertyOptional({
    description: 'Zero-based page index (0..N)',
    default: 0,
    type: Number,
    required: false,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'The size of the page to be returned',
    default: 10,
    type: Number,
    required: false,
  })
  size?: number;

  @ApiPropertyOptional({
    description: 'Sorting criteria in the format: property,(asc|desc)',
    type: [String],
    required: false,
  })
  sort?: string | string[];
}

export class NationSearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID liên đoàn châu lục (có thể null)',
    type: String,
    required: false,
  })
  confedId?: string;
}

export class IntCompetitionSearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID liên đoàn châu lục (có thể null)',
    type: String,
    required: false,
  })
  confedId?: string;
}

export class DomesticCompetitionSearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID quốc gia (có thể null)',
    type: String,
    required: false,
  })
  nationId?: string;
}

export class CompetitionListFilterDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID liên đoàn châu lục',
    type: String,
    required: false,
  })
  confedId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID quốc gia',
    type: String,
    required: false,
  })
  nationId?: string;

  @ApiPropertyOptional({
    description: 'Lọc giải đấu quốc tế (true/false)',
    type: Boolean,
    required: false,
  })
  isInternational?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo loại giải đấu (league, cup, youth)',
    type: String,
    required: false,
  })
  category?: string;

  @ApiPropertyOptional({
    description: 'Chỉ lấy giải đấu cấp cao nhất (parent_id IS NULL)',
    type: Boolean,
    required: false,
  })
  topLevelOnly?: boolean;
}

export class IndependentClubSearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID quốc gia (có thể null)',
    type: String,
    required: false,
  })
  nationId?: string;

  @ApiPropertyOptional({
    description: 'Lọc CLB đã giải thể (true/false)',
    type: String,
    required: false,
  })
  extinct?: string | boolean;
}

export class CitySearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID quốc gia (có thể null)',
    type: String,
    required: false,
  })
  nationId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo phân loại vùng miền/category',
    type: String,
    required: false,
  })
  category?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo Region ID',
    type: Number,
    required: false,
  })
  regionId?: number;
}

export class NationScopedSearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID quốc gia (có thể null)',
    type: String,
    required: false,
  })
  nationId?: string;
}

export class CompScopedSearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID giải đấu (có thể null)',
    type: String,
    required: false,
  })
  compId?: string;
}

export class ClubSearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID quốc gia (có thể null)',
    type: String,
    required: false,
  })
  nationId?: string;

  @ApiPropertyOptional({
    description:
      'Lọc theo ID giải đấu (có thể null, hoặc "oth-{nationId}" cho other clubs, "ext-{nationId}" cho extinct clubs)',
    type: String,
    required: false,
  })
  compId?: string;
}

export class AwardSearchQueryDto extends PageableQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID quốc gia (có thể null)',
    type: String,
    required: false,
  })
  nationId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID giải đấu (có thể null)',
    type: String,
    required: false,
  })
  compId?: string;
}

// Backward compatibility aliases
export { NationSearchQueryDto as NationListFilterDto };
export { IntCompetitionSearchQueryDto as IntCompetitionFilterDto };
export { DomesticCompetitionSearchQueryDto as DomesticCompetitionFilterDto };
export { IndependentClubSearchQueryDto as IndependentClubFilterDto };
export { CitySearchQueryDto as CityFilterDto };
export { NationScopedSearchQueryDto as NationScopedFilterDto };
export { CompScopedSearchQueryDto as CompScopedFilterDto };
export { ClubSearchQueryDto as ClubSearchFilterDto };
export { AwardSearchQueryDto as AwardFilterDto };
