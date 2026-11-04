# FM LNC Manager & Explorer

Ứng dụng web để khám phá, tìm kiếm, chỉnh sửa và đồng bộ dữ liệu `.lnc` (Language/Name Change) của Football Manager 2024.

Hệ thống quản lý các nhóm dữ liệu chính: liên đoàn, quốc gia, giải đấu, câu lạc bộ, khu vực, thành phố, sân vận động, giải thưởng, nhân sự và giai đoạn thi đấu.

## Công nghệ

| Thành phần | Công nghệ | Cổng local |
| --- | --- | ---: |
| Frontend | Next.js 14, React 18, Ant Design 6, Tailwind CSS | `3002` |
| Backend chính | Java 21, Spring Boot 3.3, JDBC | `3001` |
| Backend cũ | NestJS 10, TypeORM | `3001` |
| Database | PostgreSQL 14+ | `5432` |

Backend Java là phiên bản đang được dùng trong `render.yaml`. Backend NestJS được giữ lại để tham khảo và làm phương án rollback.

## Chức năng chính

- Duyệt dữ liệu theo cây `Confederation → Nation → Competition → Club`.
- Tìm kiếm và phân trang trên nhiều loại thực thể.
- Xem chi tiết và thao tác CRUD với dữ liệu.
- Import, upload và đọc ba file `.lnc` được hỗ trợ.
- Phục vụ logo Football Manager từ thư mục local.
- Cung cấp REST API và Swagger UI.

## Cấu trúc dự án

```text
fm-lnc/
├── fm-lnc-fe/          # Next.js frontend
├── fm-lnc-be-java/     # Spring Boot backend chính
│   ├── data/           # Ba file .lnc được đóng gói vào Docker image
│   └── src/            # Source Java và schema khởi tạo database
├── fm-lnc-be/          # NestJS backend cũ
├── render.yaml         # Render Blueprint: Java backend + PostgreSQL
├── BUILD.md            # Ghi chú build
└── JAVA_MIGRATION_PLAN.md
```

## Yêu cầu

- Java Development Kit 21.
- Maven 3.9+ hoặc Docker.
- Node.js 20+ và npm.
- PostgreSQL 14+.

## Chạy local

### 1. Chuẩn bị PostgreSQL

Tạo database:

```sql
CREATE DATABASE fm_lnc_db;
```

Backend tự chạy schema trong `fm-lnc-be-java/src/main/resources/schema.sql` khi khởi động.

### 2. Chạy backend Java

Cách nhanh nhất trên Windows:

```powershell
cd fm-lnc-be-java
.\run-local.bat
```

Hoặc chạy bằng Maven:

```powershell
cd fm-lnc-be-java
$env:DB_PASSWORD = 'your-password'
mvn spring-boot:run
```

Các biến môi trường backend:

| Biến | Giá trị mặc định | Mô tả |
| --- | --- | --- |
| `PORT` | `3001` | Cổng HTTP |
| `HOST` | `0.0.0.0` | Địa chỉ bind |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `123456` | PostgreSQL password local |
| `DB_NAME` | `fm_lnc_db` | Tên database |
| `LNC_FILES_DIR` | `./data` | Thư mục chứa file `.lnc` |
| `CONFED_LOGO_DIR` | rỗng | Thư mục logo liên đoàn |
| `NATION_LOGO_DIR` | rỗng | Thư mục logo quốc gia |
| `COMP_LOGO_DIR` | rỗng | Thư mục logo giải đấu |
| `CLUB_LOGO_DIR` | rỗng | Thư mục logo câu lạc bộ |

Không dùng mật khẩu mặc định ở môi trường production và không commit thông tin bí mật vào repository.

Hướng dẫn backend đầy đủ: [fm-lnc-be-java/RUN_AND_DEPLOY.md](./fm-lnc-be-java/RUN_AND_DEPLOY.md).

### 3. Chạy frontend

```powershell
cd fm-lnc-fe
npm install
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:3001/api'
npm run dev
```

Mở `http://localhost:3002`.

Có thể lưu cấu hình API vào `fm-lnc-fe/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api
```

## Dữ liệu LNC

Backend Java chỉ chấp nhận ba file sau:

- `fm24_club.lnc`
- `fm24_competition_other.lnc`
- `fm24_geography.lnc`

Các file mặc định nằm trong `fm-lnc-be-java/data` và được đóng gói vào Docker image.

