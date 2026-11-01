---
name: be-naming
description: Naming rules for Rentify NestJS backend services — the noun-verb (domain-action) pattern for use-case folders, commands, queries, handlers, request/response DTOs, entities, TypeORM entities, repositories, mappers, value objects, domain exceptions, events, DI tokens and response codes. Use whenever creating or renaming a file or class in src/modules, or when a review argues about a name.
license: Apache-2.0
metadata:
  version: "1.0.0"
  category: conventions
  author: Rentify BE
---

# Đặt tên — Rentify Backend

Một quy tắc gốc: **danh từ (aggregate) trước, hành động sau** — `<noun>-<verb>[-<qualifier>]`. File `kebab-case.<loại>.ts`, class `PascalCase` cùng thứ tự từ. Nhờ vậy mọi thứ của một aggregate nằm cạnh nhau khi sắp xếp.

Vị trí thư mục: skill `be-structure`.

## 1. Use case (application)

| Loại | Thư mục / file | Class |
|---|---|---|
| Command | `commands/rate-policy-create/rate-policy-create.command.ts` | `RatePolicyCreateCommand` |
| Command handler | `.../rate-policy-create.command.handler.ts` | `RatePolicyCreateCommandHandler` |
| Query lấy 1 bản ghi | `queries/contract-get-by-id/contract-get-by-id.query.ts` | `ContractGetByIdQuery` |
| Query danh sách | `queries/rate-policy-list/rate-policy-list.query.ts` | `RatePolicyListQuery` |
| Kết quả đọc riêng | `queries/contract-list/contract-list.result.ts` | `ContractListResult` |
| Port | `ports/rate-policy-page-query.port.ts` | `RatePolicyPageQueryPort` |

Quy tắc cho query:

- Lấy một bản ghi: `<noun>-get-by-id` (hoặc `-get-by-<key>` khi tra theo khoá khác, vd. `contract-template-get-by-key`).
- Danh sách: `<noun>-list`. **Không** dùng `search`, `get-my-…`, `get-detail`, `public-search`.
- Cùng một tài nguyên nhưng khác góc nhìn theo **vai trò** → thêm hậu tố vai trò: `-admin`, `-landlord`, `-tenant`, `-public`, `-internal`. Vd. `building-list-admin`, `building-list-public`, `building-get-by-id-admin`, `user-lookup-internal`.
- Không dùng `mine`/`my` (`building-get-mine` ❌): "của tôi" là bộ lọc theo `user.id` trong handler, không phải tên use case. Ngoại lệ duy nhất: tài nguyên chính là người gọi (`user-get-me`, `user-update-me`).
- Command: động từ nghiệp vụ, không chỉ CRUD: `room-mark-ready`, `rate-policy-deactivate`, `building-approve`, `password-reset-request`.

## 2. Presentation

| Loại | File | Class |
|---|---|---|
| Request body | `requests/rate-policy-create.request.dto.ts` | `RatePolicyCreateRequestDto` |
| Request query danh sách | `requests/rate-policy-list.request.dto.ts` | `RatePolicyListRequestDto` |
| Bộ lọc của danh sách | `requests/rate-policy-list-filter.request.dto.ts` | `RatePolicyListFilterRequestDto` |
| DTO lồng (phần tử mảng) | `requests/rate-item.request.dto.ts` | `RateItemRequestDto` |
| Response chính | `responses/rate-policy.response.dto.ts` | `RatePolicyResponseDto` |
| Response theo góc nhìn | `responses/contract-list-item.response.dto.ts`, `contract-detail.response.dto.ts` | `ContractListItemResponseDto` |
| Response code | `constants/rate-policy-response-code.constant.ts` | `RatePolicyResponseCodeConstant` (class `static readonly` hoặc object `as const` — cả hai đều được) |
| Controller | `controllers/rate-policy.controller.ts` (theo tài nguyên gốc của route) | `RatePolicyController` |
| Controller nội bộ | `controllers/user-internal.controller.ts` | `UserInternalController` |
| Subscriber | `messaging/sample.subscriber.ts`, `sample-consumer.constants.ts` | `SampleSubscriber` |

