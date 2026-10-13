# Vue SPA Implementation Notes (Master Data)

This note is for the frontend team implementing company onboarding and master-data management in the Vue SPA.

## Scope

Backend now exposes CRUD + filtering for:

- `companycategories`
- `companysubcategories`
- `companyindustries`
- `provinces`
- `districts`

It also supports dependent filtering:

- company subcategories by selected company category
- districts by selected province

## Base API behavior

- Base path: `/api`
- Most create/update/delete responses are wrapped:
  - `{ message, status, data }`
- Most list responses are paginated (Laravel paginator shape):
  - `{ current_page, data, last_page, per_page, total, ... }`
- Validation errors:
  - HTTP `422` with `{ error: { field: ["message"] } }`
- Most `show`, `update`, `delete`, and dependent-filter endpoints accept either numeric `id` or `uuid` in path params.

## Endpoints

### Company Categories

- `GET /api/companycategories?search=&perPage=&page=`
- `POST /api/companycategories`
- `GET /api/companycategories/{idOrUuid}`
- `PUT /api/companycategories/{idOrUuid}`
- `DELETE /api/companycategories/{idOrUuid}`
- `GET /api/companycategories/{idOrUuid}/companysubcategories` (dependent list)

Body for create/update:

```json
{
  "name": "Manufacturing"
}
```

### Company Subcategories

- `GET /api/companysubcategories?companycategory_id=&search=&perPage=&page=`
- `POST /api/companysubcategories`
- `GET /api/companysubcategories/{idOrUuid}`
- `PUT /api/companysubcategories/{idOrUuid}`
- `DELETE /api/companysubcategories/{idOrUuid}`

Body for create/update:

```json
{
  "companycategory_id": 1,
  "name": "Textiles"
}
```

### Company Industries

- `GET /api/companyindustries?search=&perPage=&page=`
- `POST /api/companyindustries`
- `GET /api/companyindustries/{idOrUuid}`
- `PUT /api/companyindustries/{idOrUuid}`
- `DELETE /api/companyindustries/{idOrUuid}`

Body for create/update:

```json
{
  "name": "Mining"
}
```

### Provinces

- `GET /api/provinces?search=&perPage=&page=`
- `POST /api/provinces`
- `GET /api/provinces/{idOrUuid}`
- `PUT /api/provinces/{idOrUuid}`
- `DELETE /api/provinces/{idOrUuid}`
- `GET /api/provinces/{idOrUuid}/districts` (dependent list)

Body for create/update:

```json
{
  "name": "Harare"
}
```

### Districts

- `GET /api/districts?province_id=&search=&perPage=&page=`
- `POST /api/districts`
- `GET /api/districts/{idOrUuid}`
- `PUT /api/districts/{idOrUuid}`
- `DELETE /api/districts/{idOrUuid}`

Body for create/update:

```json
{
  "province_id": 1,
  "name": "Goromonzi"
}
```

## Suggested Vue implementation pattern

Use one shared API module for master data:

- `src/api/masterData.ts`
- `src/stores/masterData.ts` (Pinia) or composables

Keep both `id` and `uuid` in option objects so either can be used when needed.

### Recommended API methods

- `getCompanyCategories(params)`
- `createCompanyCategory(payload)`
- `updateCompanyCategory(idOrUuid, payload)`
- `deleteCompanyCategory(idOrUuid)`
- `getCompanySubcategories(params)`
- `getCompanySubcategoriesByCategory(idOrUuid)`
- `createCompanySubcategory(payload)`
- `updateCompanySubcategory(idOrUuid, payload)`
- `deleteCompanySubcategory(idOrUuid)`
- `getCompanyIndustries(params)`
- `createCompanyIndustry(payload)`
- `updateCompanyIndustry(idOrUuid, payload)`
- `deleteCompanyIndustry(idOrUuid)`
- `getProvinces(params)`
- `createProvince(payload)`
- `updateProvince(idOrUuid, payload)`
- `deleteProvince(idOrUuid)`
- `getDistricts(params)`
- `getDistrictsByProvince(idOrUuid)`
- `createDistrict(payload)`
- `updateDistrict(idOrUuid, payload)`
- `deleteDistrict(idOrUuid)`

## Dependent dropdown flow (important)

### Category -> Subcategory

1. Load categories on form mount.
2. When category changes:
   - clear current subcategory value
   - fetch `GET /api/companycategories/{categoryIdOrUuid}/companysubcategories` OR `GET /api/companysubcategories?companycategory_id={id}`
3. Disable subcategory select while loading.
4. If API returns empty array, show "No subcategories available".

### Province -> District

1. Load provinces on form mount (or lazy load on focus).
2. When province changes:
   - clear current district value
   - fetch `GET /api/provinces/{provinceIdOrUuid}/districts` OR `GET /api/districts?province_id={id}`
3. Disable district select while loading.
4. If API returns empty array, show "No districts available".

## UX and validation handling

- Map 422 backend errors directly to field-level messages:
  - `error.name`
  - `error.companycategory_id`
  - `error.province_id`
- For duplicate entries, backend responds with 422 and message in `message`.
- For not found, backend responds with 404 and `{ message, status: "error" }`.
- For list screens, always read rows from paginator `data`.

## Initial data expectations

- Zimbabwe provinces and districts are seeded in backend.
- Frontend can assume province/district data exists in non-empty environments where seeders were run.
- If missing, handle empty province list gracefully and show an admin hint.

## Quick integration checklist

- Add master-data API client module.
- Add category/subcategory dependent dropdown wiring.
- Add province/district dependent dropdown wiring.
- Normalize API response extraction (`res.data.data ?? res.data`).
- Add reusable 422 error mapper utility.
- Add loading/disabled states on dependent dropdowns.
