# FM24 XML Changes API

API độc lập đọc trực tiếp `fm24-report/changes.jsonl`. Không cần Java, Node.js, database hoặc package Python ngoài.

Lần chạy đầu API tự tạo `fm24-report/changes-v2.sqlite` để lập index. Đây là file cache cục bộ,
không cần cài hay chạy SQLite server; các lần sau API dùng lại nếu JSONL chưa thay đổi.

## Chạy

```powershell
.\run-xml-api.bat
```

Mặc định API chạy tại `http://127.0.0.1:3003`.

## Endpoint

```text
GET /docs
GET /health
GET /api/summary
GET /api/changes?page=0&size=50
GET /api/changes?tableType=3&propertyId=1413703796&languageField=true
GET /api/changes?objectId=7146825582208
GET /api/objects/7146825582208
GET /api/objects/1664
```

Tham số lọc: `tableType`, `propertyId`, `objectId`, `clientField`, `languageField`, `q`.
Thêm `includeRaw=true` nếu cần record XML gốc bên cạnh format chuẩn hóa.

Response có `object.convertedId`, được chuyển từ `db_unique_id` theo ID 32-bit của FM:

```text
convertedId = db_unique_id & 0xFFFFFFFF
7146825582208 → 1664
```

`objectId` chấp nhận cả `db_unique_id`, `db_random_id` và `convertedId`.

`size` tối đa là 500. Page bắt đầu từ 0.

## Cấu hình môi trường

```powershell
$env:XML_API_PORT = '3004'
$env:CHANGES_FILE = 'D:\data\changes.jsonl'
$env:SUMMARY_FILE = 'D:\data\summary.json'
.\run-xml-api.bat
```
