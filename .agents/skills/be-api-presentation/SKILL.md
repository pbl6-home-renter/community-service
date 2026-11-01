---
name: be-api-presentation
description: HTTP presentation rules for Rentify NestJS backend services — thin controllers, request DTO validation and static toCommand mapping, ParseUUIDPipe, response DTOs with fromDomain, success response codes and the response/error envelope, Swagger decorators matching api-docs, auth decorators, and offset pagination (OffsetPaginationQueryRequestDto, filter deepObject, sort whitelist, PaginatedResponseDto). Use when creating or changing a controller, endpoint, request/response DTO, response code, or a paginated list API.
license: Apache-2.0
metadata:
  version: "1.0.0"
  category: conventions
  author: Rentify BE
---

# Controller, DTO, Swagger, phân trang — Rentify Backend

Contract là `api-docs/src/` (D60: `decisions.md` > `api-docs` > skill > issue). Path, field, `operationId`, mã `code`, status phải khớp api-docs. Mẫu đầy đủ: `Tenancy-Service/src/modules/rate-policy/presentation/http/` và `boilerplate/src/modules/sample/presentation/http/`.

> Ví dụ Tenancy dưới đây trích nguyên văn code đã merge nên còn tên class cũ (`CreateRatePolicyRequest`). Code mới đặt tên theo `be-naming` (`RatePolicyCreateRequestDto` trong `rate-policy-create.request.dto.ts`) như `boilerplate/.../requests/sample-create.request.dto.ts`.

## 1. Controller mỏng

Controller chỉ: lấy param/body/query/user → tạo command/query → `execute` → map sang response DTO.

```ts
// Tenancy-Service/src/modules/rate-policy/presentation/http/controllers/rate-policy.controller.ts
@Patch(':ratePolicyId')
@HttpCode(HttpStatus.OK)
@ResponseCode(Code.RATE_POLICY_UPDATED)
@ApiOperation({ operationId: 'patchRatePoliciesRatepolicyid', summary: 'Update rate policy' })
@ApiSuccessResponse({ code: Code.RATE_POLICY_UPDATED, dataDto: RatePolicyResponseDto })
async update(
  @Param('ratePolicyId', ParseUUIDPipe) id: Uuid,
  @CurrentUser() user: AuthenticatedUser,
  @Body() request: UpdateRatePolicyRequest,
): Promise<RatePolicyResponseDto> {
  const policy = await this.commands.execute<RatePolicyUpdateCommand, RatePolicyEntity>(
    UpdateRatePolicyRequest.toCommand(request, id, user.id),
  );
  return RatePolicyResponseDto.fromDomain(policy);
}
```

- **Có body → `static toCommand(request, ...ngữ cảnh)` trên request DTO.** Ngữ cảnh (id route, `user.id`) là tham số sau `request`. Controller **không** viết `new XCommand(request.a, request.b, …)` và không dùng `XCommand.create(input)` với DTO `implements Input`.
- Không có body (delete, action) → `new XCommand(user.id, id)` trực tiếp.
- Query danh sách → `new XListQuery(user.id, request)` (request DTO đã `implements OffsetPageQuery<Filter>`); chỉ thêm `static toQuery` khi phải biến đổi field.
- Không gọi repository, không `if` nghiệp vụ, không `try/catch` trong controller.
- Route param id: luôn `ParseUUIDPipe` + kiểu `Uuid`. Không `id as Uuid`.
- Người gọi: `@CurrentUser() user: AuthenticatedUser`. Không đọc header `x-user-*`.

## 2. Request DTO

```ts
// Tenancy-Service/src/modules/rate-policy/presentation/http/requests/create-rate-policy.request.dto.ts
@ApiProperty({ type: [RateItemRequest], minItems: 1 })
@IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => RateItemRequest)
rates: RateItemRequest[];

static toCommand(request: CreateRatePolicyRequest, landlordId: Uuid): RatePolicyCreateCommand {
  return new RatePolicyCreateCommand(landlordId, request.scope, request.buildingId,
    request.roomId, RateItemRequest.toDomain(request.rates));
}
```

- Mỗi field: decorator Swagger (`@ApiProperty`/`@ApiPropertyOptional`, có `enum`, `format: 'uuid'`, `pattern`, `example` khi hữu ích) + `class-validator`.
- UUID trong body/query: `@IsUuid()`; field bắt buộc kiểu null-check: `@IsRequired(code)` (`shared/presentation/validators`).
- Object lồng: `@ValidateNested` + `@Type(() => X)`; DTO lồng có `static toDomain` để tạo VO.
- `toCommand` là nơi tạo VO (`ReadingPeriod.create(request.period)` trong `create-meter-reading.request.dto.ts`).
- Đặt tên file/class: skill `be-naming` §2.

