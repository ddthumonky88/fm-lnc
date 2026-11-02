# Hướng Dẫn Triển Khai Hệ Thống 24/7: PostgreSQL + NestJS + Next.js

Tài liệu này hướng dẫn chi tiết cách đóng gói, cấu hình và vận hành hệ thống Fullstack gồm **PostgreSQL**, **NestJS (Backend)** và **Next.js (Frontend)** trên VPS (Oracle Cloud Always Free hoặc Google Cloud Compute Engine) bằng **Docker Compose** và **Nginx Reverse Proxy**. 

Đảm bảo các tiêu chí: **Miễn phí lâu dài**, **Chạy 24/7 liên tục**, **Không ngủ đông (no sleep/cold-start)**, và **tự phục hồi khi khởi động lại**.

---

## 1. Cấu Trúc Thư Mục Dự Án

Đặt toàn bộ các thành phần theo cấu trúc monorepo hoặc thư mục chung như sau:

```text
my-fullstack-app/
├── backend/                  # Mã nguồn NestJS
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/                 # Mã nguồn Next.js
│   ├── src/
│   ├── next.config.js
│   ├── package.json
│   └── Dockerfile
├── nginx/                    # Cấu hình Reverse Proxy
│   └── default.conf
├── .env                      # Biến môi trường chung
├── docker-compose.yml        # Điều phối các containers
└── BUILD.md                  # Hướng dẫn này
```

---

## 2. Dockerfile Cho Từng Dịch Vụ

### 2.1. Backend (`backend/Dockerfile`) - NestJS
Sử dụng Multi-stage build để tối ưu dung lượng và tốc độ:

```dockerfile
# Stage 1: Build source
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main.js"]
```

> **Lưu ý trong `backend/src/main.ts`:** Hãy đảm bảo server lắng nghe trên host `0.0.0.0` và cổng lấy từ `process.env.PORT || 3001`:
> ```typescript
> await app.listen(process.env.PORT || 3001, '0.0.0.0');
> ```

---

### 2.2. Frontend (`frontend/Dockerfile`) - Next.js
Sử dụng tính năng `standalone` của Next.js để giảm kích thước image từ ~1GB xuống ~100MB.

1. Bật chế độ standalone trong `frontend/next.config.js`:
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'standalone',
   };
   module.exports = nextConfig;
   ```

2. Tạo `frontend/Dockerfile`:
   ```dockerfile
   # Stage 1: Dependencies
   FROM node:20-alpine AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci

   # Stage 2: Builder
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .

   ARG NEXT_PUBLIC_API_URL
   ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

   RUN npm run build

   # Stage 3: Runner
   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   ENV PORT=3000
   ENV HOSTNAME="0.0.0.0"

   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static

   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

---

## 3. Cấu Hình Nginx Reverse Proxy (`nginx/default.conf`)

Tập tin này định tuyến truy cập từ cổng 80 chuẩn vào Frontend hoặc Backend:

```nginx
server {
    listen 80;
    server_name localhost;

    # Chuyển tiếp các request /api sang Backend NestJS
    location /api/ {
        proxy_pass http://backend:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Chuyển tiếp toàn bộ request còn lại sang Frontend Next.js
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Cấu Hình Biến Môi Trường (`.env`)

Tạo file `.env` ở thư mục gốc:

```env
# PostgreSQL Credentials
POSTGRES_USER=admin_user
POSTGRES_PASSWORD=MatKhauBaoMatCucManh_2026
POSTGRES_DB=production_db

# Backend URL & Config
DATABASE_URL=postgresql://admin_user:MatKhauBaoMatCucManh_2026@postgres:5432/production_db?schema=public
BACKEND_PORT=3001

# Frontend Config
NEXT_PUBLIC_API_URL=/api
```

---

## 5. File Điều Phối `docker-compose.yml`

Tất cả container được thiết lập `restart: always` để chống sập hoặc tự chạy lại sau khi reboot VPS.

```yaml
version: '3.8'

services:
  # 1. Cơ sở dữ liệu PostgreSQL
  postgres:
    image: postgres:16-alpine
    container_name: app_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 2. Backend NestJS
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: app_backend
    restart: always
    environment:
      DATABASE_URL: ${DATABASE_URL}
      PORT: ${BACKEND_PORT}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app_network

  # 3. Frontend Next.js
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    container_name: app_frontend
    restart: always
    depends_on:
      - backend
    networks:
      - app_network

  # 4. Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: app_nginx
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - app_network

volumes:
  postgres_data:
    driver: local

networks:
  app_network:
    driver: bridge
```

---

## 6. Các Bước Triển Khai Thực Tế Trên VPS

### Bước 6.1: Cấu hình Swap RAM (Bắt buộc nếu dùng VPS 1GB RAM như GCP)
Nếu dùng VPS có cấu hình RAM thấp, hãy kích hoạt 4GB RAM ảo từ ổ cứng để tránh bị Out Of Memory (OOM) khi build:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Bước 6.2: Cài đặt Docker & Docker Compose
Trên Ubuntu/Debian:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

### Bước 6.3: Clone code và Khởi chạy
1. Đưa mã nguồn lên VPS (qua Git hoặc SCP).
2. Di chuyển vào thư mục dự án chứa file `docker-compose.yml`.
3. Khởi chạy toàn bộ hệ thống ở chế độ nền (detached mode):
   ```bash
   docker-compose up -d --build
   ```

---

## 7. Các Lệnh Quản Trị Hệ Thống Hữu Ích

* **Xem trạng thái hoạt động của các service:**
  ```bash
  docker-compose ps
  ```

* **Theo dõi logs của toàn bộ hệ thống hoặc từng service:**
  ```bash
  # Xem tất cả
  docker-compose logs -f

  # Xem riêng backend NestJS
  docker-compose logs -f backend
  ```

* **Cập nhật code mới:**
  ```bash
  git pull origin main
  docker-compose up -d --build
  ```

* **Chạy migration Prisma / TypeORM trong Backend:**
  ```bash
  docker-compose exec backend npx prisma migrate deploy
  # hoặc TypeORM migration
  ```

* **Dừng toàn bộ hệ thống:**
  ```bash
  docker-compose down
  ```
  *(Dữ liệu PostgreSQL vẫn an toàn trong volume `postgres_data`).*