- Request DTO đặt tên **trùng use case** nó map tới (`rate-policy-create` → `RatePolicyCreateCommand`). Hậu tố file luôn `.request.dto.ts`, class luôn `…RequestDto`; không còn `create-x.request.ts`, `XRequest`, `.query.request.dto.ts`.
- Response: noun trước, góc nhìn sau (`building-detail-admin.response.dto.ts`, không `admin-building-detail`).
- Tên schema Swagger lấy từ tên class → đổi tên class là đổi contract, phải khớp `api-docs`.

## 3. Domain & infrastructure

| Loại | File | Class / interface |
|---|---|---|
| Aggregate / entity | `domain/entities/rate-policy.entity.ts` | `RatePolicyEntity` |
| Props | `domain/entities/rate-policy.props.ts` | `RatePolicyProps`, `CreateRatePolicyProps` |
| Value object | `domain/value-objects/reading-period.vo.ts` | `ReadingPeriod` |
| Enum | `domain/enums/rate-policy-scope.enum.ts` | `RatePolicyScope` (giá trị `UPPER_SNAKE` → chuỗi theo api-docs) |
| Domain event | `domain/events/rate-policy-created.event.ts` | `RatePolicyCreatedEvent` |
| Hằng event | `domain/constants/rate-policy-event.constants.ts` | `RATE_POLICY_EVENTS.CREATED = 'rate_policy.created'` (`<noun_snake>.<past_verb>`) |
| Domain exception | `domain/exceptions/rate-policy-not-found.exception.ts` | `RatePolicyNotFoundException` |
| Repository (port) | `domain/repositories/rate-policy.repository.ts` | `RatePolicyRepository` (không tiền tố `I`, không `.interface.ts`) |
| TypeORM entity | `infrastructure/persistence/rate-policy.typeorm-entity.ts` | `RatePolicyTypeormEntity`, `@Entity('rate_policies')` |
| Repository adapter | `infrastructure/persistence/rate-policy.repository.ts` | `TypeOrmRatePolicyRepository` |
| Mapper | `infrastructure/persistence/mappers/rate-policy.mapper.ts` | `RatePolicyMapper` (`toDomain`, `toPersistence`) |
| Adapter service | `infrastructure/services/tenancy-user-stats.service.ts` | `TenancyUserStatsService` |
| DI token | `rate-policy.di-token.ts` | `RATE_POLICY_DI_TOKEN = { REPOSITORY, PAGE_QUERY }` |
| Seeder | `infrastructure/seeds/sample-create.seeder.ts` | `SampleCreateSeeder` |
| Migration | sinh bởi TypeORM: `<timestamp>-CreateRatePoliciesTable.ts` | `CreateRatePoliciesTable<timestamp>` |

- TypeORM entity **bắt buộc** hậu tố file `.typeorm-entity.ts` trong `infrastructure/persistence/` — `shared/infrastructure/database/typeorm-base-options.ts` chỉ nạp file khớp mẫu đó.
- Tên bảng/cột: `snake_case` số nhiều (`SnakeNamingStrategy` tự đổi field camelCase).
- Domain exception: `<subject>-<reason>`, chủ thể đứng đầu: `rate-policy-not-found`, `tier-config-invalid`, `media-type-not-allowed`, `user-lock-cannot-self`. Không bắt đầu bằng `invalid-`, `duplicate-`. Mỗi exception một file.
- Interface port của application: `<Tên>Port` (`RatePolicyPageQueryPort`); port hạ tầng có sẵn trong `shared` giữ tên cũ (`IUnitOfWork`, `IInternalHttpClient`).

## 4. Mã trả về

- Response code thành công: `UPPER_SNAKE`, dạng `<NOUN>_<PAST_VERB>` — `RATE_POLICY_CREATED`, `RATE_POLICIES_FETCHED` (danh sách dùng số nhiều), `SAMPLE_DELETED`. Phải trùng mã trong `api-docs`.
- Mã lỗi (`code` của exception): lấy đúng từ `api-docs` (`TIER_CONFIG_INVALID`, `CONTRACT_NOT_DRAFT`). Không tự đặt mã mới khi api-docs chưa có — cập nhật api-docs trước.
- `operationId`: lấy đúng từ `api-docs` (`postRatePolicies`, `getRatePolicies`).

## 5. Khi tên cũ không đúng quy tắc

Code đã merge có tên lệch (vd. `building-get-mine`, `create-building.request.ts`, `user.ts`/`IUserRepository` ở Identity). **Không** đổi tên trong PR tính năng không liên quan; tạo issue refactor riêng. Code **mới** luôn theo bảng trên.
