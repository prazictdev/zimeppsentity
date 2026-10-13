# Frontend API Implementation Notes

This document describes the backend API endpoints, request/response formats, and implementation details for frontend developers.

---

## Base URL & Auth

- **Base URL:** `/api` (e.g. `https://your-domain.com/api`)
- **Authentication:** Laravel Sanctum. Send a Bearer token in the `Authorization` header for protected endpoints:
  ```http
  Authorization: Bearer {token}
  ```
- **Headers:** Use `Accept: application/json` and `Content-Type: application/json` for JSON requests and responses.

---

## Common Conventions

### Pagination (list endpoints)

List endpoints that support pagination accept:

| Query param | Type   | Default | Description        |
|------------|--------|---------|--------------------|
| `page`     | number | 1       | Page number        |
| `perPage`  | number | 10      | Items per page     |
| `search`   | string | —       | Optional search    |

Responses follow Laravel’s paginator shape, e.g.:

```json
{
  "current_page": 1,
  "data": [...],
  "first_page_url": "...",
  "from": 1,
  "last_page": 5,
  "last_page_url": "...",
  "links": [...],
  "next_page_url": "...",
  "path": "...",
  "per_page": 10,
  "prev_page_url": null,
  "to": 10,
  "total": 50
}
```

### Validation errors (422)

Validation errors are returned as:

```json
{
  "error": {
    "field_name": ["Validation message 1", "Validation message 2"]
  }
}
```

### Success payloads

- **Create:** Often `201` with body like `{ "message": "...", "status": "success", "data": { ... } }`.
- **Update/Delete:** Often `200` with similar `message`, `status`, and optional `data`.
- **Single resource (show):** Direct resource object or wrapped in `data` depending on endpoint.

---

## Endpoints Reference

### Auth / User

| Method | Path   | Description        | Auth   |
|--------|--------|--------------------|--------|
| GET    | `/api/me` | Current user       | Required |

**GET /api/me**  
Returns the authenticated user. Use after login to get profile.

---

### Modules (System Modules)

| Method | Path                          | Description           |
|--------|-------------------------------|------------------------|
| GET    | `/api/systemmodules`          | List modules (paginated) |
| POST   | `/api/systemmodules`          | Create module         |
| GET    | `/api/systemmodules/{id}`     | Get one module        |
| PUT    | `/api/systemmodules/{id}`     | Update module         |
| DELETE | `/api/systemmodules/{id}`     | Delete module         |

**Query (GET list):** `search`, `perPage`, `page`

**Body (POST/PUT):**

```json
{
  "name": "string (required, max 255)",
  "icon": "string (required, max 255)",
  "description": "string (nullable, max 255)",
  "status": "string (required, max 255)",
  "default_permission": "string (required, max 255)"
}
```

---

### Submodules (System Submodules)

| Method | Path                                      | Description                |
|--------|-------------------------------------------|----------------------------|
| GET    | `/api/systemsubmodules`                   | List submodules            |
| GET    | `/api/systemsubmodules/{id}/permissions`  | Permissions for submodule   |
| POST   | `/api/systemsubmodules`                   | Create submodule           |
| GET    | `/api/systemsubmodules/{id}`              | Get one submodule          |
| PUT    | `/api/systemsubmodules/{id}`              | Update submodule           |
| DELETE | `/api/systemsubmodules/{id}`              | Delete submodule           |

**Query (GET list):** `module_id` (required) — returns submodules for that module.

**Body (POST/PUT):**

```json
{
  "name": "string (required, max 255)",
  "module_id": "integer (required, exists:modules,id)",
  "url": "string (required, max 255)",
  "icon": "string (required, max 255)",
  "description": "string (nullable, max 255)",
  "status": "string (required, max 255)",
  "default_permission": "string (required, max 255)"
}
```

**GET /api/systemsubmodules/{id}/permissions**  
Returns array of permissions for the submodule. If default permissions do not exist, the backend may auto-create them; response is the list of permission objects.

---

### Permissions (System Permissions)

| Method | Path                                                    | Description                    |
|--------|---------------------------------------------------------|--------------------------------|
| GET    | `/api/systempermissions`                                | List permissions               |
| GET    | `/api/systempermissions/{accounttype_id}/assignedpermissions` | Assigned permissions by account type (and optional role) |
| POST   | `/api/systempermissions`                                | Create permission              |
| GET    | `/api/systempermissions/{id}`                           | Get one permission             |
| PUT    | `/api/systempermissions/{id}`                           | Update permission              |
| DELETE | `/api/systempermissions/{id}`                           | Delete permission              |

