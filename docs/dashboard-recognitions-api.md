# API Documentation: `/api/dashboard_recognitions/*`

This document explains how to use the dashboard recognitions API routes:

- `/api/dashboard_recognitions/cache`
- `/api/dashboard_recognitions/projects`
- `/api/dashboard_recognitions/subgroups`
- `/api/dashboard_recognitions/snet-sc-token-allocation`

## Authentication

All routes require a valid server API key (`SERVER_API_KEY`).

Accepted header formats:

```text
api_key: YOUR_API_KEY
```

or

```text
x-api-key: YOUR_API_KEY
```

or

```text
Authorization: Bearer YOUR_API_KEY
```

All routes below are `GET` only.

## 1) Cache Route

### Endpoint

`GET /api/dashboard_recognitions/cache`

### Required Headers

- API key (one of the formats above)
- `project-id`: project ID to read from `dashboard_recognitions_cache`

### Query Parameters

- `startDate` (optional)
- `endDate` (optional)
- `subgroup` (optional)
- `contributor_id` (optional)
- `task_name` (optional)

### Example

```bash
curl -X GET "https://treasury-apis.netlify.app/api/dashboard_recognitions/cache?startDate=2025-01-01&endDate=2025-01-31&subgroup=Operations" \
	-H "x-api-key: YOUR_API_KEY" \
	-H "project-id: YOUR_PROJECT_ID"
```

### Success Response Shape

```json
{
  "recognitions": [],
  "metadata": {
    "total": 0,
    "projectId": "...",
    "appliedFilters": {
      "contributor_id": null,
      "subgroup": null,
      "task_name": null,
      "dateRange": null
    },
    "lastSyncedAt": null
  }
}
```

## 2) Projects Route

### Endpoint

`GET /api/dashboard_recognitions/projects`

### Notes

- Results are automatically restricted to `DASHBOARD_RECOGNITIONS_PROJECT_ID` (server-side env var).
Only shows SNET Ambassador Program details.

### Query Parameters

- `archived` (optional):
  - `true` returns only archived projects
  - `false` returns non-archived or null archived values
- `limit` (optional): default `200`, min `1`, max `1000`

### Example

```bash
curl -X GET "https://treasury-apis.netlify.app/api/dashboard_recognitions/projects?archived=false&limit=100" \
	-H "api_key: YOUR_API_KEY"
```

### Success Response Shape

```json
{
  "data": [],
  "metadata": {
    "total": 0,
    "appliedFilters": {
      "project_id": "...",
      "archived": "false",
      "limit": 100
    }
  }
}
```

## 3) Subgroups Route

### Endpoint

`GET /api/dashboard_recognitions/subgroups`

### Notes

- Results are automatically restricted to `DASHBOARD_RECOGNITIONS_PROJECT_ID` (server-side env var).
Only shows workgroups for Snet Ambassador Program

### Query Parameters

- `sub_group` (optional): case-insensitive partial match
- `limit` (optional): default `500`, min `1`, max `2000`

### Example

```bash
curl -X GET "https://treasury-apis.netlify.app/api/dashboard_recognitions/subgroups?sub_group=Video&limit=250" \
	-H "Authorization: Bearer YOUR_API_KEY"
```

### Success Response Shape

```json
{
  "data": [],
  "metadata": {
    "total": 0,
    "appliedFilters": {
      "project_id": "...",
      "sub_group": "Video",
      "limit": 250
    }
  }
}
```

## 4) SNET SC Token Allocation Route

### Endpoint

`GET /api/dashboard_recognitions/snet-sc-token-allocation`

### Query Parameters

- `month` (optional): exact match filter

### Example

```bash
curl -X GET "https://treasury-apis.netlify.app/api/dashboard_recognitions/snet-sc-token-allocation?month=2025-01" \
	-H "x-api-key: YOUR_API_KEY"
```

### Success Response Shape

```json
{
  "data": [],
  "metadata": {
    "total": 0,
    "appliedFilters": {
      "month": "2025-01"
    }
  }
}
```

## Error Responses

Common status codes:

- `400`: bad request (for example, missing `project-id` on `cache` route)
- `401`: unauthorized (invalid or missing API key)
- `405`: method not allowed (non-GET requests)
- `500`: internal server error

Development mode (`NODE_ENV=development`) may include additional `details` in `500` responses.