Import dữ liệu từ các file hiện có:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3001/api/lnc/import `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{}'
```

Kiểm tra trạng thái dữ liệu:

```powershell
Invoke-RestMethod http://localhost:3001/api/lnc/status
```

Quá trình import chạy trong transaction; nếu có lỗi, toàn bộ thay đổi của lần import sẽ được rollback.

## URL quan trọng

| Nội dung | URL local |
| --- | --- |
| Frontend | `http://localhost:3002` |
| Health check | `http://localhost:3001/health` |
| Swagger UI | `http://localhost:3001/docs` |
| OpenAPI JSON | `http://localhost:3001/api/docs` |
| LNC status | `http://localhost:3001/api/lnc/status` |
| Unit tree | `http://localhost:3001/api/hierarchy/unit-tree?type=nation` |

Các nhóm API chính:

- `/api/hierarchy`: cây phân cấp, danh sách và bộ lọc.
- `/api/records`: chi tiết và CRUD thực thể.
- `/api/search`: tìm kiếm toàn văn.
- `/api/lnc`: import, upload, trạng thái và public file.
- `/api/logos`: logo local.
- `/api/config`: cấu hình đường dẫn local.

Swagger UI là tài liệu chính xác nhất về request và response của từng endpoint.

## Build và kiểm tra

Backend Java:

```powershell
cd fm-lnc-be-java
mvn clean package
```

Frontend:

```powershell
cd fm-lnc-fe
npm run lint
npm run build
```

## Docker

```powershell
cd fm-lnc-be-java
docker build -t fm-lnc-be-java .
docker run --rm --name fm-lnc-be-java `
  -p 3001:3001 `
  -e DB_HOST=host.docker.internal `
  -e DB_PASSWORD=your-password `
  -e DB_NAME=fm_lnc_db `
  fm-lnc-be-java
```

## Deploy lên Render

`render.yaml` khai báo:

- Web service `fm-lnc-backend` build từ `fm-lnc-be-java/Dockerfile`.
- PostgreSQL database `fm-lnc-db`.
- Region Singapore.
- `LNC_FILES_DIR=/app/data`.

Sau khi deploy, kiểm tra lần lượt `/health`, `/api/lnc/status`, Unit Tree và Search. File upload vào filesystem của container không tồn tại vĩnh viễn nếu service không gắn persistent disk; muốn giữ phiên bản `.lnc` qua các lần redeploy, hãy cập nhật file trong `fm-lnc-be-java/data` và build lại image.

Chi tiết deploy và rollback: [fm-lnc-be-java/RUN_AND_DEPLOY.md](./fm-lnc-be-java/RUN_AND_DEPLOY.md).

## Phương án triển khai trên Google Cloud

### Chọn phương án theo mục tiêu chi phí

Không có phương án GCP managed đáp ứng đồng thời cả ba điều kiện **0 USD lâu dài**, **không ngủ đông** và **không giới hạn đáng kể**:

- Cloud SQL không có Always Free lâu dài; gói miễn phí chỉ là trial.
- Cloud Run có Free Tier nhưng mặc định có thể scale về 0. Giữ minimum instance để luôn nóng có thể phát sinh phí.
- Compute Engine có Always Free cho một VM `e2-micro`, nhưng VM chỉ có 1 GB RAM và external IPv4 đang được tính phí riêng.

| Phương án | Chi phí dài hạn | Ngủ đông | Đánh giá |
| --- | --- | --- | --- |
| Cloud Run + Cloud SQL | Có phí | Có thể cấu hình không ngủ | Tốt nhất cho production nhỏ |
| Compute Engine `e2-micro` + PostgreSQL cùng VM | Gần miễn phí | Không tự ngủ | Sát yêu cầu nhất trên GCP |
| Cloud Run + database free bên ngoài | Có thể 0 USD | Backend/database có thể cold start | Hợp demo hơn production |

#### Phương án sát 0 USD: Compute Engine Always Free

Chạy toàn bộ backend Java và PostgreSQL trên một VM `e2-micro`; đặt frontend ở một dịch vụ static/serverless miễn phí. VM Compute Engine không tự sleep khi không có request.

Để nằm trong Always Free, VM phải đáp ứng các giới hạn hiện hành:

- Một non-preemptible `e2-micro` tại `us-west1`, `us-central1` hoặc `us-east1`.
- Tối đa 30 GB-month standard persistent disk.
- Tối đa 1 GB outbound data từ Bắc Mỹ mỗi tháng theo Free Tier Compute Engine.

Cấu hình đề xuất cho VM 1 GB RAM:

- Debian hoặc Ubuntu tối giản.
- PostgreSQL chạy native trên VM.
- Java backend chạy bằng `systemd`, đặt `-Xms128m -Xmx320m`.
- Tạo 1–2 GB swap để giảm nguy cơ OOM khi build hoặc import dữ liệu.
- Không build Maven/Next.js trên VM; build JAR ở máy local hoặc CI rồi upload artifact.
- Không chạy frontend Next.js và Docker daemon thường trực trên cùng VM nếu muốn hệ thống ổn định.
- Dùng Nginx hoặc Caddy làm reverse proxy và tự khởi động cùng hệ thống.
- Backup database định kỳ ra ngoài VM; một VM và một disk không phải kiến trúc high availability.

Điểm cần lưu ý về chi phí mạng:

- External IPv4 gắn vào VM hiện được tính khoảng `0.005 USD/giờ`, tương đương khoảng `3.60 USD/tháng` nếu chạy liên tục.
- External IPv6 gắn vào VM hiện không bị tính phí địa chỉ, nhưng triển khai IPv6-only, DNS và khả năng truy cập của client phức tạp hơn.
- Vì vậy, cấu hình dễ vận hành với IPv4 là **gần miễn phí**, không phải tuyệt đối 0 USD.

Đây là phương án phù hợp khi lượng người dùng nhỏ, chấp nhận độ trễ từ Việt Nam tới region US và có thể tự quản trị Linux/PostgreSQL. Nó không phù hợp nếu cần SLA, autoscaling hoặc phục hồi tự động.

Nếu ưu tiên **không ngủ đông và vận hành ổn định**, nên chấp nhận ngân sách tối thiểu cho IPv4 hoặc một VM lớn hơn. Nếu ưu tiên **0 USD tuyệt đối**, cần chấp nhận cold start, giới hạn tài nguyên hoặc rủi ro chính sách Free Tier thay đổi.

### Phương án managed cho production nhỏ

Kiến trúc khuyến nghị khi chấp nhận chi phí Cloud SQL:

```text
Internet
   │
   ├── Frontend Next.js
   │       │
   │       └── HTTPS API
   │
   └── Cloud Run (fm-lnc-backend)
           │
           ├── Artifact Registry (Docker image)
           ├── Secret Manager (DB_PASSWORD)
           └── Direct VPC egress
                   │
                   └── Cloud SQL for PostgreSQL (private IP)
