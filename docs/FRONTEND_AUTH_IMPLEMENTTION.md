# Nuxt Frontend Implementation Guide (nuxt-auth-sanctum)

This document is for the frontend Cursor agent implementing authentication and password reset against this Laravel API.

Nuxt client uses: [nuxt-auth-sanctum](https://nuxt.com/modules/nuxt-auth-sanctum)

## 1) Objective

Implement cookie-based authentication using Laravel Sanctum and build password reset request flows from the Nuxt client.

Scope includes:
- Login
- Authenticated session restore
- Logout
- Self-service password reset email request (with hint validation inputs)
- Admin-triggered password reset email request (no hint fields)
- Reset-link landing page in Nuxt

## 2) Backend Endpoints Available

### Sanctum + Auth
- `GET /sanctum/csrf-cookie`
- `POST /api/auth/login`
- `GET /api/auth/me` (requires Sanctum cookie session)
- `POST /api/auth/logout` (requires Sanctum cookie session)

### Password Reset Request
- `POST /api/password-resets/request` (public; requires `email`, `hint_question`, `hint_answer`)
- `POST /api/password-resets/admin-request` (auth required; requires `email`)

## 3) Important Backend Behavior

- Authentication is session-cookie based (not bearer token).
- Sanctum stateful API middleware is enabled on backend.
- Password reset email links are generated to Nuxt frontend URL:
  - `FRONTEND_URL + FRONTEND_RESET_PASSWORD_PATH`
  - Query params include `token` and `email`
- Reset email is queued.

## 4) Nuxt Module Setup

Install module:

```bash
npx nuxi@latest module add nuxt-auth-sanctum
```

Configure in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["nuxt-auth-sanctum"],
  sanctum: {
    baseUrl: "http://localhost:8000", // Laravel API base
    mode: "cookie",
    redirects: {
      login: "/login",
      home: "/",
    },
  },
});
```

Notes:
- Use actual backend URL for each environment.
- Keep browser credentials/cookies enabled in client requests.

## 5) Frontend Auth Architecture

Use module composables:
- `useSanctumAuth()` for auth actions and current user
- `useSanctumFetch()` for API calls requiring authenticated session

Expected login flow:
1. Call CSRF cookie endpoint (module usually handles this automatically in cookie mode).
2. Submit credentials to login.
3. Read authenticated user state from `useSanctumAuth` or call `/api/auth/me`.
4. Redirect to protected area.

Logout flow:
1. Call logout action.
2. Clear local auth state.
3. Redirect to login page.

## 6) Pages To Implement

### Login Page (`/login`)
Fields:
- `email`
- `password`

Actions:
- Submit using module auth login method mapped to backend `POST /api/auth/login`.
- On success, redirect to app home/dashboard.
- On `422`, show backend message (`Invalid credentials.`).

### Forgot Password Page (`/forgot-password`)
Fields:
- `email`
- `hint_question`
- `hint_answer`

Actions:
- Call `POST /api/password-resets/request`.
- Show generic success response message from backend.
- Handle `422` for invalid hint answer/question.

### Admin User Management Reset Action
Action:
- Trigger `POST /api/password-resets/admin-request` with `{ email }`.
- Require logged-in admin session.
- Show success/error toast based on API response.

### Reset Password Landing Page (`/reset-password`)
Read query params:
- `token`
- `email`

Actions:
- Validate both exist; otherwise show invalid-link state.
- Render form UI prepared for password update submission.

Current limitation:
- Backend currently sends reset email but does not yet expose a custom API endpoint in this implementation set for final password update submission from Nuxt. Coordinate with backend if `/api/reset-password` endpoint is required immediately.

## 7) Route Middleware Strategy

Use module middleware for:
- Protected pages (`auth` required)
- Guest-only pages (`login`, `forgot-password`)

Recommended behavior:
- If unauthenticated on protected route, redirect to `/login`.
- If authenticated and visiting `/login`, redirect to home/dashboard.

## 8) Error Handling Contract

Standard handling:
- `401`: session missing/expired, redirect to login
- `419`: CSRF issue, refresh CSRF and retry once
- `422`: show validation/backend message directly to user
- `500`: generic failure message

## 9) Environment Requirements

Frontend must use the same top-level domain policy compatible with Sanctum SPA cookies.

Backend-side values to align with frontend domain:
- `SANCTUM_STATEFUL_DOMAINS`
- CORS allowed origin
- `SESSION_DOMAIN` (if using subdomains in production)

## 10) Acceptance Checklist

- Login succeeds and session persists after refresh.
- Protected routes load with valid session cookie.
- Logout invalidates session and redirects to login.
- Forgot password request works with valid hint question/answer.
- Forgot password request fails with proper message for bad hints.
- Admin-triggered reset works from authenticated admin UI.
- Reset email link opens Nuxt `/reset-password` with `token` and `email` query params.

## 11) Suggested Frontend Deliverables

- Auth composable wrappers (if needed) around module methods
- Auth middleware for route guarding
- Login page
- Forgot password page
- Admin reset action UI integration
- Reset-password landing page with query parsing and validation state
- Basic e2e/manual QA notes proving each checklist item

