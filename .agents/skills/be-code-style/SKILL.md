---
name: be-code-style
description: Code style for Rentify NestJS backend services — formatting, one class per file, named exports, entity and value-object style, where each kind of validation lives, domain exceptions, command handler shape (unit of work + outbox), error handling without try/catch noise, no test files, and staying inside the issue scope. Use whenever writing, refactoring or reviewing .ts code in a backend repo (boilerplate, Identity-Service, Tenancy-Service, …).
license: Apache-2.0
metadata:
  version: "1.0.0"
  category: conventions
  author: Rentify BE
---

# Code style — Rentify Backend

Mục tiêu: mở file nào cũng thấy cùng một kiểu viết. Quy tắc chưa nói tới → **bắt chước file cùng loại gần nhất** trong `boilerplate/src/modules/sample` hoặc `Tenancy-Service/src/modules/rate-policy`.

## 1. Định dạng & file

- Prettier (`singleQuote`, `trailingComma: all`, 2 dấu cách) và `oxlint`. Chạy `npm run lint` và `npx prettier --check <file đã sửa>` trước khi đẩy. Không tranh luận format trong review — công cụ quyết định.
- **Một class mỗi file**: exception, VO, entity, command, query, handler, request DTO, response DTO, mapper. Filter của list request cũng tách file riêng (`rate-policy-list-filter.request.dto.ts`). Interface/type nhỏ gắn chặt với class (props, filter của port) được ở chung file.
- **Named export**, không `export default`, không barrel `index.ts`.
- Thứ tự import gợi ý: thư viện ngoài → `shared/…` → `modules/…` → tương đối. Không chặn PR vì thứ tự import.
- Không `console.log`; cần log thì `private readonly logger = new Logger(X.name)`.
- Comment giải thích **vì sao**, không kể lại code. Tham chiếu quyết định bằng D-ID (`// D39 keeps one policy per scope…` trong `Tenancy-Service/src/modules/rate-policy/infrastructure/persistence/rate-policy.repository.ts`).

## 2. TypeScript

- Không `any`. ID dùng `Uuid` (`shared/domain/value-objects/uuid.vo`), không `string`.
- Command/query là class `readonly` thuần, constructor nhận đủ tham số — mẫu `boilerplate/src/modules/sample/application/commands/sample-create/sample-create.command.ts`.
- Gõ kiểu cho bus: `this.commands.execute<RatePolicyCreateCommand, RatePolicyEntity>(…)`.

## 3. Entity & value object

Theo `boilerplate/src/modules/sample/domain/entities/sample.entity.ts` và `Tenancy-Service/src/modules/rate-policy/domain/entities/rate-policy.entity.ts`:

- Constructor `private`; tạo mới bằng `static create(props)` (sinh id, phát domain event), nạp từ DB bằng `static reconstitute(props)` (không phát event).
- Field **không đổi** sau khi tạo → `readonly` trên tham số constructor (`readonly landlordId: Uuid`).
- Field **đổi được** → `private _x` + getter `get x()`; chỉ đổi qua method nghiệp vụ (`deactivate()`, `replaceRates()`), không setter công khai.
- Getter trả mảng thì trả bản sao (`return [...this._rates]`).
- Value object: constructor `private`, `static create(raw)` kiểm tra rồi trả instance bất biến, có `equals()`. Mẫu `Identity-Service/src/modules/users/domain/value-objects/phone.vo.ts`.

## 4. Kiểm tra dữ liệu — ai kiểm tra gì

| Loại kiểm tra | Đặt ở | Ví dụ |
|---|---|---|
| Hình dạng body/query: bắt buộc, kiểu, enum, độ dài, uuid, pattern | Request DTO, `class-validator` (+ `@IsUuid()`, `@IsRequired()` của shared) | `Tenancy-Service/.../meter-reading/presentation/http/requests/create-meter-reading.request.dto.ts` |
| Route param uuid | Controller: `@Param('ratePolicyId', ParseUUIDPipe) id: Uuid` | `rate-policy.controller.ts` |
| Bất biến nghiệp vụ của một giá trị (kỳ `YYYY-MM`, chỉ số công tơ, giá, toạ độ, SĐT) | Value object `create()` | `meter-reading/domain/value-objects/reading-period.vo.ts` |
| Bất biến giữa nhiều field / trạng thái (chuyển trạng thái, cấu hình bậc) | Method của entity | `RatePolicyEntity.deactivate()` |
| Cần đọc DB (tồn tại, quyền sở hữu, trùng) | Command handler | `rate-policy-create.command.handler.ts` |