```

Phương án này phù hợp với code hiện tại vì backend đã nhận kết nối PostgreSQL dạng TCP qua `DB_HOST` và `DB_PORT`. Cloud Run truy cập private IP của Cloud SQL qua Direct VPC egress nên không cần sửa source để tích hợp Cloud SQL Java Connector.

Nên đặt Cloud Run, subnet, Artifact Registry và Cloud SQL cùng region, ví dụ `asia-southeast1` (Singapore), để giảm độ trễ và chi phí truyền dữ liệu.

### 1. Chuẩn bị project và API

Cài [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), đăng nhập và chọn project:

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region asia-southeast1
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  sqladmin.googleapis.com `
  secretmanager.googleapis.com `
  compute.googleapis.com `
  servicenetworking.googleapis.com
```

### 2. Tạo mạng và Cloud SQL

Tạo VPC/subnet, sau đó tạo Cloud SQL for PostgreSQL với **private IP** trong cùng VPC. Có thể thực hiện phần này trên Google Cloud Console:

1. **VPC network → VPC networks**: tạo network `fm-lnc-vpc` ở custom mode.
2. Tạo subnet `fm-lnc-subnet`, region `asia-southeast1`, ví dụ CIDR `10.10.0.0/24`.
3. **Cloud SQL → Create instance → PostgreSQL**.
4. Chọn region `asia-southeast1`, bật private IP và chọn `fm-lnc-vpc`.
5. Tạo database `fm_lnc_db` và user riêng cho ứng dụng.
6. Ghi lại private IP của instance để dùng làm `DB_HOST`.

Không bật public IP nếu không cần truy cập database trực tiếp từ Internet. Khi cần kết nối từ máy local để quản trị, ưu tiên Cloud SQL Auth Proxy.

### 3. Tạo Artifact Registry và đẩy image

```powershell
gcloud artifacts repositories create fm-lnc `
  --repository-format=docker `
  --location=asia-southeast1 `
  --description="FM LNC container images"

gcloud auth configure-docker asia-southeast1-docker.pkg.dev

cd fm-lnc-be-java
docker build -t asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/fm-lnc/backend:latest .
docker push asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/fm-lnc/backend:latest
```

