<div align="center">

<h1>Rentify · Backend Boilerplate</h1>

<p>Template NestJS theo Clean Architecture + DDD + CQRS mà mọi backend service của Rentify được fork từ.</p>

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-24.18.0-339933?style=flat-square&logo=nodedotjs&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-12-E0234E?style=flat-square&logo=nestjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="TypeORM" src="https://img.shields.io/badge/TypeORM-1.1-FE0803?style=flat-square&logo=typeorm&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="RabbitMQ" src="https://img.shields.io/badge/RabbitMQ-topic_exchange-FF6600?style=flat-square&logo=rabbitmq&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-multi--stage-2496ED?style=flat-square&logo=docker&logoColor=white">
  <br>
  <a href="https://github.com/pbl6-home-renter/boilerplate/actions/workflows/deploy.yml"><img alt="Deploy" src="https://github.com/pbl6-home-renter/boilerplate/actions/workflows/deploy.yml/badge.svg"></a>
  <a href="https://github.com/pbl6-home-renter/boilerplate/actions/workflows/db-keepalive.yml"><img alt="DB Keepalive" src="https://github.com/pbl6-home-renter/boilerplate/actions/workflows/db-keepalive.yml/badge.svg"></a>
</p>

<p>
  <a href="#giới-thiệu">Giới thiệu</a> •
  <a href="#bắt-đầu-nhanh">Bắt đầu nhanh</a> •
  <a href="#fork-một-service-mới">Fork service mới</a> •
  <a href="#thêm-một-module-mới">Thêm module</a> •
  <a href="#kiến-trúc">Kiến trúc</a> •
  <a href="#biến-môi-trường">Biến môi trường</a> •
  <a href="#đóng-góp">Đóng góp</a>
</p>

</div>

---

## Giới thiệu

`boilerplate` là **implementation tham chiếu** cho kiến trúc backend của Rentify. `Identity-Service`, `Tenancy-Service` và mọi service sau này đều được fork từ đây, nên repo này quyết định:

