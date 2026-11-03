# Kế Hoạch Chuyển Đổi Backend sang Java (Spring Boot 3.x)

Tài liệu đặc tả kỹ thuật và lộ trình chuyển đổi toàn bộ hệ thống **FM24 LNC Manager Backend** từ **NestJS (Node.js / TypeScript / TypeORM)** tại `fm-lnc-be` sang **Java 21 + Spring Boot 3.x**, đảm bảo **tương thích 100% API Contract** với Frontend Next.js (`fm-lnc-fe`) và giữ nguyên cơ sở dữ liệu PostgreSQL hiện có.

---

## 1. Kiến Trúc & Công Nghệ Đề Xuất (Tech Stack)

| Thành phần | Hiện tại (NestJS) | Chuyển đổi sang (Java) | Lý do lựa chọn |
| :--- | :--- | :--- | :--- |
| **Ngôn ngữ & Runtime** | Node.js / TypeScript 5.3 | **Java 21 LTS** | Hỗ trợ Virtual Threads (Project Loom), Records, Pattern Matching, tối ưu bộ nhớ và tốc độ xử lý chuỗi khi parse/export file `.lnc`. |
| **Framework** | NestJS 10.3 (`@nestjs/platform-express`) | **Spring Boot 3.3+** (`spring-boot-starter-web`) | Kiến trúc Dependency Injection, Controller, Service, Interceptor, Filter tương đồng 1-1 với NestJS. |
| **Database & ORM** | TypeORM 0.3 + `pg` | **Spring Data JPA (Hibernate 6)** + **JdbcTemplate** | Dùng JPA cho CRUD cơ bản và quan hệ Entity; dùng `NamedParameterJdbcTemplate` / `JdbcTemplate` cho các truy vấn CTE đệ quy (`WITH RECURSIVE`), thống kê `Hierarchy` và batch upsert tốc độ cao. |
| **Database Migration** | `startup-migrations.ts` | **Flyway** + `ApplicationRunner` | Quản lý DDL chuẩn hóa qua Flyway (`V1__init_schema.sql`) kết hợp `StartupMigrationRunner` để tự động đồng bộ `parent_id`, `affiliate_club`, `regions` khi khởi động. |
| **API Documentation** | `@nestjs/swagger` | **SpringDoc OpenAPI 2.x** (`springdoc-openapi-starter-webmvc-ui`) | Tự động sinh OpenAPI 3 & Swagger UI tại `/docs` và `/api/docs`. |
| **JSON & Boilerplate** | TypeScript Interfaces / Classes | **Jackson** + **Lombok** | Giảm boilerplate code, dễ dàng ánh xạ `snake_case` (`name_lg`, `name_sh`, `inactive_fields`) và `camelCase` (`totalElements`, `citiesCount`, `affiliatesCount`). |
| **Build Tool** | npm / Nest CLI | **Maven** (`pom.xml`) | Chuẩn hóa quản lý dependency, đóng gói single executable JAR. |

---

## 2. Cấu Trúc Thư Mục Dự Án Java (`fm-lnc-be-java`)

