# Frontend Notes: User Management API

Use these endpoints from `routes/api.php` for user CRUD and assignment flows.

## Base User Endpoints

- `GET /api/users`
  - Query params: `search`, `perPage`, `page`
- `POST /api/users`
- `GET /api/users/{id}`
  - Supports numeric user ID.
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`

## Role and Permission Endpoints

- `POST /api/users/{user_id}/assign-roles`
- `DELETE /api/users/{user_id}/unassign-role/{role_id}`
- `POST /api/users/{user_id}/assign-permissions`
- `DELETE /api/users/{user_id}/unassign-permission/{permission_id}`

## Create User Payload (Current Required Contract)

`POST /api/users` currently requires company, roles, and permissions in the request body.

```json
{
  "company_id": 1,
  "roles": [1, 2],
  "permissions": [10, 11],
  "name": "John",
  "middlename": "K",
  "lastname": "Doe",
  "email": "john@example.com",
  "gender": "male",
  "password": "secret123",
  "hint_question": "Your first school?",
  "hint_answer": "Central School",
  "status": "active",
  "created_by": "admin",
  "updated_by": "admin"
}
```

## Update User Payload

`PUT /api/users/{id}`:

```json
{
  "name": "John",
  "middlename": "K",
  "lastname": "Doe",
  "email": "john@example.com",
  "gender": "male",
  "password": "optional-if-changing",
  "hint_question": "Your first school?",
  "hint_answer": "Central School",
  "status": "active",
  "created_by": "admin",
  "updated_by": "admin"
}
```

## Validation Summary

- Required on create:
  - `company_id` (must exist in `companies`)
  - `roles` (array), each role must exist in `roles`
  - `permissions` (array), each permission must exist in `permissions`
  - `name`, `lastname`, `email`, `gender`, `password`
- Required on update:
  - `name`, `lastname`, `email`, `gender`
- Optional on create and update:
  - `middlename`, `hint_question`, `hint_answer`, `status`, `created_by`, `updated_by`
- `gender` must be one of: `male`, `female`, `other`
- `password` minimum length: `8` (required on create, optional on update)

## Assignment Payloads

Assign roles:

```json
{
  "role_ids": [1, 2, 3]
}
```

Assign permissions:

```json
{
  "permission_ids": [10, 11]
}
```

## Response Behavior and Status Codes

- Success responses include `message` and `status`.
- Create success: `201`
- Update/delete/assign/unassign success: `200`
- User not found: `404`
- Duplicate email on create/update: `400`
- Validation errors: `422`
- Unexpected server error: `500`

Not found response example:

```json
{
  "message": "User not found",
  "status": "error"
}
```

## Company-Scoped Endpoints Also Available

Company-level user endpoints are also defined:

- `GET /api/companies/{id}/users`
- `POST /api/companies/{id}/assign-users`
- `POST /api/companies/{id}/create-user`
- Additional company user role/permission assignment routes