## 3. Response DTO

- `static fromDomain(entity)` (hoặc `fromReadModel(result)` cho read model) trả instance; field theo đúng schema api-docs. Mẫu `boilerplate/src/modules/sample/presentation/http/responses/sample.response.dto.ts`.
- Không trả password hash, token, field nội bộ không có trong api-docs. Không trả TypeORM entity.

## 4. Mã thành công & envelope

- Mỗi endpoint có `@ResponseCode(Code.X)` và `@HttpCode(...)`; mã khai báo trong `presentation/http/constants/<noun>-response-code.constant.ts`.
- Interceptor bọc kết quả: `{ statusCode, code, data }`; danh sách thêm `pagination`. Lỗi (filter toàn cục): `{ statusCode, code }`.

| Thao tác | Status |
|---|---|
| `POST` tạo mới | `201 CREATED` |
| `GET`, `PATCH`, `PUT`, `POST` hành động (`/deactivate-policy`, `/approve`) | `200 OK` |
| `DELETE` hoặc hành động không trả dữ liệu | `204 NO_CONTENT` (không có body) |

| Lỗi | Status | `code` |
|---|---|---|
| JSON hỏng / body sai kiểu | 400 | `INVALID_JSON`, `INVALID_REQUEST_BODY` |
| class-validator, field lạ | 422 | `VALIDATION_FAILED`, `UNEXPECTED_FIELD` |
| Chưa đăng nhập / sai role / không sở hữu | 401 / 403 | `UNAUTHORIZED` / `FORBIDDEN` hoặc mã riêng |
| Không tìm thấy | 404 | `<NOUN>_NOT_FOUND` |
| Xung đột trạng thái / trùng | 409 hoặc 422 | mã riêng theo api-docs |

## 5. Swagger

Mỗi endpoint có: `@ApiOperation({ operationId, summary })` với `operationId` **copy từ api-docs**; `@ApiSuccessResponse({ status, code, dataDto })` (`shared/presentation/decorators/api-success-response.decorator.ts`); `@ApiResponse` cho từng lỗi nghiệp vụ trong api-docs. Controller có `@ApiTags`, `@ApiBearerAuth()` (trừ toàn bộ `@Public`). Controller nội bộ dùng `@ApiExcludeController()`.

## 6. Auth decorator

| Decorator | Dùng khi |
|---|---|
| (mặc định) | Mọi route cần access token hợp lệ (guard toàn cục `JwtAuthGuard`) |
| `@Roles(UserRole.LANDLORD, …)` | Giới hạn role — đặt ở class nếu cả controller cùng role |
| `@Public()` | Không cần token (tra cứu công khai) |
| `@AllowLocked(...roles)` | Tài khoản bị khoá vẫn được gọi |
| `@InternalOnly()` | Service-to-service, controller mount dưới `internal/…` (skill `be-cross-service`) |

Kiểm tra sở hữu (`building.landlordId !== command.landlordId`) nằm trong handler, ném exception riêng (`BuildingNotOwnedException`).

## 7. Phân trang offset

Request kế thừa `OffsetPaginationQueryRequestDto<Filter>` (`pageNo` ≥ 1 mặc định 1, `pageSize` 1–100 mặc định 20, `sort`, `order`, `filter`). Bộ lọc gửi dạng deepObject `filter[status]=…`.

```ts
// Tenancy-Service/src/modules/rate-policy/presentation/http/requests/rate-policy-list.request.dto.ts
@ApiPropertyOptional({ type: RatePolicyListFilterRequest })
@IsOptional() @IsObject() @ValidateNested() @Type(() => RatePolicyListFilterRequest)
override filter?: RatePolicyListFilterRequest = undefined;

@ApiPropertyOptional({ enum: ['createdAt'], default: 'createdAt' })
@IsOptional() @IsIn(['createdAt'])
override sort?: string = undefined;
```

- Filter là class riêng (file riêng) có validator cho từng field. Chỉ override `sort` (whitelist) và `filter`; không đổi giới hạn `pageNo`/`pageSize`.
- Endpoint mà api-docs đã chốt query phẳng (vd. `GET /users` của Identity: `role`, `status`, `q`) thì giữ theo api-docs.
- Handler gọi port `findPage(...)`; adapter dùng `TypeOrmPaginator.offset(qb, …).withSort({ whitelist, defaultSort, defaultOrder, alias }).paginate(Mapper.toDomain)` (`rate-policy.repository.ts`).
- Controller trả `PaginatedResponseDto.create({ data: result.data.map(XResponseDto.fromDomain), pagination: result.pagination })`.
