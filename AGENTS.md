# Rentify Backend — Hướng dẫn cho Agent & Developer

Quy chuẩn bắt buộc khi phát triển, refactor hoặc review code trong các service NestJS của Rentify (`boilerplate`, `Identity-Service`, `Tenancy-Service`, …): Clean Architecture + DDD + CQRS, TypeORM/PostgreSQL, RabbitMQ outbox/inbox.

File này chỉ giữ luật cốt lõi. Chi tiết nằm trong skill ở `.agents/skills/` — **đọc `SKILL.md` của skill tương ứng trước khi làm việc**. Nguồn gốc của các skill là repo `boilerplate`; sửa ở đó rồi copy sang service.

## Skill

| Skill | Đọc khi |
|---|---|
| [`be-feature-workflow`](.agents/skills/be-feature-workflow/SKILL.md) | Bắt đầu một issue / endpoint / use case — thứ tự từ api-docs tới PR |
| [`be-structure`](.agents/skills/be-structure/SKILL.md) | Tạo, chuyển file; thêm module; không rõ class thuộc tầng nào |
| [`be-naming`](.agents/skills/be-naming/SKILL.md) | Đặt tên file/class: command, query, DTO, entity, exception, event |
| [`be-code-style`](.agents/skills/be-code-style/SKILL.md) | Viết, refactor, review code `.ts`; validation đặt ở đâu; xử lý lỗi |
| [`be-api-presentation`](.agents/skills/be-api-presentation/SKILL.md) | Controller, request/response DTO, response code, Swagger, phân trang |
| [`be-cross-service`](.agents/skills/be-cross-service/SKILL.md) | Outbox/inbox, RabbitMQ, internal HTTP, `@InternalOnly`, xác thực JWT |

Tài liệu kỹ thuật (boilerplate): [`docs/architecture.md`](docs/architecture.md), [`docs/transactional-outbox-design.md`](docs/transactional-outbox-design.md). Module mẫu: `src/modules/sample`.

## Luật cốt lõi

1. **Nguồn sự thật (D60):** `pm/phase-N/decisions.md` > `api-docs` > skill này > issue. Mâu thuẫn thì comment vào issue và làm theo nguồn cao hơn.
2. **Tầng:** `domain` không import NestJS/TypeORM/tầng khác; layout `application/commands|queries/<noun>-<verb>/`, `infrastructure/persistence/`, `presentation/http|messaging/`.
3. **Đặt tên:** danh từ trước, động từ sau — `rate-policy-create.command.ts`, `rate-policy-list.query.ts`, `rate-policy-create.request.dto.ts` (`RatePolicyCreateRequestDto`), `rate-policy.typeorm-entity.ts`.
4. **Một class mỗi file**, named export, không `index.ts`.
5. **Controller mỏng:** body → `XRequestDto.toCommand(request, ...ctx)` (static); id route dùng `ParseUUIDPipe`; trả `XResponseDto.fromDomain`.
6. **Validation:** hình dạng ở request DTO (class-validator); bất biến nghiệp vụ ở value object/entity, ném domain exception có `code` theo api-docs; handler không kiểm tra lại.
7. **Ghi:** trong `unitOfWork.run` + append outbox cùng transaction. Đọc danh sách qua port `PAGE_QUERY`, không qua repository domain.
8. **Lỗi:** không `try/catch` chỉ để log/ném lại — filter toàn cục lo. Chỉ catch để đổi lỗi đã biết sang domain exception hoặc fallback dữ liệu hiển thị.
9. **Liên service:** ghi qua event (outbox → RabbitMQ → inbox); đọc qua internal HTTP `GET`; kiểu của peer khai báo lại; endpoint nội bộ `@InternalOnly()` dưới `internal/`.
10. **Migration** chỉ sinh bằng `npm run migration:generate -- src/database/migrations/<Name>`, xoá dòng không liên quan; không viết tay.
11. **Phạm vi:** không sửa `src/shared/` trong service (sửa ở boilerplate rồi copy); không đụng file ngoài issue; không viết `*.spec.ts`.
12. **Kiểm tra:** `npm run build`, `npm run lint` sạch; thử tay bằng Apidog; cập nhật `api-docs` (`x-apidog-status`, sequence diagram) và PR ghi `Closes pbl6-home-renter/docs#<n>`.
