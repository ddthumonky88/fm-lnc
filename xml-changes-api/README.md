# FM24 XML Changes API

API độc lập đọc trực tiếp `fm24-report/changes.jsonl`. Không cần Java, Node.js, database hoặc package Python ngoài.

Lần chạy đầu API tự tạo `fm24-report/changes-v2.sqlite` để lập index. Đây là file cache cục bộ,
không cần cài hay chạy SQLite server; các lần sau API dùng lại nếu JSONL chưa thay đổi.

## Chạy

```powershell
.\run-xml-api.bat
```

Mặc định API chạy tại `http://127.0.0.1:3003`.

Swagger UI: `http://127.0.0.1:3003/swagger`

OpenAPI JSON: `http://127.0.0.1:3003/openapi.json`

## Endpoint

```text
GET /docs
GET /health
GET /api/summary
GET /api/changes?page=0&size=50
GET /api/changes?tableType=3&propertyId=1413703796&languageField=true
GET /api/changes?tableType=3&propertyId=TCht&languageField=true
GET /api/changes?objectId=7146825582208
GET /api/objects/7146825582208
GET /api/objects/1664
```

Tham số lọc: `tableType`, `propertyId`, `objectId`, `clientField`, `languageField`, `q`.
`/api/changes` phân trang theo UID và nhóm các change record:

```json
{
  "uid": 1664,
  "records": [
    {
      "id": 796510830,
      "table": "club",
      "field": "nickname",
      "oldValue": null,
      "newValue": "Los Leones",
      "record": {}
    }
  ]
}
```

Response được chuẩn hóa thành 5 trường FM24:

```json
{
  "uid": 1664,
  "table": 3,
  "field": "TCht",
  "oldValue": null,
  "newValue": "Los Leones"
}
```

`uid` được chuyển từ `db_unique_id` theo ID 32-bit của FM:

```text
convertedId = db_unique_id & 0xFFFFFFFF
7146825582208 → 1664
```

`objectId` chấp nhận cả `db_unique_id`, `db_random_id` và `convertedId`.

`field` được chuyển từ mã FourCC sang tên dễ đọc khi đã có ánh xạ:

```text
1413705326 → TCnn → nickname
1413703796 → TCht → hashtag
1130443630 → Ca3n → name_3l
1129538384 → CScP → supporter_profile
```

Mã chưa có ánh xạ vẫn được trả về dưới dạng FourCC. Tham số `propertyId` chấp nhận
ID số, FourCC hoặc tên field, ví dụ `1413705326`, `TCnn`, `nickname`.

`table` được chuyển từ `database_table_type` sang tên entity FM24. Ví dụ:

```text
1 → person
2 → city
3 → club
10 → nation
21 → stadium
25 → competition
47 → region
```

Tham số `tableType` chấp nhận cả số và tên, ví dụ `3` hoặc `club`.

`size` tối đa là 500. Page bắt đầu từ 0.

## Cấu hình môi trường

```powershell
$env:XML_API_PORT = '3004'
$env:CHANGES_FILE = 'D:\data\changes.jsonl'
$env:SUMMARY_FILE = 'D:\data\summary.json'
.\run-xml-api.bat
```