- VO/entity ném **domain exception riêng** mang đúng `code` trong api-docs (`InvalidPhoneException` → `PHONE_INVALID_FORMAT`, `TierConfigInvalidException` → `TIER_CONFIG_INVALID`). `ValidationException` (422 `VALIDATION_FAILED`) chỉ dùng khi api-docs không định nghĩa mã riêng cho trường hợp đó.
- VO được tạo **một lần** ở biên (trong `toCommand` hoặc `Entity.create`); command mang VO. Handler **không** kiểm tra lại điều DTO/VO/entity đã kiểm tra.
- Request DTO được tái dùng `PATTERN` của VO cho Swagger (`@Matches(ReadingPeriod.PATTERN)`) — một nguồn sự thật.
- Kiểm tra quyền sở hữu tài nguyên nằm trong handler, không trong guard.

## 5. Domain exception

```ts
// Tenancy-Service/src/modules/rate-policy/domain/exceptions/tier-config-invalid.exception.ts
export class TierConfigInvalidException extends DomainException {
  constructor(message = 'Invalid tier configuration') {
    super(message, 422, 'TIER_CONFIG_INVALID');
  }
}
```

- Kế thừa `DomainException` (`shared/domain/exceptions/domain.exception.ts`): `(message, statusCode, code)`. Không ném `HttpException`/`BadRequestException` từ domain/application.
- Một exception một file; `code` khớp api-docs; `message` tiếng Anh cho log (client chỉ nhận `{ statusCode, code }`).

## 6. Command handler

Mẫu `boilerplate/src/modules/sample/application/commands/sample-create/sample-create.command.handler.ts`:

```ts
return this.unitOfWork.run(async (context) => {
  const sample = SampleEntity.create({ title: command.title, description: command.description });
  await this.sampleRepository.save(sample, context);
  await this.outboxRepository.append(
    sample.pullDomainEvents().map((event) => OutboxMessage.fromDomainEvent(event)),
    context,
  );
  return sample;
});
```

- Mọi ghi trong một `unitOfWork.run`; truyền `context` cho **mọi** repository. Đọc để sửa dùng `findByIdForUpdate(id, context)` (khoá `pessimistic_write`).
- Aggregate có phát event → append outbox trong cùng transaction (xem `be-cross-service`). Không `EventBus.publish` thay outbox.
- Handler trả entity/`PaginatedResult`; controller map sang response DTO.
- Handler không đọc `ApiConfigService` trực tiếp; cấu hình đi qua DI token của module.

## 7. Xử lý lỗi

- Filter toàn cục (`shared/presentation/http/filters/error-handling-exception.filter.ts`) đã log và trả `{ statusCode, code }`. **Không** `try/catch` chỉ để log rồi ném lại, hay để đổi sang `InternalServerErrorException`.
- `try/catch` chỉ được dùng khi:
  1. Đổi một lỗi **đã biết** sang domain exception, đặt trong **repository adapter** (infrastructure) — vd. unique violation (`PostgresErrorCode.UNIQUE_VIOLATION` + constraint) → `PhoneAlreadyExistsException` trong `Identity-Service/src/modules/users/infrastructure/persistence/user.repository.ts`; còn lại `throw error`. Handler không import `typeorm`/`shared/infrastructure` để bắt lỗi DB.
  2. Fallback có chủ đích khi gọi service khác chỉ để lấy dữ liệu hiển thị (`Tenancy-Service/src/modules/building/infrastructure/services/internal-user.service.ts`).

## 8. Phạm vi thay đổi

- Không viết test (`*.spec.ts`, `*.e2e-spec.ts`); repo backend không có test runner. Kiểm tra bằng `build`, `lint`, gọi API thật (skill `be-feature-workflow`).
- Không sửa `src/shared/` trong service (skill `be-structure` §4).
- Chỉ sửa file thuộc issue. Không "tiện tay" sửa/format file khác (vd. `shared/infrastructure/database/pagination/typeorm.paginator.ts`), không đổi tên code cũ, không đổi line ending. Phát hiện lỗi ngoài phạm vi → ghi vào PR/issue mới.
- Migration chỉ sinh bằng lệnh, không viết tay/AI viết (skill `be-feature-workflow` bước 4).

## Checklist trước khi đẩy

- [ ] `npm run build` và `npm run lint` sạch; 3 lệnh grep dependency rule (skill `be-structure`) không in gì.
- [ ] Một class mỗi file, named export, tên theo `be-naming`.
- [ ] Validation đúng chỗ (bảng §4); handler không kiểm tra lại.
- [ ] Mọi ghi trong `unitOfWork.run` + outbox; không `try/catch` thừa.
- [ ] `git diff` chỉ chứa file của issue; không có `*.spec.ts`, không đụng `src/shared/`.