### 4. Lưu mật khẩu trong Secret Manager

Tạo secret `fm-lnc-db-password` trên **Security → Secret Manager**, thêm mật khẩu database làm version đầu tiên, rồi cấp role `Secret Manager Secret Accessor` cho service account chạy Cloud Run.

Không truyền mật khẩu production bằng `--set-env-vars` và không lưu mật khẩu trong README, source code hoặc Docker image.

### 5. Deploy backend lên Cloud Run

Thay `YOUR_PROJECT_ID`, `DB_PRIVATE_IP` và `DB_USER` bằng giá trị thực tế:

```powershell
gcloud run deploy fm-lnc-backend `
  --image=asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/fm-lnc/backend:latest `
  --region=asia-southeast1 `
  --allow-unauthenticated `
  --port=3001 `
  --network=fm-lnc-vpc `
  --subnet=fm-lnc-subnet `
  --vpc-egress=private-ranges-only `
  --set-env-vars="HOST=0.0.0.0,DB_HOST=DB_PRIVATE_IP,DB_PORT=5432,DB_USERNAME=DB_USER,DB_NAME=fm_lnc_db,LNC_FILES_DIR=/app/data" `
  --set-secrets="DB_PASSWORD=fm-lnc-db-password:latest" `
  --memory=1Gi `
  --cpu=1 `
  --min=0 `
  --max=3
```

Giới hạn `--max` giúp kiểm soát số instance và số connection tới Cloud SQL. Backend đang giới hạn Hikari pool ở 10 connection cho mỗi instance.

Sau khi deploy, lấy URL được Cloud Run trả về và kiểm tra:

```powershell
Invoke-RestMethod https://YOUR_CLOUD_RUN_URL/health
Invoke-RestMethod https://YOUR_CLOUD_RUN_URL/api/lnc/status
```

### 6. Frontend

Đặt biến build-time sau trước khi build frontend:

```env
NEXT_PUBLIC_API_URL=https://YOUR_CLOUD_RUN_URL/api
```

Repository hiện chưa có Dockerfile cho `fm-lnc-fe`. Có hai lựa chọn:

- Giữ frontend trên nền tảng đang sử dụng và chỉ chuyển backend/database sang GCP.
- Bổ sung Dockerfile standalone cho Next.js rồi deploy frontend thành một Cloud Run service riêng.

Nếu deploy frontend lên Cloud Run, không đặt database credentials hoặc secret backend vào container frontend; frontend chỉ cần public API URL.

### 7. Dữ liệu, vận hành và chi phí

- Ba file `.lnc` trong `fm-lnc-be-java/data` được đóng gói trong image và tồn tại qua các lần scale/restart.
- File upload trực tiếp vào filesystem Cloud Run là tạm thời. Muốn lưu file người dùng lâu dài, cần bổ sung Google Cloud Storage; source hiện chưa tích hợp cơ chế này.
- Bật automated backup và point-in-time recovery cho Cloud SQL nếu dữ liệu quan trọng.
- Cloud Run có thể scale về 0, nhưng Cloud SQL vẫn phát sinh chi phí khi instance đang chạy.
- Trước mỗi lần deploy, chạy `mvn clean package` và smoke test `/health`, `/api/lnc/status`, Unit Tree và Search.

Tài liệu GCP chính thức: [deploy container lên Cloud Run](https://cloud.google.com/run/docs/deploying), [Direct VPC egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc), [Cloud SQL private IP](https://cloud.google.com/sql/docs/postgres/private-ip), [Artifact Registry](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling) và [Secret Manager với Cloud Run](https://cloud.google.com/run/docs/configuring/services/secrets).

## Tài liệu liên quan

- [Backend Java](./fm-lnc-be-java/README.md)
- [Chạy và deploy backend Java](./fm-lnc-be-java/RUN_AND_DEPLOY.md)
- [Kế hoạch migration Java](./JAVA_MIGRATION_PLAN.md)
- [Hướng dẫn build](./BUILD.md)
- [Quy tắc làm việc với repository](./AGENTS.md)

## Repository

[github.com/ddthumonky88/fm-lnc](https://github.com/ddthumonky88/fm-lnc)