- **Layout và quy ước** của mọi module (`domain` → `application` ← `infrastructure` / `presentation`), với module [`sample`](src/modules/sample) làm ví dụ đầy đủ.
- **Shared kernel `src/shared/`** — giống hệt nhau giữa mọi service. Sửa ở đây trước rồi đồng bộ sang các service (xem [Đồng bộ `src/shared/`](#đồng-bộ-srcshared)).
- **Hạ tầng dùng chung**: transactional outbox/inbox qua RabbitMQ, xác thực JWT qua JWKS, internal HTTP client, global exception filter, Swagger, migration/seed.

Mọi điểm khác nhau giữa các service được gom vào một file duy nhất: [`src/config/service.constants.ts`](src/config/service.constants.ts).

## Tính năng nổi bật

- **Clean Architecture + DDD** — Domain không import NestJS/TypeORM/RabbitMQ; port được bind bằng Symbol DI token (`<module>.di-token.ts`). Dependency rule có lệnh `grep` để kiểm tra.
- **CQRS với `@nestjs/cqrs`** — Command thay đổi state và có thể phát domain event; Query chỉ đọc. Use case đặt tên `<noun>-<verb>` (`commands/sample-create/` → `SampleCreateCommand`).
- **Transactional Outbox + Inbox** — Aggregate và `outbox_messages` được ghi trong cùng một local transaction (`IUnitOfWork`, truyền explicit, không dùng `AsyncLocalStorage`); relay publish lên RabbitMQ topic exchange với publisher confirm; consumer dedup bằng bảng `processed_events`. Delivery at-least-once, có retry queue (TTL) và DLQ.
- **Zero-trust auth** — Mỗi service tự verify access token RS256 của Identity-Service bằng JWKS cache 5 phút; không tin header `x-user-*`. Guard toàn cục + decorator `@Public()`, `@Roles()`, `@AllowLocked()`, `@InternalOnly()`, `@CurrentUser()`.
- **Internal HTTP client** — Đọc dữ liệu service khác (GET) trực tiếp trong private network, tự gắn `X-Service-Token`, bóc envelope, map lỗi peer sang exception chuẩn.
- **Global exception filter** — Map `DomainException`, `HttpException` và lỗi validation sang response envelope chuẩn với HTTP status phù hợp (400, 404, 409, ...).
- **TypeORM + PostgreSQL** — Naming strategy snake_case, migration, seeding (`typeorm-extension`), tự bật SSL khi host là Supabase.
- **Swagger tự động** tại `/api/v1/<PATH>/swagger`, health check tại `/api/v1/<PATH>/health`.
- **Sẵn sàng deploy** — Dockerfile multi-stage (Node 24.18.0-slim), container tự chạy migration khi khởi động, GitHub Actions build image `linux/amd64` và deploy lên EC2.

## Tech stack

| Hạng mục | Công nghệ |
|---|---|
| Runtime | Node.js `24.18.0` (`.nvmrc`, `engines: >=24.18.0`) |
| Framework | NestJS 12, `@nestjs/cqrs`, `@nestjs/swagger`, `@nestjs/config` |
| Ngôn ngữ | TypeScript 6 |
| Database | PostgreSQL (Supabase), TypeORM 1.x, `typeorm-extension` (seed) |
| Messaging | RabbitMQ qua `@golevelup/nestjs-rabbitmq` (topic exchange, retry queue, DLQ) |
| Auth | `jose` (verify RS256 qua JWKS), Passport |
| HTTP nội bộ | `@nestjs/axios` / `axios` |
| Validation | `class-validator`, `class-transformer` |
| Chất lượng code | `oxlint`, Prettier, Husky + lint-staged |
| Đóng gói / CI | Docker multi-stage, GitHub Actions, Docker Hub, AWS EC2 |

## Bắt đầu nhanh

### Yêu cầu

- Node.js `24.18.0` (khớp `.nvmrc`) và npm
- PostgreSQL (local hoặc Supabase)
- RabbitMQ (local, ví dụ `amqp://guest:guest@localhost:5672`)
- Identity-Service đang chạy nếu cần gọi route có xác thực (để tải JWKS)

### Cài đặt

```bash
git clone https://github.com/pbl6-home-renter/boilerplate.git
cd boilerplate
npm install
```

### Cấu hình

```bash
cp .env.example .env
# Sửa DATABASE_URL (hoặc DB_*), RABBITMQ_URL, JWKS_URL trong .env
```

> [!IMPORTANT]
> `.env.example` đặt `DB_SSL=true`. Khi chạy PostgreSQL local không có SSL, đổi thành `DB_SSL=false` — nếu bỏ trống, SSL tự bật với host Supabase hoặc khi `NODE_ENV` là `prod`/`production`.

### Chạy

```bash
npm run migration:run   # tạo bảng outbox/inbox và bảng của module
npm run start:dev       # watch mode
```

| Endpoint | URL (mặc định `PORT=3001`, `PATH=sample`) |
|---|---|
| Swagger UI | `http://localhost:3001/api/v1/sample/swagger` |
| OpenAPI JSON | `http://localhost:3001/api/v1/sample/swagger/json` |
| Health check | `GET http://localhost:3001/api/v1/sample/health` |
| Sample API | `POST /api/v1/samples`, `GET /api/v1/samples/:id`, `DELETE /api/v1/samples/:id` |

<details>
<summary><b>Chạy bằng Docker</b></summary>

```bash
docker build -t rentify-backend:local .
docker run -p 3001:3001 --env-file .env rentify-backend:local
```

Image dùng 3 stage (`builder` → `dependencies` → `runner`). Entrypoint [`start.sh`](start.sh) chạy `npm run migration:run:prod` (lỗi migration không chặn khởi động) rồi `node dist/main.js`.

</details>

## Fork một service mới

1. **Tạo repo** mới trong org `pbl6-home-renter` từ boilerplate này.
2. **Sửa [`src/config/service.constants.ts`](src/config/service.constants.ts)** — nơi duy nhất chứa khác biệt giữa các service:

   | Hằng số | Ý nghĩa | Ví dụ |
   |---|---|---|
   | `PATH` | Path segment phía sau gateway; health/Swagger nằm dưới `/api/v1/<PATH>/` | `tenancy` |
   | `TITLE`, `DESCRIPTION` | Tiêu đề/mô tả Swagger | `Rentify Tenancy Service` |
   | `DEFAULT_DATABASE_NAME` | DB mặc định khi không có `DATABASE_URL` lẫn `DB_DATABASE` | `tenancy_db` |

3. **Đổi `name`/`description` trong `package.json`** (mặc định `nest-clean-architecture-boilerplate`) và tag image trong `.github/workflows/deploy.yml` (mặc định `rentify-backend`).
4. **Cấu hình `.env`**: `PORT` riêng cho service (Identity `3001`, Tenancy `3002`, ...), database riêng (database-per-service), `APP_NAME` / `RABBITMQ_EXCHANGE`, `JWKS_URL`, `SERVICE_TOKEN` dùng chung.
5. **Xoá module `sample`** (và import của nó trong `app.module.ts`) khi đã có module thật; giữ `health`, `outbox`, `inbox`.
6. **Thêm route trên API Gateway** theo [`api-gateway/docs/02-routing.md`](https://github.com/pbl6-home-renter/api-gateway/blob/main/docs/02-routing.md), và khai báo service trong [`infra`](https://github.com/pbl6-home-renter/infra).
7. **Cập nhật hợp đồng API** trong [`be`](https://github.com/pbl6-home-renter/be) (`api-docs/src/`) rồi bundle lại.

> [!WARNING]
> **Không sửa `src/shared/` trong service đã fork.** Nếu cần hành vi khác, đưa phần khác biệt vào `config/service.constants.ts` hoặc override provider trong module của service.

## Thêm một module mới

Module [`sample`](src/modules/sample) là ví dụ chuẩn; hướng dẫn chi tiết ở [`docs/architecture.md` §4–5](docs/architecture.md#4-layout-một-module). Tóm tắt cho module `products`:

1. `domain/` — `entities/product.entity.ts` (kế thừa `AggregateRoot` nếu phát event), `repositories/product.repository.ts` (kế thừa `BaseRepository<ProductEntity>` khi hỗ trợ đủ `save`/`findById`/`delete`), `exceptions/` (kế thừa `DomainException`).
2. `products.di-token.ts` — `PRODUCT_DI_TOKEN = { REPOSITORY: Symbol('PRODUCT_REPOSITORY') }`.
3. `infrastructure/persistence/` — `product.typeorm-entity.ts` (kế thừa `AbstractEntity`), `product.repository.ts`, `mappers/product.mapper.ts`.
4. `application/commands/product-create/`, `application/queries/product-get-by-id/`.
5. `presentation/http/` — `controllers/`, `requests/`, `responses/`, `constants/` (response code); `presentation/messaging/` nếu consume event.
6. `products.module.ts` đăng ký provider theo DI token, import vào `app.module.ts`.
7. Sinh migration: `npm run migration:generate -- src/database/migrations/<Name>`.

> [!IMPORTANT]
> File chứa `@Entity` **phải** có đuôi `.typeorm-entity.ts` và nằm trong `infrastructure/persistence/`. Đặt sai tên hoặc sai thư mục, app và TypeORM CLI sẽ dừng ngay khi khởi động kèm thông báo chỉ rõ file.

Kiểm tra dependency rule — cả ba lệnh phải **không in ra gì**:

```bash
grep -rnE "from '(@nestjs|typeorm|express)" src/shared/domain src/modules/*/domain
grep -rnE "from '[^']*(infrastructure|presentation)" src/shared/domain src/shared/application src/modules/*/domain src/modules/*/application
grep -rnE "from '[^']*application" src/shared/domain src/modules/*/domain
```

Import: cùng module dùng đường dẫn tương đối; khác module/khác tầng dùng đường dẫn tuyệt đối theo `baseUrl: ./src` (`shared/...`, `modules/...`, `config/...`). Thêm integration event mới: xem [`docs/transactional-outbox-design.md` §9](docs/transactional-outbox-design.md#9-cách-thêm-một-event-mới).

## Kiến trúc

Cả `src/shared/` lẫn từng module đều chia 4 tầng, dependency một chiều hướng vào domain:

```mermaid
flowchart LR
    P["presentation<br/>controller, DTO, subscriber"] --> A["application<br/>command/query handler, port"]
    I["infrastructure<br/>TypeORM, mapper, RabbitMQ"] --> A
    A --> D["domain<br/>entity, aggregate, event, repository interface"]
```

`BaseEntity` chỉ chứa identity/lifecycle; aggregate chứa behavior và là nơi phát domain event. Entity đọc từ database được reconstitute để không phát lại event. Domain event mô tả sự kiện trong bounded context; integration event là contract gửi qua broker.

### Transactional Outbox

Command vừa ghi database vừa phát event không publish trực tiếp trong handler (tránh dual-write):

```mermaid
flowchart LR
    C["Controller"] --> H["Command handler"]
    H --> AG["Aggregate"]
    AG --> TX[("Transaction:<br/>aggregate + outbox_messages")]
    TX --> R["Outbox relay<br/>(poll mỗi 1s)"]
    R --> X{{"RabbitMQ topic exchange"}}
    X --> Q["Consumer queue"]
    Q --> IN[("Inbox<br/>processed_events")]
    Q -. "lỗi" .-> RT["&lt;queue&gt;.retry (TTL)"]
    RT -.-> Q
    Q -. "hết lượt" .-> DLQ["&lt;queue&gt;.dlq"]
```

- Delivery **at-least-once**, consumer bỏ qua duplicate bằng `messageId` + `processed_events`.
- Queue riêng cho từng loại aggregate; ordering chỉ được cam kết **trong cùng aggregate** (consumer queue dùng prefetch 1).
- Message outbox `FAILED` (hết `OUTBOX_MAX_ATTEMPTS`) được gỡ bằng `npm run outbox:requeue -- <message-id>`.
- Không dùng `@nestjs/microservices` / `ClientProxy`.

Tài liệu đầy đủ (topology, relay, vận hành, verification thủ công): [`docs/transactional-outbox-design.md`](docs/transactional-outbox-design.md).

<details>
<summary><b>Luồng CQRS của module <code>sample</code></b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Controller as SampleController
    participant CommandBus as CommandBus
    participant Handler as SampleCreateCommandHandler
    participant Domain as SampleEntity
    participant Repo as SampleRepository
    participant DB as PostgreSQL

    Client->>Controller: POST /api/v1/samples
    Controller->>CommandBus: execute(new SampleCreateCommand(...))
    CommandBus->>Handler: execute(command)
    Handler->>Domain: SampleEntity.create(props)
    Handler->>Repo: save(sample) + outbox trong cùng transaction
    Repo->>DB: INSERT samples, outbox_messages
    Handler-->>Controller: SampleEntity
    Controller-->>Client: 201 Created
```

</details>

### Xác thực và phân quyền

Mỗi service **tự verify** access token RS256 do Identity-Service phát hành, kể cả khi request đã qua gateway: trong private network ai cũng có thể tự gắn `x-user-*`, còn chữ ký JWT thì không giả được. [`SecurityModule`](src/shared/security.module.ts) đăng ký các guard toàn cục:

| Guard | Việc làm | Lỗi |
|---|---|---|
| `ServiceTokenGuard` | Route `@InternalOnly()`: kiểm `X-Service-Token` = `SERVICE_TOKEN` | `401 UNAUTHORIZED` |
| `JwtAuthGuard` | Mọi route **mặc định cần token**; gắn `request.user = { id, role, status }` | `401 UNAUTHORIZED`, `503 AUTH_UNAVAILABLE` (không tải được JWKS) |
| `RolesGuard` | Kiểm `@Roles(...)` | `403 FORBIDDEN` |
| `ActiveUserGuard` | Chặn user `status=locked`, trừ khi `@AllowLocked(...)` cho phép role đó | `403 ACCOUNT_LOCKED` |

Mọi guard đều phải pass; thứ tự chỉ quyết định lỗi nào được trả khi nhiều guard cùng fail. Decorator nằm ở [`src/shared/presentation/decorators/auth/`](src/shared/presentation/decorators/auth/):

```ts
@Public()                         // không cần token (có token hợp lệ vẫn gắn request.user)
@Roles(UserRole.LANDLORD)         // giới hạn role
@AllowLocked()                    // cho phép mọi role bị khóa (vd. GET /me)
@AllowLocked(UserRole.TENANT)     // chỉ tenant bị khóa được gọi (vd. xem/thanh toán hoá đơn)
@InternalOnly()                   // service-to-service, xác thực bằng X-Service-Token
@CurrentUser() user: AuthenticatedUser
```

Quy ước:

- Route public: `/api/v1/<PATH>/...`. Route nội bộ đặt dưới `internal/...` — **ngoài** prefix `api/v1`, gateway không route tới.
- Ownership dữ liệu (vd. landlord chỉ sửa building của mình) kiểm tra trong use case, không phải guard.
- Service không bật CORS; API Gateway lo phần này.

### Gọi service khác (internal HTTP)

- **Chỉ dùng để đọc (GET).** Ghi sang service khác thì phát event qua outbox.
- Gọi thẳng trong private network (`IDENTITY_SERVICE_URL`, `TENANCY_SERVICE_URL`), không qua gateway; timeout `INTERNAL_HTTP_TIMEOUT_MS`.
- Inject `INTERNAL_HTTP_DI_TOKEN.CLIENT` (`IInternalHttpClient`) ở tầng `infrastructure/` của module, sau một port riêng của module. Client tự gắn `X-Service-Token` (hoặc `Authorization` nếu truyền `bearerToken`) và trả về `data` đã bóc envelope.
- **Không retry.** Lỗi mạng/timeout/5xx → `PeerServiceUnavailableException` (`503 SERVICE_UNAVAILABLE`); 4xx → `PeerServiceRequestException` (giữ `statusCode`, `code` của peer). Dữ liệu hiển thị thì fallback (`null`); dữ liệu ra quyết định thì để 503 đi ra (fail-closed).
- Type response được khai báo lại trong module gọi, không import từ service khác.

```ts
const stats = await this.client.get<UserStats>(
  PeerService.TENANCY,
  `/internal/users/${userId}/stats`,
);
```

### Đồng bộ `src/shared/`

`src/shared/` là bản copy, không phải package. Sửa ở boilerplate trước, rồi từ thư mục workspace chứa các repo:

```bash
cp -r boilerplate/src/shared/. <Service>/src/shared/
diff -rq --strip-trailing-cr boilerplate/src/shared <Service>/src/shared   # phải rỗng
```

## Biến môi trường

Đọc qua `ApiConfigService` ([`src/shared/infrastructure/config/`](src/shared/infrastructure/config/)). Giá trị dưới đây lấy từ `.env.example` / default trong code.

| Biến | Bắt buộc | Mô tả |
|---|:---:|---|
| **Ứng dụng** | | |
| `PORT` | Không | Cổng HTTP, mặc định `3001` |
| `APP_NAME` | Không | Tên ứng dụng, mặc định `MyApp`; dùng làm tiền tố exchange mặc định |
| `NODE_ENV` | Không | `dev` / `production`; ảnh hưởng việc tự bật SSL DB |
| `ENABLE_DOCUMENTATION` | Không | Bật Swagger, mặc định `true` |
| `LOG_LEVEL` | Không | Mức log, mặc định `debug` |
| **Xác thực** | | |
| `JWKS_URL` | Có* | JWKS của Identity-Service, vd. `http://localhost:3001/api/v1/.well-known/jwks.json` |
| `JWT_PUBLIC_KEY` | Có* | Thay thế `JWKS_URL` bằng public key tĩnh |
| `JWT_ISSUER` | Không | Mặc định `rentify-identity`, phải khớp Identity-Service |
| `JWT_AUDIENCE` | Không | Mặc định `rentify-api`, phải khớp Identity-Service |
| `SERVICE_TOKEN` | Khi dùng `internal/*` | Secret chung giữa các service; rỗng = tắt endpoint nội bộ |
| **Service khác** | | |
| `IDENTITY_SERVICE_URL` | Khi gọi Identity | vd. `http://localhost:3001` (`http://identity:3001` trên Docker); rỗng = lời gọi trả 503 |
| `TENANCY_SERVICE_URL` | Khi gọi Tenancy | vd. `http://localhost:3002` (`http://tenancy:3002` trên Docker) |
| `INTERNAL_HTTP_TIMEOUT_MS` | Không | Timeout mỗi lời gọi, mặc định `3000` |
| **Database** | | |
| `DATABASE_URL` | Có** | Connection string đầy đủ (khuyên dùng với Supabase pooler) |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | Có** | Dùng khi không có `DATABASE_URL`; mặc định `localhost` / `5432` / `postgres` / `postgres` / `DEFAULT_DATABASE_NAME` |
| `DB_SSL` | Không | `true`/`false`; bỏ trống thì tự bật với host Supabase hoặc `NODE_ENV=production` |
| `MIGRATION_DATABASE_URL` | Không | Direct URL (không qua pgbouncer) cho migration |
| `ENABLE_ORM_LOGS` | Không | In câu lệnh SQL khi debug, mặc định `false` |
| **RabbitMQ** | | |
| `RABBITMQ_URL` | Có | vd. `amqp://guest:guest@localhost:5672` |
| `RABBITMQ_EXCHANGE` | Không | Durable exchange cho integration event, mặc định `<APP_NAME>.events` |
| `RABBITMQ_EXCHANGE_TYPE` | Không | Mặc định `topic` |
| `RABBITMQ_PREFETCH` | Không | Prefetch channel mặc định, `10` (consumer queue dùng prefetch 1) |
| `RABBITMQ_CONNECT_TIMEOUT_MS` | Không | Mặc định `10000` |
| `RABBITMQ_PUBLISH_MANDATORY` | Không | Cờ `mandatory` khi publish, mặc định `true` |
| `RABBITMQ_CONSUMER_MAX_ATTEMPTS` | Không | Số lần xử lý trước khi vào `<queue>.dlq`, mặc định `5` |
| `RABBITMQ_CONSUMER_RETRY_DELAY_MS` | Không | Thời gian chờ trong `<queue>.retry`, mặc định `10000` |
| **Transactional Outbox** | | |
| `OUTBOX_RELAY_ENABLED` | Không | Bật/tắt relay, mặc định `true` |
| `OUTBOX_RELAY_INTERVAL_MS` | Không | Chu kỳ poll, mặc định `1000` |
| `OUTBOX_RELAY_BATCH_SIZE` | Không | Số message mỗi lượt, mặc định `100` |
| `OUTBOX_PUBLISH_TIMEOUT_MS` | Không | Timeout publisher confirm, mặc định `5000` |
| `OUTBOX_CLAIM_TIMEOUT_MS` | Không | Thời gian giữ claim message, mặc định `60000` |
| `OUTBOX_MAX_ATTEMPTS` | Không | Tổng số lần publish trước khi `FAILED`, mặc định `10` |
| `OUTBOX_RETRY_BASE_DELAY_MS` / `OUTBOX_RETRY_MAX_DELAY_MS` | Không | Backoff giữa các lần publish, mặc định `1000` / `60000` |
| `OUTBOX_RETENTION_MS` | Không | Thời gian giữ row `PUBLISHED`, mặc định `604800000` (7 ngày) |

\* Cần một trong hai `JWKS_URL` hoặc `JWT_PUBLIC_KEY` để verify token. \*\* Cần `DATABASE_URL` hoặc bộ `DB_*`.

<details>
<summary><b>Biến có trong <code>.env.example</code> nhưng code hiện chưa đọc</b></summary>

`API_DOMAIN`, `API_VERSION`, `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS` (credential cho container RabbitMQ), `REDIS_HOST`, `REDIS_PORT`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` — giữ làm placeholder cho service cần Redis/SMTP.

</details>

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run start:dev` | Chạy watch mode |
| `npm run start:debug` | Watch mode kèm debugger |
| `npm run build` | Biên dịch sang `dist/` |
| `npm run start:prod` | Chạy `node dist/main` |
| `npm run lint` / `lint:fix` | `oxlint src/` (tự sửa với `lint:fix`) |
| `npm run format` / `format:check` | Prettier cho `src/**/*.ts` |
| `npm run migration:generate -- src/database/migrations/<Name>` | Sinh migration từ thay đổi entity |
| `npm run migration:create -- src/database/migrations/<Name>` | Tạo migration rỗng |
| `npm run migration:run` / `migration:revert` | Áp dụng / hoàn tác migration |
| `npm run migration:run:prod` | Chạy migration từ `dist/` (dùng trong container) |
| `npm run schema:drop` | Xoá toàn bộ schema (cẩn thận) |
| `npm run seed:run` | Chạy seeder (`typeorm-extension`) |
| `npm run outbox:requeue -- <message-id>` | Đưa message outbox `FAILED` về hàng đợi (`outbox:requeue:prod` trong container) |

> [!NOTE]
> Repo hiện **chưa có test script**. Kiểm tra thay đổi bằng `npm run build`, `npm run lint`, `npm run format:check` và các lệnh dependency rule. Husky + lint-staged tự chạy `oxlint --fix` và `prettier --write` trên file staged.

## Cấu trúc thư mục

```text
boilerplate/
├── .github/workflows/
│   ├── deploy.yml                  # Build image linux/amd64 → Docker Hub → deploy EC2
│   └── db-keepalive.yml            # Cron hằng ngày giữ Supabase không ngủ
├── docs/
│   ├── architecture.md             # Tầng, layout module, đồng bộ shared/, dependency rule
│   └── transactional-outbox-design.md
├── scripts/keep-alive.ts           # Script được db-keepalive.yml gọi
├── src/
│   ├── main.ts                     # Bootstrap: prefix api/v1 (trừ internal/*), pipe, Swagger
│   ├── app.module.ts
│   ├── config/service.constants.ts # PATH, Swagger title/description, DB mặc định
│   ├── database/migrations/        # Migration của service (outbox/inbox sẵn có)
│   ├── shared/                     # Shared kernel — giống hệt mọi service
│   │   ├── shared.module.ts        # Config, TypeORM, RabbitMQ, UnitOfWork
│   │   ├── security.module.ts      # Guard toàn cục
│   │   ├── domain/                 # BaseEntity, AggregateRoot, DomainException, value object, BaseRepository
│   │   ├── application/            # Port (UnitOfWork, publisher, HTTP), phân trang, contract auth
│   │   ├── infrastructure/         # Config, database, RabbitMQ, internal HTTP, verify token
│   │   └── presentation/           # Guard, decorator, validator, filter/interceptor/pipe/middleware
│   └── modules/
│       ├── health/                 # GET /api/v1/<PATH>/health
│       ├── outbox/                 # Outbox, relay scheduler, CLI requeue
│       ├── inbox/                  # Dedup phía consumer (processed_events)
│       └── sample/                 # Module mẫu
│           ├── sample.di-token.ts
│           ├── sample.module.ts
│           ├── domain/             # entities, events, exceptions, repositories, constants
│           ├── application/        # commands/sample-create, sample-delete; queries/sample-get-by-id
│           ├── infrastructure/     # persistence/ (typeorm-entity, repository, mappers), seeds/
│           └── presentation/       # http/ (controllers, requests, responses, constants), messaging/
├── Dockerfile                      # Multi-stage: builder → dependencies → runner
├── start.sh                        # Entrypoint: migration:run:prod rồi node dist/main.js
└── .env.example
```

## API / Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Dependency rule, `src/shared/`, layout module, quy ước đặt tên và import, thêm module, đồng bộ `shared/` |
| [`docs/transactional-outbox-design.md`](docs/transactional-outbox-design.md) | Dual-write, transaction boundary, relay, RabbitMQ topology, inbox, cấu hình, thêm event mới |
| Swagger | `/api/v1/<PATH>/swagger` (JSON: `/api/v1/<PATH>/swagger/json`), bật bằng `ENABLE_DOCUMENTATION` |
| [`be`](https://github.com/pbl6-home-renter/be) | Hợp đồng OpenAPI chuẩn — mọi thay đổi API phải cập nhật `src/` ở đó và bundle lại |

## Triển khai

- **[`deploy.yml`](.github/workflows/deploy.yml)** — chạy khi push lên `main` hoặc `workflow_dispatch`: build image `linux/amd64`, push `<DOCKERHUB_USERNAME>/rentify-backend:latest`, rồi SSH vào EC2 chạy `infra/scripts/deploy.sh` (bỏ qua bước deploy nếu chưa cấu hình `EC2_HOST`). Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`.
- **[`db-keepalive.yml`](.github/workflows/db-keepalive.yml)** — cron `17 3 * * *` (UTC) chạy `scripts/keep-alive.ts` với secret `SUPABASE_DATABASE_URL`; chạy tay được với `dry_run` để chỉ kiểm tra kết nối.
- Service chạy trên host **internal**; topology và Compose nằm ở [`infra`](https://github.com/pbl6-home-renter/infra).

> [!WARNING]
> Cổng service (3000–3004) và RabbitMQ (5672) không bao giờ được mở public — chỉ API Gateway trên host edge nhận traffic từ ngoài.

## Đóng góp

- Luồng nhánh: `main` ← `develop` ← `feature/<id>-<slug>` (cũng dùng `fix/`, `hotfix/`, `docs/`, `ci/`). Task ID theo `pm/phase-N/issues/`, vd. `feature/p6-08-room-search`.
- Không push trực tiếp lên `main` / `develop`; mở PR, cần ≥ 1 reviewer, merge kiểu **squash**.
- Commit message bằng tiếng Anh theo [Conventional Commits](https://www.conventionalcommits.org/), vd. `feat(shared): add internal HTTP client for service-to-service reads`.
- Trước khi mở PR: `npm run build`, `npm run lint`, `npm run format:check`, và ba lệnh kiểm tra dependency rule.
- Thay đổi `src/shared/` phải được đồng bộ sang mọi service đã fork.

## Hệ sinh thái Rentify

| Repo | Vai trò |
|---|---|
| [`api-gateway`](https://github.com/pbl6-home-renter/api-gateway) | Reverse proxy: định tuyến theo prefix, xác thực JWT/JWKS, rate limit |
| [`Identity-Service`](https://github.com/pbl6-home-renter/Identity-Service) | Xác thực, người dùng, hồ sơ chủ trọ; phát hành JWT RS256 |
| [`Tenancy-Service`](https://github.com/pbl6-home-renter/Tenancy-Service) | Tòa nhà, phòng, đơn vị hành chính |
| **[`boilerplate`](https://github.com/pbl6-home-renter/boilerplate)** | Template NestJS mà mọi backend service được fork từ |
| [`be`](https://github.com/pbl6-home-renter/be) | Hợp đồng OpenAPI 3.0 chuẩn (canonical) |
| [`fe`](https://github.com/pbl6-home-renter/fe) | Web cho chủ trọ (React + Vite) |
| [`mobile`](https://github.com/pbl6-home-renter/mobile) | Ứng dụng Android cho người thuê & chủ trọ |
| [`infra`](https://github.com/pbl6-home-renter/infra) | Docker Compose + Caddy cho hai host EC2 |

## Giấy phép

Dự án học thuật thuộc học phần PBL6 — Trường Đại học Bách khoa, Đại học Đà Nẵng. Chưa phát hành theo giấy phép mã nguồn mở.