```text
fm-lnc-be-java/
├── pom.xml
├── app-config.json                          # File cấu hình đường dẫn LNC & Logos (giữ nguyên định dạng)
├── src/main/resources/
│   ├── application.yml                      # Cấu hình port 3001, PostgreSQL, Multipart/JSON 50MB, Swagger
│   └── db/migration/
│       └── V1__ensure_schema.sql            # DDL đảm bảo bảng, cột VARCHAR(64), FK và Indexes
└── src/main/java/com/fm24/lnc/
    ├── FmLncApplication.java
    ├── config/
    │   ├── WebCorsConfig.java               # CORS (origin: *, credentials: true) & payload limits
    │   ├── OpenApiConfig.java               # Cấu hình Swagger UI (/docs, /api/docs) + Envelope wrapper
    │   └── VirtualThreadConfig.java         # Executor dùng Virtual Threads cho Search & Batch I/O
    ├── common/
    │   ├── ApiResponseBody.java             # Envelope chuẩn: { status, success, message, data, error, timestamp, path, correlationId }
    │   ├── ApiErrorDetail.java              # { code, message, validationErrors }
    │   ├── PageData.java                    # { content, page, size, totalElements, totalPages, hasPrevious, hasNext, first, last }
    │   ├── RawResponse.java                 # Annotation @RawResponse bỏ qua bọc envelope (dùng cho Logos, Export LNC, Health)
    │   ├── ResponseEnvelopeAdvice.java      # implements ResponseBodyAdvice<Object> (thay thế ResponseEnvelopeInterceptor)
    │   ├── GlobalExceptionHandler.java      # @RestControllerAdvice (thay thế AllExceptionsFilter)
    │   ├── EntityMapper.java                # Chuyển đổi Entity/Row -> DTO chuẩn cho FE (mapNation, mapCompetition, mapClub...)
    │   └── PaginationUtil.java              # Sort đa tiêu chí (_competitionRank, _cityRemoveRank, localeCompare numeric) & phân trang
    ├── entity/
    │   ├── ConfederationEnum.java           # CAF, AFC, UEFA, CONCACAF, OFC, CONMEBOL, WORLD, EXTINCT + normalizeConfed()
    │   ├── Nation.java                      # Bảng nations (PK: String VARCHAR(64))
    │   ├── Region.java                      # Bảng regions (PK: Integer SERIAL)
    │   ├── City.java                        # Bảng cities (PK: String VARCHAR(64))
    │   ├── Competition.java                 # Bảng competitions (PK: String VARCHAR(64))
    │   ├── Club.java                        # Bảng clubs (PK: String VARCHAR(64))
    │   ├── Stadium.java                     # Bảng stadiums (PK: String VARCHAR(64))
    │   ├── Award.java                       # Bảng awards (PK: String VARCHAR(64))
    │   └── Person.java                      # Bảng people (PK: String VARCHAR(64))
    ├── repository/
    │   ├── NationRepository.java
    │   ├── RegionRepository.java
    │   ├── CityRepository.java
    │   ├── CompetitionRepository.java
    │   ├── ClubRepository.java
    │   ├── StadiumRepository.java
    │   ├── AwardRepository.java
    │   └── PersonRepository.java
    ├── database/
    │   ├── StartupMigrationRunner.java      # ApplicationRunner chạy kiểm tra schema & seed parent_id / affiliate / regions
    │   └── ParentMappings.java              # Danh sách cặp [childCompId, parentCompId] từ parent-mappings.ts
    └── module/
        ├── health/
        │   └── HealthController.java        # GET /health, GET /api/health
        ├── appconfig/
        │   ├── AppConfigController.java     # /api/config (GET, PUT, POST test, POST sync, POST reload-logos)
        │   ├── AppConfigService.java
        │   └── dto/
        ├── logos/
        │   ├── LogosController.java         # /api/logos/{confederation|nation|competition|club}/{id}
        │   └── LogosService.java            # Quét thư mục ảnh + parse config.xml bằng Regex & ConcurrentHashMap cache
        ├── lnc/
        │   ├── LncController.java           # /api/lnc/* và /api/fm/* (export, import, upload, status)
        │   ├── LncService.java              # Xuất nội dung .LNC chuẩn (exportLnc)
        │   └── LncParserService.java        # Đọc 3 file .LNC & Batch Upsert vào PostgreSQL
        ├── records/
        │   ├── RecordsController.java       # /api/records/:type (GET info, GET one, POST, PUT, DELETE)
        │   └── RecordsService.java          # CRUD + normalizeInputData()
        ├── search/
        │   ├── SearchController.java        # GET & POST /api/search
        │   └── SearchService.java           # Tìm kiếm song song trên 7 bảng với Virtual Threads
        └── hierarchy/
            ├── HierarchyController.java     # 21 endpoints dưới /api/hierarchy/*
            ├── HierarchyService.java        # UnitTree, Confederations, Nations, Comps, Clubs, Cities, Stadiums, Awards, Players
            └── dto/                         # UnitTreeNode, SearchFilterDto, PageableQueryDto...
```

---

## 3. Thiết Kế Chi Tiết Từng Phân Hệ

