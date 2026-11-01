---
name: be-cross-service
description: Rules for anything that crosses a service boundary in Rentify backends — database per service, writes via transactional outbox and RabbitMQ integration events, consumers with inbox dedup, synchronous reads via the internal HTTP client (GET only, peer types redeclared locally), @InternalOnly routes under internal/, and JWT verification via JWKS in every service. Use when a feature needs data or side effects in another service, when adding a domain event, subscriber or internal endpoint, or when touching auth guards.
license: Apache-2.0
metadata:
  version: "1.0.0"
  category: architecture
  author: Rentify BE
---

# Giao tiếp giữa các service — Rentify Backend

Tài liệu gốc: [`docs/transactional-outbox-design.md`](../../../docs/transactional-outbox-design.md) (boilerplate). Mỗi service có database riêng (PostgreSQL/Supabase): **không** đọc/ghi bảng của service khác, không join chéo DB.

| Cần | Cách duy nhất |
|---|---|
| Service khác phải phản ứng khi dữ liệu của mình đổi (ghi chéo) | Domain event → outbox → RabbitMQ → subscriber + inbox ở service kia |
| Đọc dữ liệu của service khác ngay lúc xử lý | Internal HTTP client, chỉ `GET` |
| Service khác cần đọc dữ liệu của mình | Endpoint `@InternalOnly()` dưới `internal/…` |

## 1. Ghi chéo: outbox → RabbitMQ

1. **Domain event** trong `domain/events/<noun>-<past>.event.ts`, `implements DomainEvent`, có `eventType`, `routingKey` (từ `domain/constants/<noun>-event.constants.ts`, dạng `rate_policy.created`), `aggregateType`, `aggregateId`, `payload`. Mẫu `boilerplate/src/modules/sample/domain/events/sample-created.event.ts`.
2. Aggregate gọi `this.addDomainEvent(...)` trong `create()`/method nghiệp vụ.
3. Command handler, **trong cùng `unitOfWork.run`**: `save(aggregate, context)` rồi `outboxRepository.append(aggregate.pullDomainEvents().map(OutboxMessage.fromDomainEvent), context)`. Module import `OutboxModule`.
4. Relay của outbox tự publish lên topic exchange; at-least-once, thứ tự chỉ đảm bảo theo aggregate.

Cấm: gọi RabbitMQ publisher trực tiếp từ handler; `EventBus.publish()` để thay outbox; ghi outbox ngoài transaction của aggregate.

Payload là contract công khai: chỉ thêm field (không đổi/xoá); đổi ý nghĩa thì tạo `eventType` mới. Ghi lại event mới vào tài liệu contract/topology.

## 2. Nhận event: subscriber + inbox

Mẫu `boilerplate/src/modules/sample/presentation/messaging/sample.subscriber.ts`:

```ts
@RabbitSubscribe({
  name: ConsumerRegistry.define({
    name: SAMPLE_CONSUMER_NAME,            // sample-consumer.constants.ts
    queue: SAMPLE_CONSUMER_QUEUE,
    routingKeys: [SAMPLE_EVENTS.CREATED, SAMPLE_EVENTS.DELETED],
  }),
})
async handle(event: IntegrationEvent): Promise<void> {
  await this.handleOnce(event, async (context) => { /* switch (event.eventType) */ });
}
```

- `handleOnce`: `unitOfWork.run` → `inboxRepository.recordIfNew(event.id, event.eventType, context)`; `false` thì bỏ qua (đã xử lý). Side effect dùng cùng `context`. Module import `InboxModule`.
- Lỗi thì **ném ra**: transaction rollback, message vào retry queue rồi DLQ. Không `catch` nuốt lỗi, không requeue tay.
- Một queue cho mỗi consumer; khai đủ `routingKeys`. Publisher bật `mandatory`, nên routing key chưa có queue nào bind sẽ làm outbox `FAILED` và chặn các event sau của aggregate — thêm consumer trước khi bật event.
- Kiểu payload của event từ service khác **khai báo lại** trong service nhận; không import code của service khác.
- Retry message `FAILED`: `npm run outbox:requeue -- <message-id>`.

## 3. Đọc chéo: internal HTTP client

```ts
// Tenancy-Service/src/modules/building/infrastructure/services/internal-user.service.ts
return await this.client.get<InternalUserSummary[]>(
  PeerService.IDENTITY, INTERNAL_ROUTES.IDENTITY.USERS,
  { query: { ids: [...new Set(ids)].join(',') } },
);
```

- Inject `@Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT) client: IInternalHttpClient` (`shared/application/ports/internal-http-client.port.ts`). Chỉ có `get`; **không** thêm POST/PUT — ghi đi qua event.
- Gọi thẳng service qua mạng nội bộ (`*_SERVICE_URL`), không qua gateway. Mặc định gửi `X-Service-Token`; khi gọi thay mặt người dùng thì truyền `bearerToken`.
- Kiểu response của peer **khai báo lại** trong service mình (chỉ field cần dùng). Không import DTO/entity từ repo khác, không copy package.
- Đặt sau một port: interface trong `application/ports/` (vd. `Identity-Service/src/modules/users/application/ports/tenancy-user-stats.port.ts`), implement trong `infrastructure/services/` (`tenancy-user-stats.service.ts`), đăng ký bằng DI token. Handler chỉ biết port.
- Không retry. Lỗi là `PeerServiceUnavailableException` (503) hoặc `PeerServiceRequestException` (giữ status/code của peer). Chọn rõ:
  - dữ liệu **hiển thị** → fallback (bỏ field, trả rỗng) và `logger.warn`;
  - dữ liệu dùng để **quyết định** (quyền, trạng thái, tiền) → để lỗi đi lên (fail closed).
- Path nội bộ gom vào một file hằng (`building/infrastructure/constants/internal-routes.constant.ts`).

## 4. Cung cấp endpoint nội bộ

```ts
// Identity-Service/src/modules/users/presentation/http/controllers/user-internal.controller.ts
@ApiExcludeController()
@InternalOnly()
@Controller('internal/users')
export class UserInternalController { … }
```

- Prefix `internal/` nằm ngoài `api/v1` (`main.ts` exclude), gateway không route được. Xác thực bằng `X-Service-Token` (`ServiceTokenGuard`).
- Chỉ `GET`, trả envelope chuẩn; controller riêng `<noun>-internal.controller.ts`, query riêng `<noun>-lookup-internal`/`<noun>-get-by-id-internal`.
- Endpoint nội bộ không có path riêng trong api-docs; lời gọi được mô tả trong `description` và sequence diagram của endpoint công khai dùng nó (vd. `api-docs/src/paths/buildings/admin-buildings.yaml`: `TEN->>ID: GET /internal/users?ids=… (X-Service-Token)`, kèm hành vi khi peer unavailable).

## 5. Xác thực giữa các service

- Identity ký JWT RS256 và công bố JWKS. **Mọi service tự verify** access token qua JWKS cache (`shared/infrastructure/security/access-token-verifier.service.ts`); không tin header `x-user-*` do gateway gắn.
- Guard toàn cục theo thứ tự: `ServiceTokenGuard` → `JwtAuthGuard` → `RolesGuard` → `ActiveUserGuard` (`shared/security.module.ts`). Không thêm guard riêng cho từng route khi decorator đã đủ.
- Service không bật CORS (gateway làm). Cổng 3000–3004 và 5672 không mở public.
