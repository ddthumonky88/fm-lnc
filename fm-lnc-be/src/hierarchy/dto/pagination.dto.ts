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

  @ApiPropertyOptional({
    description: 'Alias cho keyword',
    type: String,
    required: false,
  })
  q?: string;

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

export class NationListFilterDto extends SearchFilterDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID liên đoàn châu lục',
    type: String,
    required: false,
  })
  confedId?: string;
}

export class CompetitionListFilterDto extends SearchFilterDto {
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
}

export class IndependentClubFilterDto extends SearchFilterDto {
  @ApiPropertyOptional({
    description: 'Lọc CLB đã giải thể (true/false)',
    type: String,
    required: false,
  })
  extinct?: string | boolean;
}

export class CityFilterDto extends SearchFilterDto {
  @ApiPropertyOptional({
    description: 'Lọc theo phân loại vùng miền/category',
    type: String,
    required: false,
  })
  category?: string;
}