### 3.1. Chuẩn Hóa Response Envelope & Xử Lý Lỗi (`common`)

Frontend Next.js hiện đang phụ thuộc vào cấu trúc bọc response của `ResponseEnvelopeInterceptor` và `AllExceptionsFilter`.

1. **Cấu trúc `ApiResponseBody<T>`**:
   ```java
   public record ApiResponseBody<T>(
       int status,
       boolean success,
       String message,
       T data,
       ApiErrorDetail error,
       long timestamp,
       String path,
       String correlationId
   ) {}
   ```
2. **`@RawResponse` Annotation**:
   * Đánh dấu trên `HealthController`, `LogosController`, và `LncController.exportLnc()`.
   * `ResponseEnvelopeAdvice` (implement `ResponseBodyAdvice<Object>`) sẽ bỏ qua không bọc JSON nếu method/class có `@RawResponse` hoặc kiểu trả về là `Resource` / `byte[]` / `String` (khi xuất file `.lnc`).
   * Mọi API thông thường khác (kể cả `POST`) đều được đặt HTTP Status = `200 OK` và bọc trong `ApiResponseBody` giống hệt hành vi hiện tại của NestJS.
3. **Correlation ID**:
   * Đọc từ header `x-correlation-id` hoặc `x-request-id`; nếu không có thì sinh `UUID.randomUUID().toString()` và gắn vào response header `X-Correlation-Id`.

---

### 3.2. Thiết Kế Database Entities (`entity`)

Giữ nguyên 100% schema PostgreSQL hiện tại (`fm_lnc_db`):

| Entity | Tên bảng | Khóa chính (`@Id`) | Các cột & Quan hệ chính |
| :--- | :--- | :--- | :--- |
| **`Nation`** | `nations` | `String id` (`VARCHAR(64)`) | `name_lg`, `name_sh`, `name_3l`, `confed` (`VARCHAR(32)`), `inactive_fields`, `note`. OneToMany: `cities`, `competitions`, `clubs`, `stadiums`, `awards`, `regions`. |
| **`Region`** | `regions` | `Integer id` (`SERIAL`) | `name`, `code`, `nation_id`, `created_at`. Unique constraint: `(nation_id, name)`. |
| **`City`** | `cities` | `String id` (`VARCHAR(64)`) | `name`, `nation_id`, `region` (text), `region_id` (int), `is_disabled` (boolean). ManyToOne: `nation`, `regionEntity`. |
| **`Competition`** | `competitions` | `String id` (`VARCHAR(64)`) | `name_lg`, `name_sh`, `name_3l`, `fg_color`, `bg_color`, `confed`, `nation_id`, `type`, `parent_id`, `note`, `inactive_fields`. ManyToOne: `nation`, `parent`. |
| **`Club`** | `clubs` | `String id` (`VARCHAR(64)`) | `name_lg`, `name_sh`, `name_6l`, `name_3l`, `nation_id`, `comp_id`, `affiliate_club_id`, `affiliate_club_type`, `note`, `inactive_fields`, `is_extinct`. ManyToOne: `nation`, `competition`, `affiliateClub`. |
| **`Stadium`** | `stadiums` | `String id` (`VARCHAR(64)`) | `name`, `nation_id`, `is_disabled`, `type` (mặc định `'stadium'`). ManyToOne: `nation`. |
| **`Award`** | `awards` | `String id` (`VARCHAR(64)`) | `name_lg`, `name_sh`, `nation_id`, `comp_id`, `inactive_fields`. ManyToOne: `nation`, `competition`. |
| **`Person`** | `people` | `String id` (`VARCHAR(64)`) | `first_name`, `common_name`, `second_name`. |

---

### 3.3. Ánh Xạ Toàn Bộ Hệ Thống API Endpoints

