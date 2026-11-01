---
name: be-feature-workflow
description: Step-by-step workflow for implementing a backend feature in a Rentify NestJS service — from the pm issue and the api-docs contract, through domain, application, infrastructure (with a generated TypeORM migration) and presentation, to Swagger, the api-docs sequence diagram and x-apidog-status, manual verification against Apidog, and the pull request. Use when starting a pm/phase-N issue that touches a backend repo, when adding an endpoint or use case, or when asked to "implement" something in boilerplate, Identity-Service, Tenancy-Service or another service.
license: Apache-2.0
metadata:
  version: "1.0.0"
  category: workflow
  author: Rentify BE
---

# Quy trình làm một feature — Rentify Backend

Skill này là thứ tự làm việc. Quy tắc chi tiết ở skill khác:

- Đặt file ở đâu: `be-structure` · Đặt tên: `be-naming` · Viết code: `be-code-style`
- Controller, DTO, Swagger, phân trang: `be-api-presentation` · Gọi/ghi sang service khác: `be-cross-service`

## Bước 0 — Hiểu việc và nguồn sự thật

1. Đọc issue `pm/phase-N/issues/<ID>-*.md`: mục tiêu, contract, "Quyết định áp dụng", acceptance criteria, ngoài phạm vi.
2. Khi các nguồn mâu thuẫn, ưu tiên (**D60**): `pm/phase-N/decisions.md` (D-ID mới nhất) > `api-docs` > skill trong `.agents/skills/` > nội dung issue. Gặp mâu thuẫn → comment vào issue, làm theo nguồn cao hơn, **không tự chế phương án thứ ba**. Câu hỏi nghiệp vụ chưa có D-ID → hỏi PM/BE lead trước khi code.
3. Phạm vi theo `pm/requirement.md`; không thêm endpoint/field ngoài issue.
4. Tìm module đã merge giống nhất để bắt chước (CRUD có phân trang → `Tenancy-Service/src/modules/rate-policy`; có subscriber → `boilerplate/src/modules/sample`).

## Bước 1 — Nhánh

```bash
git switch main && git pull --ff-only          # boilerplate dùng master
git switch -c feature/<id>-<slug>              # vd feature/p6-02c-rate-policy-api
```

Tiền tố khác: `fix/`, `hotfix/`, `docs/`, `ci/`. Không push thẳng `main`/`develop`.

## Bước 2 — Contract trong api-docs (trước khi code)

1. Mở `api-docs/src/paths/<domain>/*.yaml`: path, `operationId`, request/response schema, mã `code` thành công và lỗi.
2. Contract thiếu/sai → sửa `api-docs/src/` trước (PR riêng ở repo `api-docs` hoặc cùng đợt), `npm run lint && npm run bundle` trong `api-docs`. Không code theo phỏng đoán.
3. Ghi lại các mã lỗi riêng cần exception (vd. `TIER_CONFIG_INVALID`, `ACTIVE_POLICY_EXISTS`).

## Bước 3 — Domain

1. Enum, value object (bất biến của một giá trị), entity/aggregate (`create`, `reconstitute`, method nghiệp vụ, `addDomainEvent`).
2. Domain exception, mỗi mã lỗi một file, `code` khớp api-docs.
3. Domain event + `<noun>-event.constants.ts` nếu service khác cần biết.
4. Repository interface `extends BaseRepository<XEntity>` + method cho luồng ghi (`findByIdForUpdate`).
5. Chạy 3 lệnh grep dependency rule (skill `be-structure` §1).

## Bước 4 — Infrastructure + migration

1. `<noun>.typeorm-entity.ts` (`extends AbstractEntity`, `@Entity('<bảng_snake_số_nhiều>')`), mapper `toDomain`/`toPersistence`, `TypeOrm<Noun>Repository implements <Noun>Repository` (+ port đọc danh sách nếu có).
2. **Sinh migration bằng lệnh, không viết tay, không để AI viết:**
   ```bash
   npm run migration:generate -- src/database/migrations/<PascalName>   # vd CreateRatePoliciesTable
   ```
   (Tên/đường dẫn là tham số vị trí của TypeORM CLI.)
