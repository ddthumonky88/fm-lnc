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
4. [Records API (CRUD Thực thể dữ liệu)](#4-records-api-crud-thực-thể-dữ-liệu)
5. [Search API (Tìm kiếm toàn văn)](#5-search-api-tìm-kiếm-toàn-văn)
6. [LNC File API (Export & Import)](#6-lnc-file-api-export--import)
7. [Logos API (Serve hình ảnh logo & cờ)](#7-logos-api-serve-hình-ảnh-logo--cờ)
8. [Swagger & OpenAPI Specs](#8-swagger--openapi-specs)

---

## 1. Tổng quan & Cấu trúc API

Toàn bộ hệ thống API tuân theo chuẩn RESTful JSON:
- Các định danh thực thể (`id`, `parent_id`, `nation_id`, `comp_id`, `confed_id`,...) được định dạng thống nhất dạng chuỗi (`string` / `VARCHAR(64)`).
- Phân nhóm Route:
  - `/health`: Kiểm tra trạng thái máy chủ.
  - `/api/hierarchy`: Truy vấn cấu trúc cây phân cấp (Confederation → Nation → Competition → Club / Award / Stadium / City).
  - `/api/records`: Thao tác CRUD đơn lẻ trên 8 loại thực thể (Competition, Club, Stadium, City, Award, Person, Stage, Nation).
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

### 3.1. Confederations (Châu lục / Toàn cầu)

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
Lấy danh sách các giải đấu quốc tế (International Competitions) thuộc một Confederation (ví dụ: UEFA Champions League, Euro, Copa América).

- **Path Parameters**:
  - `id` *(string, required)*: Confederation ID.
- **Phản hồi mẫu (`200 OK`)**:
```json
[
  {
    "id": "1301393",
    "long_name": "UEFA Champions League",
    "short_name": "Champions League",
    "three_letter_name": "UCL",
    "fg_color": "255 255 255",
    "bg_color": "0 20 60",
    "confed_id": "1",
    "nation_id": null,
    "parent_id": null,
    "parent_name": null,
    "categories": "Club International",
    "is_international": true,
    "note": null,
    "inactive_fields": null,
    "clubsCount": 36,
    "awardsCount": 8,
    "childrenCount": 0,
    "totalChildren": 44
  }
]
```

#### `GET /api/hierarchy/nations/:id/competitions`
Lấy danh sách giải đấu quốc nội (Domestic Competitions) của một quốc gia.  
*Đặc biệt*: Kết quả tự động bổ sung 2 node ảo ở đầu danh sách:
- `[OTHER]` - Danh mục các CLB độc lập/tự do (comp_id is null).
- `[EXTINCT]` - Danh mục các CLB đã giải thể (is_extinct = true).

- **Path Parameters**:
  - `id` *(string, required)*: Nation ID.
- **Phản hồi mẫu (`200 OK`)**: Danh sách đối tượng Competition, gồm các thuộc tính màu sắc, parent_id, clubsCount, awardsCount, childrenCount.

#### `GET /api/hierarchy/competitions`
Truy vấn danh sách tất cả giải đấu với các bộ lọc đa chiều.

- **Query Parameters**:
  - `confedId` *(string, optional)*: Lọc theo liên đoàn.
  - `nationId` *(string, optional)*: Lọc theo quốc gia.
  - `q` *(string, optional)*: Tìm kiếm từ khóa theo tên hoặc ID.
  - `isInternational` *(boolean string, optional)*: `'true'` (giải quốc tế) hoặc `'false'` (giải quốc nội).
- **Phản hồi mẫu (`200 OK`)**: Mảng các giải đấu thỏa điều kiện lọc.

#### `GET /api/hierarchy/competitions/:id/info`
Lấy chi tiết một giải đấu cùng số lượng câu lạc bộ (`clubsCount`), giải thưởng (`awardsCount`) và số giải đấu con (`childrenCount`).

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
  "childrenCount": 0
}
```

#### `GET /api/hierarchy/competitions/:id/sub-competitions`
Lấy danh sách các giải đấu con trực thuộc một giải cha (`parent_id = :id`) (ví dụ các bảng đấu, phân hạng).

- **Path Parameters**:
  - `id` *(string, required)*: Competition ID cha.
- **Phản hồi mẫu (`200 OK`)**: Mảng các `CompetitionItem` con.

---

### 3.4. Clubs (Câu lạc bộ)

#### `GET /api/hierarchy/competitions/:id/clubs`
Lấy danh sách câu lạc bộ thuộc một giải đấu cụ thể.

- **Path Parameters**:
  - `id` *(string, required)*: Competition ID.
- **Phản hồi mẫu (`200 OK`)**: Mảng `ClubItem[]` kèm relation `nation`.

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

#### `GET /api/hierarchy/nations/:id/stadiums`
Lấy danh sách sân vận động thuộc quốc gia.
- **Path Parameters**: `id` *(Nation ID)*.
- **Phản hồi**: `StadiumItem[]`.

#### `GET /api/hierarchy/nations/:id/cities`
Lấy danh sách thành phố thuộc quốc gia.
- **Path Parameters**: `id` *(Nation ID)*.
- **Phản hồi**: `CityItem[]`.

#### `GET /api/hierarchy/nations/:id/awards`
Lấy danh sách giải thưởng độc lập cấp quốc gia (`nation_id = :id AND comp_id IS NULL`).
- **Path Parameters**: `id` *(Nation ID)*.
- **Phản hồi**: `AwardItem[]`.

#### `GET /api/hierarchy/competitions/:id/awards`
Lấy danh sách giải thưởng thuộc về một giải đấu cụ thể (`comp_id = :id`).
- **Path Parameters**: `id` *(Competition ID)*.
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

## 4. Records API (CRUD Thực thể dữ liệu)

Prefix: `/api/records`  
Hỗ trợ các thao tác Tạo, Đọc, Cập nhật, Xóa (CRUD) đồng nhất trên tất cả thực thể Football Manager.

### Các loại thực thể (`:type`) được hỗ trợ:
| Type Param | Entity | Mô tả |
|------------|--------|-------|
| `competition` | `Competition` | Giải đấu (quốc tế hoặc quốc nội) |
| `club` | `Club` | Câu lạc bộ bóng đá |
| `stadium` | `Stadium` | Sân vận động |
| `city` | `City` | Thành phố |
| `award` | `Award` | Danh hiệu / Giải thưởng |
| `person` hoặc `player` | `Person` | Cầu thủ / Nhân sự |
| `stage` | `Stage` | Giai đoạn / Vòng thi đấu |

---

### 4.1. Chi tiết một bản ghi
#### `GET /api/records/:type/:id`
Lấy thông tin chi tiết một bản ghi theo `type` và `id`.

- **Path Parameters**:
  - `type` *(string, required)*: Loại thực thể (xem bảng trên).
  - `id` *(string, required)*: FM ID của bản ghi.
- **Mã lỗi**:
  - `400 Bad Request`: Nếu `type` không hợp lệ.
  - `404 Not Found`: Không tìm thấy bản ghi.

---

### 4.2. Tạo mới bản ghi
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
- **Mã lỗi**:
  - `400 Bad Request`: Thiếu `id` hoặc `id` đã tồn tại.

---

### 4.3. Cập nhật bản ghi
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
- **Mã lỗi**: `404 Not Found` nếu bản ghi không tồn tại.

---

### 4.4. Xóa bản ghi
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
- **Mã lỗi**: `404 Not Found` nếu không tìm thấy ID để xóa.

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
- **Ví dụ nội dung sinh ra**:
```lnc
# CLUB NAME CHANGES
"CLUB_LONG_NAME_CHANGE" 676 "Liverpool Football Club" ""
"CLUB_SHORT_NAME_CHANGE" 676 "Liverpool" ""

# COMPETITION NAME CHANGES
"COMP_LONG_NAME_CHANGE" 11 "English Premier Division" ""
"COMP_SHORT_NAME_CHANGE" 11 "Premier League" ""
"COMP_THREE_LETTER_NAME_CHANGE" 11 "PL" ""
```

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
- **Mã lỗi**: `404 Not Found` nếu không tìm thấy file ảnh.

---

### 7.2. Logo / Cờ Quốc Gia
#### `GET /api/logos/nation/:id`
Trả về file ảnh cờ / logo định dạng `.png` của Quốc gia.

- **Path Parameters**:
  - `id` *(string, required)*: Nation ID (ví dụ: `11`).
- **Query Parameters**:
  - `code` *(string, optional)*: Mã 3 chữ cái của quốc gia (ví dụ: `ENG`, `VIE`). Dùng để fallback tìm logo theo mã nếu không tìm thấy theo ID.
- **Response**: Binary data ảnh `image/png`.
- **Mã lỗi**: `404 Not Found` nếu không tìm thấy file ảnh.

---

## 8. Swagger & OpenAPI Specs

Hệ thống tích hợp sẵn Swagger UI tương tác trực tiếp trên trình duyệt:
- **Swagger Documentation UI**:
  - `http://localhost:3001/docs`
  - `http://localhost:3001/api/docs`
- **OpenAPI JSON Spec**:
  - `http://localhost:3001/docs-json`