#### A. Nhóm Health & Config & Logos
| Method | Endpoint | Controller (Java) | Mô tả xử lý |
| :--- | :--- | :--- | :--- |
| `GET` | `/health`, `/api/health` | `HealthController` | `@RawResponse` — Trả về `{ status: "ok", timestamp }`. |
| `GET` | `/api/config` | `AppConfigController` | Đọc `app-config.json`, kiểm tra sự tồn tại của 3 file `.lnc` và 4 thư mục logo, đếm số file. |
| `PUT` | `/api/config` | `AppConfigController` | Cập nhật đường dẫn `lncDir`, `confedLogoDir`, `nationLogoDir`, `compLogoDir`, `clubLogoDir`, lưu `app-config.json` và reload `LogosService`. |
| `POST` | `/api/config/test` | `AppConfigController` | Kiểm tra đường dẫn bất kỳ trên đĩa (`exists`, `isDirectory`, `fileCount`, `preview` 10 phần tử đầu). |
| `POST` | `/api/config/sync` | `AppConfigController` | Gọi `lncParserService.parseAndSeed()` với thư mục đang cấu hình. |
| `POST` | `/api/config/reload-logos` | `AppConfigController` | Quét lại thư mục ảnh và nạp lại bộ nhớ đệm map ID $\rightarrow$ Path. |
| `GET` | `/api/logos/confederation/{id}` | `LogosController` | `@RawResponse` — Trả file PNG với `Cache-Control: public, max-age=604800, immutable`. |
| `GET` | `/api/logos/nation/{id}?code=` | `LogosController` | `@RawResponse` — Ưu tiên tìm theo `id`, sau đó `code` (3 chữ cái), hoặc mapping từ `config.xml`. |
| `GET` | `/api/logos/competition/{id}` | `LogosController` | `@RawResponse` — Tìm trong cache (đã quét đệ quy tối đa 3 cấp thư mục + `config.xml`). |
| `GET` | `/api/logos/club/{id}` | `LogosController` | `@RawResponse` — Tương tự competition logo. |

#### B. Nhóm LNC Import / Export (`/api/lnc` & `/api/fm`)
| Method | Endpoint | Controller (Java) | Mô tả xử lý |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/lnc/export?download=` | `LncController` | `@RawResponse` — Kết xuất toàn bộ 7 thực thể ra định dạng `.LNC` chuẩn. Nếu `download=true`, gắn header `Content-Disposition: attachment; filename="FM24_Merged_Names.lnc"`. |
| `POST` | `/api/lnc/import` | `LncController` | Đọc 3 file (`fm24_geography.lnc`, `fm24_club.lnc`, `fm24_competition_other.lnc`) từ đĩa và chạy Batch Upsert vào DB. |
| `POST` | `/api/lnc/upload` | `LncController` | Nhận mảng `{ name, content }`, ghi xuống thư mục `data`, tự động gọi `parseAndSeed()` và trả về `stats`. |
| `GET` | `/api/lnc/status` | `LncController` | Đếm tổng số bản ghi của `confederations` (8), `nations`, `cities`, `competitions`, `clubs`, `stadiums`, `awards`, `people`. |

#### C. Nhóm Records CRUD (`/api/records`)
| Method | Endpoint | Controller (Java) | Mô tả xử lý |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/records/{type}/{id}/info` | `RecordsController` | Gọi `hierarchyService.getEntityInfo(type, id)` để lấy chi tiết kèm object quan hệ và bộ đếm. |
| `GET` | `/api/records/{type}/{id}` | `RecordsController` | Lấy bản ghi phẳng theo `type` (`nation`, `competition`, `club`, `stadium`, `city`, `award`, `person`/`player`, `region`). |
| `POST` | `/api/records/{type}` | `RecordsController` | Chuẩn hóa dữ liệu đầu vào qua `normalizeInputData()`, kiểm tra trùng ID, lưu bản ghi mới. |
| `PUT` | `/api/records/{type}/{id}` | `RecordsController` | Chuẩn hóa dữ liệu đầu vào, tự động đồng bộ tên `region` khi cập nhật `region_id` của City, lưu cập nhật. |
| `DELETE` | `/api/records/{type}/{id}` | `RecordsController` | Xóa bản ghi theo ID, trả về `{ success: true, message }`. |