3. Mở file sinh ra, **xoá các dòng không thuộc issue** (thay đổi lệch schema của module khác) ở cả `up` và `down`; không sửa phần còn lại. Constraint/index cần tên ổn định (vd. unique `UQ_rate_policies_building` để bắt lỗi trùng) thì đặt `name` trong decorator của TypeORM entity rồi generate lại.
4. Thử: `npm run migration:run` → `npm run migration:revert` → `npm run migration:run`.
5. Seed (nếu issue yêu cầu): `infrastructure/seeds/*.seeder.ts`, `npm run seed:run`.

## Bước 5 — Application

1. Thư mục `commands/<noun>-<verb>/`, `queries/<noun>-<verb>/` (skill `be-naming` §1).
2. Command handler: `unitOfWork.run` → đọc `ForUpdate` → kiểm tra sở hữu/tồn tại → gọi method domain → `save` → append outbox (skill `be-code-style` §6).
3. Query handler: get-by-id qua repository; danh sách qua port `PAGE_QUERY`.
4. Đăng ký handler, repository, port trong `<noun>.module.ts`; import `OutboxModule`/`InboxModule`/module khác khi cần; module mới thêm vào `app.module.ts`.

## Bước 6 — Presentation

1. Request DTO (validator + `static toCommand`), response DTO (`static fromDomain`), response code constant.
2. Controller: decorator auth, `ParseUUIDPipe`, `@ResponseCode`, `@HttpCode`, Swagger đủ (skill `be-api-presentation`).
3. `npm run start:dev`, mở Swagger `/api/v1/<PATH>/swagger`: so `operationId`, schema, status với api-docs.

## Bước 7 — Cập nhật api-docs

1. Sửa lệch giữa code và api-docs (nếu code đúng theo decision) trong `api-docs/src/`.
2. `description` của operation có sequence diagram mermaid mô tả luồng thật, gồm gọi nội bộ và event (mẫu `api-docs/src/paths/auth/jwks.yaml`, `buildings/admin-buildings.yaml`).
3. Endpoint đã chạy đúng trên service → đổi `x-apidog-status: designing` thành `released`.
4. `npm run lint && npm run bundle` trong `api-docs` (bắt buộc sau mọi sửa spec). Không sửa `reports/api-changelog.*`.

## Bước 8 — Kiểm tra

```bash
npm run build
npm run lint
npx prettier --check <các file đã sửa>
```

- Không viết `*.spec.ts`. Kiểm tra tay bằng Apidog (hoặc Swagger) với token thật của từng role:
  - luồng chính đúng status + `code` + `data` như api-docs;
  - mỗi mã lỗi riêng trong contract (404, 403 khác chủ, 409/422 nghiệp vụ, 422 validation);
  - danh sách: `pageNo`, `pageSize`, `filter[...]`, `sort` ngoài whitelist → 422;
  - có event: kiểm tra dòng `outbox_messages` cùng transaction và chuyển `PUBLISHED`.
- Ghi kết quả (ảnh/response) vào PR.

## Bước 9 — Tự review & PR

1. Chạy checklist cuối `be-code-style`. `git diff`: chỉ file của issue, không đụng `src/shared/`, không đổi line ending, không file rác.
2. Commit Conventional Commits, tiếng Anh: `feat(rate-policy): implement P6-02c HTTP API`.
3. PR vào `main`, mô tả tiếng Việt, ≥ 1 reviewer, squash merge:

```markdown
## Tóm tắt
<issue P6-xx, endpoint nào, cho role nào>

Closes pbl6-home-renter/docs#<số issue>

## Thay đổi chính
- Domain / Application / Infrastructure (migration: <tên file>) / Presentation
- api-docs: <file, x-apidog-status>

## Quyết định áp dụng
- D<nn>: …

## Kiểm thử tay (Apidog)
- [x] build / lint
- [x] <request → status + code>
```

4. Cập nhật trạng thái issue trong `pm/phase-N/issues/README.md` nếu bạn phụ trách.
