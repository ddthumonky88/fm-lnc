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
├── railway.toml        # Cấu hình deploy Railway.app
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

## ☁️ Deploy lên Railway.app

### Database

1. Tạo project trên [railway.app](https://railway.app)
2. Add **PostgreSQL** service
3. Export DB local bằng `pg_dump`:
   ```bash
   # Windows (pg_dump nằm tại D:\App\PostgreSQL\18\bin\)
   $env:PGPASSWORD='your_password'
   D:\App\PostgreSQL\18\bin\pg_dump.exe -h 127.0.0.1 -p 5432 -U postgres -d fm_lnc_db --no-owner --no-acl -F p -f "backend\scripts\db_dump_full.sql"
   ```
4. Import `db_dump_full.sql` vào Railway PostgreSQL qua pgAdmin hoặc Railway CLI

### Backend

1. Add service từ GitHub repo → chọn **Root Directory** = `backend`
2. Railway tự detect Dockerfile
3. Set environment variables:

   ```
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_USERNAME=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   DB_NAME=${{Postgres.PGDATABASE}}
   PORT=3001
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
