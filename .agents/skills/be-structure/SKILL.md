---
name: be-structure
description: Where files and folders go in a Rentify NestJS backend service (boilerplate, Identity-Service, Tenancy-Service, …) — the domain / application / infrastructure / presentation layers, the module layout, where reads, ports, seeds and migrations live, and the rule that src/shared is a copy of boilerplate. Use before creating, moving or renaming any file under src/, when adding a new module or use case, or when unsure which layer a class belongs to.
license: Apache-2.0
metadata:
  version: "1.0.0"
  category: conventions
  author: Rentify BE
---

# Tổ chức file & thư mục — Rentify Backend

Skill này trả lời "file này thuộc tầng nào, đặt ở đâu". Tên file/class: skill `be-naming`. Tài liệu gốc: [`docs/architecture.md`](../../../docs/architecture.md) (của boilerplate). Module mẫu chuẩn: `boilerplate/src/modules/sample`.

## 1. Bốn tầng và chiều phụ thuộc

```text
presentation ──┐
               ├──► application ──► domain
infrastructure ┘
```

| Tầng | Chứa | Không được import |
|---|---|---|
| `domain/` | entity/aggregate, value object, domain event, domain exception, repository interface, enum, constants | `@nestjs/*`, `typeorm`, `express`, `application/`, `infrastructure/`, `presentation/` |
| `application/` | command/query + handler, port (`application/ports/`), result/read model | `infrastructure/`, `presentation/` (được dùng `@nestjs/cqrs`, `@Inject`) |
| `infrastructure/` | TypeORM entity, repository adapter, mapper, seed, adapter dịch vụ ngoài | `presentation/` |
| `presentation/` | controller, request/response DTO, response code, subscriber RabbitMQ | — |

Kiểm tra trước khi đẩy code (mỗi lệnh phải **không in gì**):

```bash
grep -rnE "from '(@nestjs|typeorm|express)" src/shared/domain src/modules/*/domain
grep -rnE "from '[^']*(infrastructure|presentation)" src/shared/domain src/shared/application src/modules/*/domain src/modules/*/application
grep -rnE "from '[^']*application" src/shared/domain src/modules/*/domain
```

## 2. Layout một module

Theo đúng `boilerplate/src/modules/sample` và `Tenancy-Service/src/modules/rate-policy`:

```text
modules/<noun>/
├── <noun>.module.ts
├── <noun>.di-token.ts                    # { REPOSITORY: Symbol(...), PAGE_QUERY: Symbol(...) }
├── domain/
│   ├── entities/<noun>.entity.ts (+ <noun>.props.ts)
│   ├── value-objects/<x>.vo.ts
│   ├── events/<noun>-<past-verb>.event.ts
│   ├── exceptions/<noun>-<reason>.exception.ts
│   ├── repositories/<noun>.repository.ts  # interface, extends BaseRepository<T>
│   ├── enums/, constants/<noun>-event.constants.ts
├── application/
│   ├── commands/<noun>-<verb>/<noun>-<verb>.command.ts + .command.handler.ts
│   ├── queries/<noun>-<verb>/<noun>-<verb>.query.ts + .query.handler.ts (+ .result.ts)
│   └── ports/<noun>-page-query.port.ts    # đọc danh sách, dịch vụ ngoài
├── infrastructure/
│   ├── persistence/<noun>.typeorm-entity.ts, <noun>.repository.ts, mappers/<noun>.mapper.ts
│   ├── services/                          # implement port gọi dịch vụ ngoài / service khác
│   └── seeds/<noun>-<verb>.seeder.ts
└── presentation/
    ├── http/controllers/, requests/, responses/, constants/
    └── messaging/<noun>.subscriber.ts, <noun>-consumer.constants.ts
```

- Chỉ tạo thư mục khi có file; không `.gitkeep`, không `index.ts` (barrel).
- **Không** dùng layout cũ `use-case/`, `infra/`, `commands/implements|handlers/`, `presentation/controllers/` (thiếu `http/`).
- Mỗi use case một thư mục riêng chứa đúng cặp command + handler (hoặc query + handler).

## 3. Ghi và đọc — đặt ở đâu

| Việc | Đặt ở | Ví dụ thật |
|---|---|---|
| Ghi aggregate | `domain/repositories/<noun>.repository.ts` (interface) ← `infrastructure/persistence/<noun>.repository.ts` | `Tenancy-Service/src/modules/rate-policy/domain/repositories/rate-policy.repository.ts` |
| Đọc 1 bản ghi theo id (get-by-id, kiểm tra trước khi ghi) | method của repository aggregate (`findById`, `findByIdForUpdate`) | `boilerplate/src/modules/sample/application/queries/sample-get-by-id/sample-get-by-id.query.handler.ts` |
| Đọc danh sách / phân trang / projection | port `application/ports/<noun>-page-query.port.ts`, DI token `PAGE_QUERY` | `Tenancy-Service/src/modules/rate-policy/application/ports/rate-policy-page-query.port.ts` |
| Gọi dịch vụ ngoài / service khác | port `application/ports/<x>.port.ts` ← `infrastructure/services/<x>.service.ts` | `Identity-Service/src/modules/users/application/ports/tenancy-user-stats.port.ts` |

- Repository domain chỉ có `save`, `findById`, `delete` (từ `BaseRepository`) + method cần cho **luồng ghi**. Không thêm `findPage`/filter vào interface domain.
- Port đọc danh sách được phép implement chung class với repository (`TypeOrmRatePolicyRepository implements RatePolicyRepository, RatePolicyPageQueryPort`, đăng ký bằng `useExisting` trong `rate-policy.module.ts`).
- Read model (kiểu trả về không phải entity) khai báo trong `application/` (port hoặc `<query>.result.ts`), **không** trong `domain/repositories/`.

## 4. `src/shared/` — bản copy, không sửa tại chỗ

- `src/shared/` giống hệt nhau giữa mọi service. Cần sửa → sửa ở `boilerplate`, merge, rồi copy:
  ```bash
  cp -r boilerplate/src/shared/. <Service>/src/shared/
  diff -rq --strip-trailing-cr boilerplate/src/shared <Service>/src/shared   # phải rỗng
  ```
- Giá trị khác nhau giữa service → `src/config/service.constants.ts` (`PATH`, `TITLE`, `DEFAULT_DATABASE_NAME`), không rẽ nhánh trong `shared/`.
- Code riêng của service (vd. geocoding config) đặt trong module của service đó, không thêm file vào `shared/`.

## 5. Migration & seed

- Migration của cả service ở `src/database/migrations/` (một timeline chung). Chỉ sinh bằng lệnh — xem skill `be-feature-workflow` bước 4.
- Seed thuộc module sở hữu dữ liệu: `modules/<noun>/infrastructure/seeds/*.seeder.ts` (mẫu `boilerplate/src/modules/sample/infrastructure/seeds/sample-create.seeder.ts`).

## 6. Import giữa các module

- Cùng module: đường dẫn tương đối (`../../../domain/...`). Khác module / `shared`: tuyệt đối theo `baseUrl: ./src` (`shared/...`, `modules/building/...`).
- Module khác chỉ được dùng thứ module đó `exports` (DI token repository, domain exception, entity) — vd. `rate-policy` import `BuildingModule` và inject `BUILDING_DI_TOKEN.REPOSITORY`. Không import TypeORM entity hay repository adapter của module khác.
- Không gọi chéo **service** bằng import; xem skill `be-cross-service`.