**Query (GET list):** `submodule_id` (required) — returns permissions for that submodule.

**Body (POST/PUT):**

```json
{
  "name": "string (required, max 255)",
  "guard_name": "string (required, max 255)",
  "submodule_id": "integer (required, exists:submodules,id)"
}
```

**GET /api/systempermissions/{accounttype_id}/assignedpermissions**  
Returns a nested structure: modules → submodules → permissions, with an `assigned` flag per permission for the given account type. Optional `role_id` may be supported via query string depending on backend.

---

### Roles (System Roles)

| Method | Path                                              | Description                |
|--------|---------------------------------------------------|----------------------------|
| GET    | `/api/systemroles`                                | List roles (paginated)     |
| POST   | `/api/systemroles`                                | Create role                |
| GET    | `/api/systemroles/{id}`                           | Get one role               |
| PUT    | `/api/systemroles/{id}`                           | Update role                |
| DELETE | `/api/systemroles/{id}`                           | Delete role                |
| GET    | `/api/systemroles/{id}/assigned-permissions`      | Permissions assigned to role |
| POST   | `/api/systemroles/{id}/assign-permissions`        | Assign permissions to role  |
| GET    | `/api/systemroles/{accounttype_id}/unassignedroles` | Roles not assigned to account type |

**Query (GET list):** `search`, `perPage`, `page`

**Body (POST/PUT role):**

```json
{
  "name": "string (required, max 255)",
  "guard_name": "string (required, max 255)"
}
```

**POST /api/systemroles/{id}/assign-permissions**  
Body:

```json
{
  "permissions": [1, 2, 3]
}
```

`permissions`: array of permission IDs to assign (replaces or merges depending on backend; confirm behavior in testing).

**GET /api/systemroles/{id}/assigned-permissions**  
Returns the list of permissions currently assigned to the role.

---

### Account Types (System Account Types)

| Method | Path                                                                 | Description                    |
|--------|----------------------------------------------------------------------|--------------------------------|
| GET    | `/api/systemaccounttypes`                                           | List account types (paginated) |
| POST   | `/api/systemaccounttypes`                                           | Create account type           |
| GET    | `/api/systemaccounttypes/{id}`                                      | Get one account type          |
| PUT    | `/api/systemaccounttypes/{id}`                                      | Update account type           |
| DELETE | `/api/systemaccounttypes/{id}`                                      | Delete account type           |
| GET    | `/api/systemaccounttypes/{id}/unassignedmodules`                     | Modules not assigned to type  |
| POST   | `/api/systemaccounttypes/{id}/assignmodules`                        | Assign modules                |
| POST   | `/api/systemaccounttypes/{id}/assignroles`                          | Assign roles                  |
| GET    | `/api/systemaccounttypes/{id}/assignedpermissions/{role_id?}`        | Assigned permissions (optional by role) |
| POST   | `/api/systemaccounttypes/{id}/assignpermissions`                    | Assign permissions to role    |
| DELETE | `/api/systemaccounttypes/{accounttype_id}/unassignmodule/{module_id}`   | Unassign module               |
| DELETE | `/api/systemaccounttypes/{accounttype_id}/unassignrole/{role_id}`    | Unassign role                 |
| DELETE | `/api/systemaccounttypes/{accounttype_id}/unassignpermission/{permission_id}` | Unassign permission    |

**Query (GET list):** `search`, `perPage`, `page`

**Body (POST/PUT account type):**

```json
{
  "name": "string (required, max 255)",
  "status": "string (required, max 255)"
}
```

**POST assignmodules:** `{ "modules": [1, 2, 3] }`  
**POST assignroles:** `{ "roles": [1, 2, 3] }`  
**POST assignpermissions:** `{ "role_id": 1, "permissions": [1, 2, 3] }`

---

### Companies