#### D. Nhóm Search Toàn Văn (`/api/search`)
| Method | Endpoint | Controller (Java) | Mô tả xử lý |
| :--- | :--- | :--- | :--- |
| `GET`, `POST` | `/api/search` | `SearchController` | Nhận `keyword` và `limit` (mặc định 20) từ cả Query lẫn Body. Dùng Virtual Threads truy vấn song song 7 bảng (`clubs`, `competitions`, `nations`, `stadiums`, `cities`, `awards`, `players`) theo `ILIKE` và khớp chính xác `id` nếu `keyword` là số. |

#### E. Nhóm Hierarchy & Phân Trang (`/api/hierarchy`)
| Method | Endpoint | Mô tả xử lý đặc thù cần giữ nguyên |
| :--- | :--- | :--- |
| `GET` | `/list-confederations` | Trả về 8 liên đoàn (`CAF`, `AFC`, `UEFA`, `CONCACAF`, `OFC`, `CONMEBOL`, `WORLD`, `EXTINCT`) kèm `stats: { nations, intComps }`. |
| `GET` | `/tree`, `/unit-tree` | Trả về cây phân cấp `UnitTreeNode[]` tùy biến theo tham số `type` (`comp`, `club`, `city`, `stadium`, `nation`, `award`). |
| `POST` | `/nations/search` | Tìm kiếm & phân trang quốc gia theo `confedId`, `keyword`, kèm thống kê `comps`, `clubs`, `stadiums`, `cities`, `awards`. |
| `POST` | `/int-competitions/search` | Tìm kiếm giải đấu quốc tế (`nation_id IS NULL` và `parent_id IS NULL`), tính đệ quy `clubs_count`, `awards_count`, `children_count`. |
| `POST` | `/domestic-competitions/search` | Tìm kiếm giải đấu quốc nội theo `nationId`, hỗ trợ lọc theo giải cha/con, sắp xếp theo `_competitionRank` (League $\rightarrow$ Cup $\rightarrow$ Youth $\rightarrow$ Other $\rightarrow$ Extinct). |
| `POST` | `/club/search` | Hỗ trợ lọc theo `nationId`, `compId`, bao gồm cả mã ảo `compId = "oth-{nationId}"` (CLB không thuộc giải nào & chưa giải thể) và `compId = "ext-{nationId}"` (CLB đã giải thể), hoặc lọc CLB độc lập/đội con. |
| `POST` | `/stadiums/search` | Lọc theo `nationId`, `type` (`stadium` / `training pitch`), `keyword`. |
| `POST` | `/cities/search` | Lọc theo `nationId`, `regionId` (hoặc `region` text), đẩy các thành phố có `region = '[REMOVE]'` xuống cuối thông qua `_cityRemoveRank`. |
| `GET`, `POST` | `/regions`, `/regions/search`, `/nations/{nationId}/regions` | Lấy danh sách vùng/miền kèm `citiesCount` (số thành phố thuộc vùng đó). |
| `POST`, `GET` | `/awards/search`, `/awards`, `/competitions/{compId}/awards` | Tìm kiếm giải thưởng theo quốc gia, giải đấu hoặc toàn cục. |
| `GET` | `/continents/{id}/info`, `/nations/{id}/info`, `/nations/{id}/hub` | Trả về thông tin tổng hợp (Hub) và bộ đếm chi tiết cho từng châu lục / quốc gia. |
| `GET` | `/clubs/{id}/info`, `/clubs/{id}/affiliates` | Chi tiết CLB và danh sách các đội con/đội dự bị (`affiliate_club_id = :id`). |
| `GET` | `/cities/{id}/info`, `/stadiums/{id}/info`, `/awards/{id}/info`, `/regions/{id}/info`, `/competitions/{id}/info` | Chi tiết từng thực thể đã qua `EntityMapper`. |
| `POST` | `/competitions/{id}/sub-competitions` | Danh sách giải đấu con trực thuộc giải đấu cha (`parent_id = :id`). |
| `POST` | `/players` | Phân trang và tìm kiếm danh sách cầu thủ/nhân sự (`people`). |

---

## 4. Điểm Khác Biệt & Tối Ưu Hóa Khi Sang Java

