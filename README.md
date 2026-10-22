# FM LNC Manager & Explorer

> Công cụ quản lý và khám phá dữ liệu file `.lnc` (Language/Name Change) cho **Football Manager 2024**.  
> Cho phép xem, tìm kiếm, chỉnh sửa và export dữ liệu tên quốc gia, câu lạc bộ, giải đấu, thành phố trong FM24.

---

## 📸 Tổng quan

- **Frontend**: Next.js 14 + Ant Design + Tailwind CSS
- **Backend**: NestJS 10 + TypeORM
- **Database**: PostgreSQL
- **Data Source**: File `.lnc` từ Football Manager 2024

---

## 🗂️ Cấu trúc Project

```
tool/
├── backend/            # NestJS REST API
│   ├── src/
│   │   ├── entities/   # TypeORM entities (Nation, Club, Competition, ...)
│   │   ├── hierarchy/  # API truy vấn cấu trúc phân cấp
│   │   ├── lnc/        # Parser & export file .lnc
│   │   ├── records/    # CRUD records
│   │   ├── search/     # Tìm kiếm toàn văn
│   │   └── logos/      # Serve logo từ filesystem FM
│   ├── scripts/
│   │   ├── seed_lnc.py # Seed dữ liệu từ file .lnc vào PostgreSQL
│   │   └── export_db.js# Export DB sang SQL dump
│   └── Dockerfile
├── frontend/           # Next.js App
│   └── src/app/
│       ├── page.tsx         # Dashboard tổng quan
│       ├── comp/            # Quản lý Competitions
│       ├── nation/          # Quản lý Nations
│       └── confederation/   # Quản lý Confederations
├── render.yaml         # Cấu hình deploy Render.com
└── README.md
```

---

## 🚀 Chạy Local

### Yêu cầu

- Node.js >= 20
- Python >= 3.9 (để chạy seed script)
- PostgreSQL >= 14
- Football Manager 2024 (để có file `.lnc` và logo)

### 1. Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file `.env`:
```env
PORT=3001
HOST=0.0.0.0
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=fm_lnc_db
LNC_FILES_DIR=../../        # Trỏ đến thư mục chứa file .lnc
```

### 2. Seed Database từ file .lnc

```bash
# Cài psycopg2 nếu chưa có
pip install psycopg2-binary

# Chạy seed (đọc file .lnc và nạp vào PostgreSQL)
npm run seed
```

> Script sẽ tự tạo bảng và import toàn bộ dữ liệu (~28,000 records) từ các file `.lnc` trong thư mục cha.

### 3. Khởi động Backend

```bash
npm run start:dev   # Development (watch mode)
npm run start:prod  # Production
```

API chạy tại: `http://localhost:3001`

### 4. Cài đặt Frontend

```bash
cd frontend
npm install
```

Tạo file `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Khởi động Frontend

```bash
npm run dev
```

Mở trình duyệt: `http://localhost:3000`

---

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/health` | Health check |
| `GET` | `/hierarchy/confederations` | Lấy danh sách Confederations |
| `GET` | `/hierarchy/nations` | Lấy danh sách Nations |
| `GET` | `/hierarchy/competitions` | Lấy danh sách Competitions |
| `GET` | `/hierarchy/clubs` | Lấy danh sách Clubs |
| `GET` | `/hierarchy/nation/:id` | Chi tiết một Nation |
| `GET` | `/hierarchy/comp/:id` | Chi tiết một Competition |
| `GET` | `/search?q=...` | Tìm kiếm toàn văn |
| `GET` | `/lnc/export` | Export toàn bộ dữ liệu ra file `.lnc` |
| `POST` | `/lnc/import` | Import file `.lnc` (local only) |
| `GET` | `/logos/:type/:id` | Lấy logo (local only) |

---

## ☁️ Deploy lên Render.com

### Bước 1 — Tạo Services trên Render

1. Vào [render.com](https://render.com) → **New** → **Blueprint**
2. Kết nối GitHub repo `fm-lnc-manager-tool`
3. Render tự đọc `render.yaml` và tạo sẵn **Web Service (BE)** + **PostgreSQL**
4. Chờ PostgreSQL service chạy xong → vào tab **"Info"** → copy **External Database URL**

### Bước 2 — Import Database bằng DBeaver

1. Mở **DBeaver** → click **"New Database Connection"** → chọn **PostgreSQL**
2. Chuyển sang tab **"URL"** → paste **External Database URL** từ Render
3. Click **Test Connection** → OK → **Finish**
4. Trong **Database Navigator**, click chuột phải vào database → **Tools** → **Execute Script**
5. Chọn file `backend\scripts\db_dump_full.sql` → **Start**
6. Chờ ~30 giây là xong (~28,000 records)

### Bước 3 — Backend tự deploy

- Render tự build Dockerfile từ `backend/` và wire **toàn bộ biến DB** từ PostgreSQL service
- Sau khi deploy (~3-5 phút), test:
  ```
  GET https://fm-lnc-backend.onrender.com/health
  ```

> **Lưu ý**: Tính năng đọc file `.lnc` trực tiếp và hiển thị logo chỉ hoạt động ở môi trường local (cần cài FM2024). Trên cloud, API chỉ serve data từ PostgreSQL.

---

## 🗄️ Database Schema

```
confederations  (7 records)
    └── nations  (250 records)
            └── cities  (13,408 records)
            └── competitions  (2,731 records)
                    └── clubs  (6,604 records)
                            └── stadiums  (3,762 records)
                    └── awards  (1,180 records)
            └── stages  (12 records)
```

---

## 📁 GitHub Repository

**https://github.com/ddthumonky88/fm-lnc-manager-tool**