| Method | Path                                                                               | Description                    |
|--------|-------------------------------------------------------------------------------------|--------------------------------|
| GET    | `/api/companies`                                                                   | List companies (paginated)     |
| POST   | `/api/companies`                                                                   | Create company                 |
| GET    | `/api/companies/{id}`                                                              | Get one company                |
| PUT    | `/api/companies/{id}`                                                              | Update company                 |
| DELETE | `/api/companies/{id}`                                                              | Delete company                 |
| GET    | `/api/companies/{id}/available-accounttypes`                                       | Account types available to assign |
| GET    | `/api/companies/{id}/accounttypes`                                                | Assigned account types         |
| POST   | `/api/companies/{id}/assign-accounttypes`                                         | Assign account types           |
| DELETE | `/api/companies/{company_id}/unassign-accounttype/{accounttype_id}`                 | Unassign account type          |
| GET    | `/api/companies/{id}/available-users`                                             | Users available to assign      |
| GET    | `/api/companies/{id}/users`                                                       | Assigned users                 |
| POST   | `/api/companies/{id}/assign-users`                                                | Assign users                   |
| POST   | `/api/companies/{id}/create-user`                                                  | Create user in company         |
| DELETE | `/api/companies/{company_id}/unassign-user/{user_id}`                              | Unassign user                  |
| GET    | `/api/companies/{company_id}/users/{user_id}/roles`                                | User’s assigned roles          |
| POST   | `/api/companies/{company_id}/users/{user_id}/assign-roles`                        | Assign roles to user           |
| DELETE | `/api/companies/{company_id}/users/{user_id}/unassign-role/{role_id}`              | Unassign role from user        |
| GET    | `/api/companies/{company_id}/users/{user_id}/permissions`                          | User’s assigned permissions    |
| POST   | `/api/companies/{company_id}/users/{user_id}/assign-permissions`                  | Assign permissions to user     |
| DELETE | `/api/companies/{company_id}/users/{user_id}/unassign-permission/{permission_id}`   | Unassign permission from user  |
| GET    | `/api/companies/{company_id}/accounttypes/{accounttype_id}/roles`                   | Account type’s roles in company |
| GET    | `/api/companies/{company_id}/accounttypes/{accounttype_id}/permissions/{role_id?}` | Account type permissions (optional by role) |

**Body (POST/PUT company):**

```json
{
  "name": "string (required, max 255)",
  "regnumber": "string (required, max 255)",
  "country": "string (required, max 255)"
}
```

**POST assign-accounttypes:** `{ "accounttypes": [1, 2, 3] }` — IDs must exist in `accounttypes`.  
**POST assign-users:** `{ "user_ids": [1, 2, 3] }`  
**POST assign-roles (user):** `{ "role_ids": [1, 2, 3] }`  
**POST assign-permissions (user):** `{ "permission_ids": [1, 2, 3] }`  
**POST create-user:** `{ "name", "middlename" (optional), "lastname", "email", "gender" }` — `gender`: `male` | `female` | `other`.

---

## Implementation Checklist for Frontend

1. **Base config:** Set `baseURL` to `/api` (or full origin). Send `Accept: application/json` and `Content-Type: application/json`.
2. **Auth:** After login, store the Sanctum token and send `Authorization: Bearer {token}` on every request (if the app is fully protected).
3. **Errors:** On 422, read `response.data.error` and map keys to form fields; display `error[key].join(' ')` or similar.
4. **Lists:** Use `search`, `page`, `perPage` for list endpoints; handle paginator `data`, `current_page`, `last_page`, `total`, `per_page`.
5. **IDs:** Use integer (or UUID if the backend uses UUIDs) for `{id}`, `{company_id}`, `{user_id}`, etc. in paths.
6. **Submodules:** When listing submodules, always send `module_id` on GET `/api/systemsubmodules`. Use GET `/api/systemsubmodules/{id}/permissions` for permissions of one submodule.
7. **Roles:** Use GET/POST `/api/systemroles/{id}/assigned-permissions` and `/api/systemroles/{id}/assign-permissions` to manage role permissions.
8. **Companies:** Use the nested company → users/accounttypes/roles/permissions endpoints for company-scoped configuration; ensure correct `company_id`, `user_id`, `accounttype_id`, and `role_id` in URLs and bodies.

---

## Notes

- **Route order:** The route `GET /api/systemsubmodules/{id}/permissions` is defined before the generic `{id}` route so that “permissions” is not treated as an ID.
- **Consistency:** Some endpoints return `{ message, status, data }`; others return the resource directly. Handle both in the client (e.g. use `response.data.data ?? response.data` where appropriate).
- **404/500:** On 404, backend may return `{ "message": "...", "status": "error" }`. On 500, expect a similar structure with optional `error` detail. Always handle non-2xx status codes and show a generic or server message when no body is present.
