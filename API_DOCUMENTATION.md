# Tài Liệu Danh Sách API - FM LNC Manager

> **Hệ thống**: Quản lý và Khám phá Dữ liệu Football Manager (`.lnc` - Licence & Name Changes)  
> **Backend Framework**: NestJS 10 + TypeORM + PostgreSQL  
> **Swagger UI**: `http://localhost:3001/docs` hoặc `http://localhost:3001/api/docs`  
> **Base URL mặc định**: `http://localhost:3001` (hoặc `http://127.0.0.1:3001`)

---

## 📑 Mục lục

1. [Tổng quan & Cấu trúc API](#1-tổng-quan--cấu-trúc-api)
2. [Health Check API](#2-health-check-api)
3. [Hierarchy API (Cấu trúc phân cấp dữ liệu)](#3-hierarchy-api-cấu-trúc-phân-cấp-dữ-liệu)
   - [3.1. Confederations (Châu lục / Liên đoàn)](#31-confederations-châu-lục--liên-đoàn)
   - [3.2. Nations (Quốc gia)](#32-nations-quốc-gia)
   - [3.3. Competitions (Giải đấu)](#33-competitions-giải-đấu)
   - [3.4. Clubs (Câu lạc bộ)](#34-clubs-câu-lạc-bộ)
   - [3.5. Sân vận động, Thành phố, Giải thưởng, Nhân sự, Vòng đấu](#35-sân-vận-động-thành-phố-giải-thưởng-nhân-sự-vòng-đấu)
4. [Records API (CRUD & Entity Info)](#4-records-api-crud--entity-info)
5. [Search API (Tìm kiếm toàn văn)](#5-search-api-tìm-kiếm-toàn-văn)
6. [LNC File API (Export & Import)](#6-lnc-file-api-export--import)
7. [Logos API (Serve hình ảnh logo & cờ)](#7-logos-api-serve-hình-ảnh-logo--cờ)
8. [Swagger & OpenAPI Specs](#8-swagger--openapi-specs)

---

## 1. Tổng quan & Cấu trúc API

Toàn bộ hệ thống API tuân theo chuẩn RESTful JSON:
- Các định danh thực thể (`id`, `parent_id`, `nation_id`, `comp_id`, `confed_id`,...) được định dạng thống nhất dạng chuỗi (`string` / `VARCHAR(64)`).
- **Quy tắc phân cấp giải đấu:**
  - `GET /api/hierarchy/nations/:id/competitions`: **Chỉ trả về các giải đấu quốc nội cấp cha (`parent_id IS NULL`)** của quốc gia đó.
  - `GET /api/hierarchy/competitions/:id/sub-competitions`: **Trả về danh sách giải đấu con / phân hạng trực thuộc giải đấu cha `{id}` (`parent_id = :id`)**.
- **Hệ thống API `/info`:** Cung cấp thông tin chi tiết đầy đủ kèm quan hệ cha/con và các bộ đếm thống kê cho 7 thực thể chính:
  - `confederation`, `nation`, `competition`, `club`, `city`, `award`, `stadium`.
- Phân nhóm Route:
  - `/health`: Kiểm tra trạng thái máy chủ.
  - `/api/hierarchy`: Truy vấn cấu trúc cây phân cấp (Confederation → Nation → Competition → Club / Award / Stadium / City) và API `/info` chi tiết.
  - `/api/records`: Thao tác CRUD đơn lẻ và truy vấn `/info` đa thực thể.
  - `/api/search`: Tìm kiếm toàn văn đa bảng.
  - `/api/lnc`: Xử lý import/export file `.lnc` và thống kê tổng số lượng record database.
  - `/api/logos`: Phục vụ tệp hình ảnh logo/cờ trực tiếp từ dữ liệu đồ họa Football Manager.

---

## 2. Health Check API

### `GET /health`
Kiểm tra tình trạng hoạt động của NestJS Backend Server.

- **URL**: `/health`
- **Method**: `GET`
- **Headers**: Không yêu cầu
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-23T14:35:00.000Z"
}
```

---

## 3. Hierarchy API (Cấu trúc phân cấp dữ liệu)

Prefix: `/api/hierarchy`

### 3.1. Confederations (Châu lục / Liên đoàn)

#### `GET /api/hierarchy/continents`
Lấy danh sách tất cả các Confederation (Châu lục / FIFA World) kèm số lượng thống kê quốc gia và giải đấu quốc tế.

- **Query Parameters**: Không
- **Phản hồi mẫu (`200 OK`)**:
```json
[
  {
    "id": "1",
    "name": "Europe (UEFA)",
    "totalNations": 55,
    "totalIntComps": 12
  },
  {
    "id": "2",
    "name": "South America (CONMEBOL)",
    "totalNations": 10,
    "totalIntComps": 8
  }
]
```

#### `GET /api/hierarchy/continents/:id/info` (hoặc `/api/hierarchy/confederations/:id/info`)
Lấy thông tin chi tiết của một Confederation kèm đầy đủ số liệu thống kê (quốc gia, giải quốc tế, tổng giải đấu, CLB, sân, thành phố, giải thưởng).

- **Path Parameters**:
  - `id` *(string, required)*: Confederation ID.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "id": "1",
  "name": "Europe (UEFA)",
  "totalNations": 55,
  "totalIntComps": 12,
  "totalComps": 420,
  "totalClubs": 6500,
  "totalStadiums": 980,
  "totalCities": 620,
  "totalAwards": 180
}
```

---

### 3.2. Nations (Quốc gia)

#### `GET /api/hierarchy/continents/:id/nations`
Lấy danh sách các quốc gia thành viên trực thuộc một liên đoàn (Confederation).

- **Path Parameters**:
  - `id` *(string, required)*: Confederation ID (ví dụ: `1`).
- **Phản hồi mẫu (`200 OK`)**:
```json
[
  {
    "id": "11",
    "long_name": "England",
    "short_name": "England",
    "three_letter_name": "ENG",
    "confederation_id": "1",
    "totalComps": 14,
    "totalClubs": 450,
    "totalStadiums": 65,
    "totalCities": 110,
    "totalAwards": 25,
    "totalChildren": 664
  }
]
```

#### `GET /api/hierarchy/nations`
Lấy toàn bộ danh sách quốc gia trong hệ thống, hỗ trợ lọc theo liên đoàn và tìm kiếm theo tên hoặc ID.

- **Query Parameters**:
  - `confedId` *(string, optional)*: Lọc theo Confederation ID.
  - `q` *(string, optional)*: Từ khóa tìm kiếm theo tên (long_name, short_name, three_letter_name) hoặc ID.
- **Phản hồi mẫu (`200 OK`)**: Mảng các đối tượng `Nation` kèm trường `confederation_name` và các bộ đếm `totalComps`, `totalClubs`, `totalStadiums`, `totalCities`, `totalAwards`.

#### `GET /api/hierarchy/nations/:id/info`
Lấy thông tin chi tiết một quốc gia kèm thông tin liên đoàn và các bộ đếm phân loại số liệu chi tiết.

- **Path Parameters**:
  - `id` *(string, required)*: Nation ID.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "id": "11",
  "long_name": "England",
  "short_name": "England",
  "three_letter_name": "ENG",
  "confederation_id": "1",
  "confederation_name": "Europe (UEFA)",
  "confederation": {
    "id": "1",
    "name": "Europe (UEFA)"
  },
  "inactive_fields": null,
  "counts": {
    "domesticComps": 16,
    "parentComps": 14,
    "totalComps": 22,
    "independentClubs": 120,
    "extinctClubs": 15,
    "allClubs": 450,
    "stadiums": 65,
    "cities": 110,
    "awards": 25,
    "totalAwards": 40
  }
}
```

#### `GET /api/hierarchy/nations/:id/hub`
Lấy thông tin tổng quan (Hub) của một quốc gia gồm thông tin chi tiết và số lượng tổng hợp của từng loại thực thể con.

- **Path Parameters**:
  - `id` *(string, required)*: Nation ID (ví dụ: `11`).
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "nation": {
    "id": "11",
    "long_name": "England",
    "short_name": "England",
    "three_letter_name": "ENG",
    "confederation_id": "1",
    "confederation": {
      "id": "1",
      "name": "Europe (UEFA)"
    }
  },
  "counts": {
    "domesticComps": 16,
    "independentClubs": 120,
    "allClubs": 450,
    "stadiums": 65,
    "cities": 110,
    "awards": 25
  }
}
```

---

### 3.3. Competitions (Giải đấu)

#### `GET /api/hierarchy/continents/:id/international-competitions`
Lấy danh sách các giải đấu quốc tế cấp cha (`parent_id IS NULL`) thuộc một Confederation (ví dụ: UEFA Champions League, Euro, Copa América).

- **Path Parameters**:
  - `id` *(string, required)*: Confederation ID.
- **Phản hồi mẫu (`200 OK`)**: Mảng `CompetitionItem[]`.

#### `GET /api/hierarchy/nations/:id/competitions`
> ⚡ **Quy tắc quan trọng:** **Chỉ trả về các giải đấu quốc nội cấp cha (`parent_id IS NULL`)** của quốc gia đó.  
> Đối với các giải đấu có phân hạng/vòng đấu con (`childrenCount > 0`), danh sách giải con được truy vấn qua API `GET /api/hierarchy/competitions/:id/sub-competitions`.

Kết quả tự động bổ sung 2 node ảo ở đầu danh sách:
- `[OTHER]` - Danh mục các CLB độc lập/tự do (`comp_id IS NULL`).
- `[EXTINCT]` - Danh mục các CLB đã giải thể (`is_extinct = true`).

- **Path Parameters**:
  - `id` *(string, required)*: Nation ID.
- **Phản hồi mẫu (`200 OK`)**: Danh sách đối tượng Competition, gồm các thuộc tính màu sắc, parent_id, clubsCount, awardsCount, childrenCount.

#### `GET /api/hierarchy/competitions/:id/sub-competitions`
> ⚡ **Trả về danh sách giải đấu con / phân hạng trực thuộc giải đấu cha `{id}` (`parent_id = :id`)** (ví dụ: các bảng đấu, phân hạng, vòng loại trực thuộc).

- **Path Parameters**:
  - `id` *(string, required)*: Competition ID cha.
- **Phản hồi mẫu (`200 OK`)**:
```json
[
  {
    "id": "1301394",
    "long_name": "UEFA Champions League Qualifying Phase",
    "short_name": "Champions League Qualifying",
    "three_letter_name": "UCLQ",
    "parent_id": "1301393",
    "parent_name": "Champions League",
    "parent_long_name": "UEFA Champions League",
    "parent_short_name": "Champions League",
    "clubsCount": 32,
    "awardsCount": 0,
    "childrenCount": 0
  }
]
```

#### `GET /api/hierarchy/competitions/:id/info`
Lấy thông tin chi tiết một giải đấu cùng số lượng câu lạc bộ (`clubsCount`), giải thưởng (`awardsCount`), số giải đấu con (`childrenCount`), thông tin giải cha (`parent`) và quốc gia (`nation`).

- **Path Parameters**:
  - `id` *(string, required)*: Competition ID.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "id": "11",
  "long_name": "English Premier Division",
  "short_name": "Premier League",
  "three_letter_name": "PL",
  "fg_color": "255 255 255",
  "bg_color": "56 0 60",
  "confed_id": "1",
  "nation_id": "11",
  "parent_id": null,
  "parent_name": null,
  "parent_long_name": null,
  "parent_short_name": null,
  "categories": "Domestic League",
  "is_international": false,
  "note": null,
  "clubsCount": 20,
  "awardsCount": 12,
  "childrenCount": 0,
  "nation": {
    "id": "11",
    "long_name": "England",
    "short_name": "England",
    "three_letter_name": "ENG"
  },
  "confederation": {
    "id": "1",
    "name": "Europe (UEFA)"
  },
  "parent": null
}
```

#### `GET /api/hierarchy/competitions`
Truy vấn danh sách tất cả giải đấu với các bộ lọc đa chiều.

- **Query Parameters**:
  - `confedId` *(string, optional)*: Lọc theo liên đoàn.
  - `nationId` *(string, optional)*: Lọc theo quốc gia.
  - `q` *(string, optional)*: Tìm kiếm từ khóa theo tên hoặc ID.
  - `isInternational` *(boolean string, optional)*: `'true'` (giải quốc tế) hoặc `'false'` (giải quốc nội).
- **Phản hồi mẫu (`200 OK`)**: Mảng các giải đấu thỏa điều kiện lọc.

#### `GET /api/hierarchy/competitions/:id/clubs`
Lấy danh sách câu lạc bộ thuộc một giải đấu cụ thể.

- **Path Parameters**:
  - `id` *(string, required)*: Competition ID.
- **Phản hồi mẫu (`200 OK`)**: Mảng `ClubItem[]` kèm relation `nation`.

#### `GET /api/hierarchy/competitions/:id/awards`
Lấy danh sách giải thưởng thuộc về một giải đấu cụ thể (`comp_id = :id`).
- **Path Parameters**: `id` *(Competition ID)*.
- **Phản hồi**: `AwardItem[]`.

---

### 3.4. Clubs (Câu lạc bộ)

#### `GET /api/hierarchy/clubs/:id/info`
Lấy thông tin chi tiết một câu lạc bộ kèm thông tin quốc gia (`nation`), giải đấu trực thuộc (`competition`) và giải đấu cha (`parent_competition_name`).

- **Path Parameters**:
  - `id` *(string, required)*: Club ID.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "id": "676",
  "long_name": "Liverpool Football Club",
  "short_name": "Liverpool",
  "six_letter_name": "L'pool",
  "three_letter_name": "LIV",
  "nation_id": "11",
  "comp_id": "11",
  "is_extinct": false,
  "competition_name": "Premier League",
  "parent_competition_name": null,
  "nation_name": "England",
  "nation_three_letter": "ENG",
  "nation": {
    "id": "11",
    "long_name": "England",
    "short_name": "England",
    "three_letter_name": "ENG"
  },
  "competition": {
    "id": "11",
    "long_name": "English Premier Division",
    "short_name": "Premier League",
    "three_letter_name": "PL"
  }
}
```

#### `GET /api/hierarchy/nations/:id/independent-clubs`
Lấy danh sách các CLB độc lập (không thuộc giải đấu cố định) của một quốc gia.

- **Path Parameters**:
  - `id` *(string, required)*: Nation ID.
- **Query Parameters**:
  - `extinct` *(string, optional)*: 
    - `'true'`: Chỉ lấy các CLB đã giải thể (`is_extinct = true`).
    - `'false'`: Chỉ lấy các CLB đang hoạt động (`comp_id IS NULL AND is_extinct != true`).
- **Phản hồi mẫu (`200 OK`)**: Mảng `ClubItem[]`.

#### `GET /api/hierarchy/nations/:id/all-clubs`
Lấy tất cả các CLB thuộc quốc gia (cả trong giải và độc lập).

- **Path Parameters**:
  - `id` *(string, required)*: Nation ID.
- **Phản hồi mẫu (`200 OK`)**: Mảng `ClubItem[]` kèm quan hệ `competition` và `nation`.

---

### 3.5. Sân vận động, Thành phố, Giải thưởng, Nhân sự, Vòng đấu

#### `GET /api/hierarchy/cities/:id/info`
Lấy thông tin chi tiết một thành phố kèm quốc gia trực thuộc.
- **Path Parameters**: `id` *(City ID)*.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "id": "123",
  "name": "London",
  "country_id": "11",
  "categories": "Capital",
  "nation_name": "England",
  "nation_three_letter": "ENG",
  "nation": { "id": "11", "long_name": "England" }
}
```

#### `GET /api/hierarchy/nations/:id/cities`
Lấy danh sách thành phố thuộc quốc gia.
- **Path Parameters**: `id` *(Nation ID)*.
- **Phản hồi**: `CityItem[]`.

#### `GET /api/hierarchy/stadiums/:id/info`
Lấy thông tin chi tiết một sân vận động kèm quốc gia trực thuộc.
- **Path Parameters**: `id` *(Stadium ID)*.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "id": "789",
  "name": "Anfield",
  "nation_id": "11",
  "note": null,
  "nation_name": "England",
  "nation_three_letter": "ENG",
  "nation": { "id": "11", "long_name": "England" }
}
```

#### `GET /api/hierarchy/nations/:id/stadiums`
Lấy danh sách sân vận động thuộc quốc gia.
- **Path Parameters**: `id` *(Nation ID)*.
- **Phản hồi**: `StadiumItem[]`.

#### `GET /api/hierarchy/awards/:id/info`
Lấy thông tin chi tiết một giải thưởng kèm quốc gia và giải đấu liên kết.
- **Path Parameters**: `id` *(Award ID)*.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "id": "456",
  "long_name": "PFA Players' Player of the Year",
  "short_name": "PFA Player of the Year",
  "nation_id": "11",
  "comp_id": "11",
  "nation_name": "England",
  "competition_name": "Premier League",
  "nation": { "id": "11", "long_name": "England" },
  "competition": { "id": "11", "long_name": "English Premier Division" }
}
```

#### `GET /api/hierarchy/nations/:id/awards`
Lấy danh sách giải thưởng độc lập cấp quốc gia (`nation_id = :id AND comp_id IS NULL`).
- **Path Parameters**: `id` *(Nation ID)*.
- **Phản hồi**: `AwardItem[]`.

#### `GET /api/hierarchy/awards`
Lấy toàn bộ giải thưởng trong hệ thống.
- **Phản hồi**: `AwardItem[]`.

#### `GET /api/hierarchy/players`
Lấy danh sách cầu thủ / nhân sự (People).
- **Query Parameters**:
  - `q` *(string, optional)*: Tìm kiếm theo tên hoặc ID.
- **Phản hồi**: `PersonItem[]`.

#### `GET /api/hierarchy/stages`
Lấy danh sách tên các giai đoạn / vòng đấu (Stages).
- **Query Parameters**:
  - `q` *(string, optional)*: Tìm kiếm theo tên stage hoặc ID.
- **Phản hồi**: `StageItem[]`.

---

## 4. Records API (CRUD & Entity Info)

Prefix: `/api/records`  
Hỗ trợ các thao tác Tạo, Đọc, Cập nhật, Xóa (CRUD) và xem chi tiết quan hệ đồng nhất trên các thực thể.

### Các loại thực thể (`:type`) được hỗ trợ:
| Type Param | Entity | Mô tả |
|------------|--------|-------|
| `confederation` / `continent` | `Confederation` | Châu lục / Liên đoàn bóng đá |
| `nation` | `Nation` | Quốc gia thành viên |
| `competition` / `comp` | `Competition` | Giải đấu (quốc tế hoặc quốc nội) |
| `club` | `Club` | Câu lạc bộ bóng đá |
| `stadium` | `Stadium` | Sân vận động |
| `city` | `City` | Thành phố |
| `award` | `Award` | Danh hiệu / Giải thưởng |
| `person` hoặc `player` | `Person` | Cầu thủ / Nhân sự |
| `stage` | `Stage` | Giai đoạn / Vòng thi đấu |

---

### 4.1. Chi tiết đầy đủ quan hệ của 1 bản ghi
#### `GET /api/records/:type/:id/info`
Lấy thông tin chi tiết đầy đủ kèm quan hệ cha/con và số liệu thống kê của bất kỳ thực thể nào (`confederation`, `nation`, `comp`, `club`, `city`, `award`, `stadium`).

- **Path Parameters**:
  - `type` *(string, required)*: Loại thực thể (ví dụ: `club`, `competition`, `nation`, `confederation`, `city`, `award`, `stadium`).
  - `id` *(string, required)*: FM ID của bản ghi.
- **Phản hồi**: Đối tượng info chi tiết tương ứng với entity type.

---

### 4.2. Chi tiết bản ghi thô (CRUD Flat Record)
#### `GET /api/records/:type/:id`
Lấy thông tin bản ghi từ bảng cơ sở dữ liệu.

- **Path Parameters**:
  - `type` *(string, required)*: Loại thực thể.
  - `id` *(string, required)*: FM ID của bản ghi.

---

### 4.3. Tạo mới bản ghi
#### `POST /api/records/:type`
Tạo mới một bản ghi vào cơ sở dữ liệu.

- **Path Parameters**:
  - `type` *(string, required)*: Loại thực thể.
- **Request Body (JSON)**:
```json
{
  "id": "990001",
  "long_name": "Hanoi Police FC",
  "short_name": "CAHN",
  "three_letter_name": "CAH",
  "nation_id": "560",
  "comp_id": "1301389"
}
```
*(Lưu ý: Trường `id` là bắt buộc).*
- **Mã lỗi**: `400 Bad Request` nếu thiếu `id` hoặc `id` đã tồn tại.

---

### 4.4. Cập nhật bản ghi
#### `PUT /api/records/:type/:id`
Cập nhật một hoặc nhiều thuộc tính của bản ghi hiện có.

- **Path Parameters**:
  - `type` *(string, required)*: Loại thực thể.
  - `id` *(string, required)*: FM ID của bản ghi.
- **Request Body (JSON)**:
```json
{
  "long_name": "Manchester United Football Club",
  "short_name": "Man Utd",
  "note": "Updated via LNC Manager"
}
```
- **Phản hồi**: Đối tượng entity sau khi cập nhật thành công.

---

### 4.5. Xóa bản ghi
#### `DELETE /api/records/:type/:id`
Xóa vĩnh viễn một bản ghi khỏi cơ sở dữ liệu.

- **Path Parameters**:
  - `type` *(string, required)*: Loại thực thể.
  - `id` *(string, required)*: FM ID của bản ghi.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "success": true,
  "message": "club with ID 990001 deleted successfully"
}
```

---

## 5. Search API (Tìm kiếm toàn văn)

Prefix: `/api/search`

### `GET /api/search`
Tìm kiếm đồng thời trên 8 bảng dữ liệu: Clubs, Competitions, Nations, Stadiums, Cities, Awards, Players, Stages.  
Hỗ trợ tìm kiếm theo chuỗi ký tự (case-insensitive) hoặc chính xác theo số ID.

- **Query Parameters**:
  - `q` *(string, required)*: Từ khóa tìm kiếm (tên câu lạc bộ, giải đấu, quốc gia...) hoặc FM ID.
  - `limit` *(number, optional, mặc định: 20)*: Giới hạn số lượng kết quả cho mỗi loại thực thể.
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "clubs": [
    {
      "id": "676",
      "long_name": "Liverpool Football Club",
      "short_name": "Liverpool",
      "nation": { "id": "11", "long_name": "England" }
    }
  ],
  "competitions": [],
  "nations": [],
  "stadiums": [],
  "cities": [],
  "awards": [],
  "players": [],
  "stages": []
}
```

---

## 6. LNC File API (Export & Import)

Prefix: `/api/lnc`

### 6.1. Export file .LNC
#### `GET /api/lnc/export`
Tổng hợp toàn bộ dữ liệu hiện có trong PostgreSQL và sinh ra nội dung tệp tin `.lnc` chuẩn cú pháp của Football Manager 2024.

- **Query Parameters**:
  - `download` *(string, optional)*: Nếu truyền `download=true`, server sẽ đính kèm header `Content-Disposition: attachment; filename="FM24_Merged_Names.lnc"` để kích hoạt tải file về máy.
- **Content-Type**: `text/plain; charset=utf-8`

---

### 6.2. Import file .LNC vào Database
#### `POST /api/lnc/import`
Đọc trực tiếp các file `.lnc` trên filesystem máy chủ (môi trường Local) và nạp dữ liệu vào cơ sở dữ liệu PostgreSQL.

- **Request Body (JSON, optional)**:
```json
{
  "dir": "D:/Games/FM24_2026/FootballManager24/data/database/db/2430/lnc/all"
}
```
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "success": true,
  "message": "Successfully imported .lnc files into database",
  "stats": {
    "confederations": 7,
    "nations": 235,
    "cities": 1420,
    "competitions": 840,
    "clubs": 14500,
    "stadiums": 2100,
    "awards": 320,
    "people": 8900,
    "stages": 40
  }
}
```

---

### 6.3. Thống kê số lượng bản ghi
#### `GET /api/lnc/status`
Lấy số lượng bản ghi hiện có trong từng bảng dữ liệu của PostgreSQL.

- **Query Parameters**: Không
- **Phản hồi mẫu (`200 OK`)**:
```json
{
  "confederations": 7,
  "nations": 235,
  "cities": 1420,
  "competitions": 840,
  "clubs": 14500,
  "stadiums": 2100,
  "awards": 320,
  "people": 8900,
  "stages": 40
}
```

---

## 7. Logos API (Serve hình ảnh logo & cờ)

Prefix: `/api/logos`  
*Lưu ý*: API này đọc các file ảnh logo từ thư mục đồ họa game FM được cài đặt cục bộ trên máy chủ. Kết quả trả về kèm HTTP Header `Cache-Control: public, max-age=604800, immutable` (cache trình duyệt 7 ngày).

### 7.1. Logo Confederation (Liên đoàn)
#### `GET /api/logos/confederation/:id`
Trả về file ảnh logo định dạng `.png` của Confederation.

- **Path Parameters**:
  - `id` *(string, required)*: Confederation ID (ví dụ: `1`).
- **Response**: Binary data ảnh `image/png`.

---

### 7.2. Logo / Cờ Quốc Gia
#### `GET /api/logos/nation/:id`
Trả về file ảnh cờ / logo định dạng `.png` của Quốc gia.

- **Path Parameters**:
  - `id` *(string, required)*: Nation ID (ví dụ: `11`).
- **Query Parameters**:
  - `code` *(string, optional)*: Mã 3 chữ cái của quốc gia (ví dụ: `ENG`, `VIE`).
- **Response**: Binary data ảnh `image/png`.

---

## 8. Swagger & OpenAPI Specs

Hệ thống tích hợp sẵn Swagger UI tương tác trực tiếp trên trình duyệt:
- **Swagger Documentation UI**:
  - `http://localhost:3001/docs`
  - `http://localhost:3001/api/docs`
- **OpenAPI JSON Spec**:
  - `http://localhost:3001/docs-json`