1. **Tối ưu tốc độ Import `.LNC` (nhanh hơn 5–10 lần)**:
   * Trong NestJS hiện tại (`lnc-parser.service.ts`), việc import hàng chục nghìn dòng (`cities`, `clubs`, `stadiums`, `competitions`) đang chạy `await queryRunner.query(...)` tuần tự từng bản ghi trong vòng lặp `for`.
   * Khi sang Spring Boot, `LncParserService` sẽ gom dữ liệu vào `List<Object[]>` và gọi `jdbcTemplate.batchUpdate(sql, batchArgs, 1000)` kết hợp tham số kết nối PostgreSQL `reWriteBatchedInserts=true`. Toàn bộ quá trình parse & seed 3 file `.lnc` (~35.000+ bản ghi) sẽ chỉ mất khoảng **0.5 – 1.5 giây**.
2. **Xử lý linh hoạt Query Params + Request Body**:
   * Nhiều API `POST .../search` của hệ thống hiện cho phép truyền tham số phân trang/lọc qua cả URL Query (`?page=0&size=20&nationId=560`) lẫn JSON Body (`{ "keyword": "arsenal" }`).
   * Trong Spring Boot, tạo một utility `FilterMergeUtil.merge(queryDto, bodyDto)` để luôn hợp nhất cả hai nguồn giống hệt biểu thức `{ ...query, ...body }` của TypeScript.
3. **Sắp xếp tự nhiên (Natural / Numeric Sort) trong `PaginationUtil`**:
   * Trong TypeScript đang dùng `String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })`.
   * Trong Java, cài đặt bộ `NaturalOrderComparator` (so sánh các cụm chữ số theo giá trị số học, không phân biệt hoa thường/dấu) để kết quả sắp xếp trên UI khớp 100%.

---

## 5. Lộ Trình Thực Hiện (Implementation Checklist)

- [ ] **Bước 1: Khởi tạo khung dự án Spring Boot 3**
  - [ ] Tạo `pom.xml` (Spring Web, Spring Data JPA, PostgreSQL Driver, Flyway, Lombok, SpringDoc OpenAPI, Jackson).
  - [ ] Thiết lập `application.yml` (cổng `3001`, kết nối DB `fm_lnc_db`, cấu hình `reWriteBatchedInserts=true`).
  - [ ] Viết `ApiResponseBody`, `@RawResponse`, `ResponseEnvelopeAdvice`, `GlobalExceptionHandler`, `WebCorsConfig`.
- [ ] **Bước 2: Tầng Database, Entities & Startup Migrations**
  - [ ] Tạo 8 JPA Entities + `ConfederationEnum` + 8 Spring Data Repositories.
  - [ ] Chuyển đổi `startup-migrations.ts` và `parent-mappings.ts` sang `StartupMigrationRunner` để đảm bảo tính toàn vẹn schema và dữ liệu liên kết.
- [ ] **Bước 3: Xây dựng Common Mapper & Pagination**
  - [ ] Chuyển đổi `entity-mapper.ts` sang `EntityMapper.java`.
  - [ ] Chuyển đổi `pagination.util.ts` sang `PaginationUtil.java` (hỗ trợ `_competitionRank`, `_cityRemoveRank`, natural sort).
- [ ] **Bước 4: Chuyển đổi các Module Nghiệp vụ**
  - [ ] Module `Health` (`/health`, `/api/health`).
  - [ ] Module `Logos` (`/api/logos/*`) và `Config` (`/api/config/*`).
  - [ ] Module `LNC` (`/api/lnc/*`, `/api/fm/*` — Export & Batch Import/Upload).
  - [ ] Module `Records` (`/api/records/*` — CRUD & `normalizeInputData`).
  - [ ] Module `Search` (`/api/search` — tìm kiếm song song với Virtual Threads).
  - [ ] Module `Hierarchy` (`/api/hierarchy/*` — Unit Tree, Hub info, Search endpoints).
- [ ] **Bước 5: Kiểm thử tích hợp với Frontend (`fm-lnc-fe`)**
  - [ ] Kiểm tra Swagger UI tại `http://localhost:3001/docs`.
  - [ ] Kiểm tra toàn bộ màn hình trên `fm-lnc-fe` (Nations, Competitions, Clubs, Cities, Stadiums, Awards, Players, Settings Modal, Import/Export LNC).

