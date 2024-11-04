# SingularityNET Ambassador Recognition API Documentation

## Overview
This API provides access to recognition data for the SingularityNET Ambassador program. It allows retrieving and filtering recognition records based on various parameters.

## Base URL
`/api/recognitions`

## Authentication
All requests must include an API key in the headers for authentication.

### Required Headers
- `x-api-key`: Your API authentication key
- `x-project-id`: The project identifier for SNET Ambassador wallet recognitions
  - Use `722294ef-c9e4-4b2f-8779-a3f7caf4f28d` for accessing Ambassador program data

## Endpoints

### GET /api/recognitions

Retrieves recognition records with optional filtering.

#### Query Parameters

| Parameter | Type | Description | Format | Example |
|-----------|------|-------------|---------|---------|
| startDate | string | Start date for filtering records | dd.mm.yy | "01.01.24" |
| endDate | string | End date for filtering records | dd.mm.yy | "31.01.24" |
| subgroup | string | Filter by specific subgroup | string | "marketing" |
| contributor_id | string | Filter by specific contributor | string | "contributor123" |
| task_name | string | Filter by task name (partial match supported) | string | "community" |

#### Example Request

```bash
curl -X GET 'https://treasury-apis.netlify.app/api/recognitions?startDate=01.01.24&endDate=31.01.24' \
-H 'x-api-key: your-api-key' \
-H 'x-project-id: 722294ef-c9e4-4b2f-8779-a3f7caf4f28d'
```

#### Response Format

```javascript
{
  "recognitions": [
    {
      "transaction_hash": "string",
      "transaction_timestamp": "string",
      "tx_id": "string",
      "contribution_id": "string",
      "created_at": "string",
      "contributor_id": "string",
      "task_name": "string",
      "date": "string",
      "label": "string",
      "subGroup": "string",
      "taskCreator": "string",
      "amounts": object,
      "exchange_rate": number
    }
  ],
  "metadata": {
    "total": number,
    "projectId": "string",
    "appliedFilters": {
      "contributor_id": string | null,
      "subgroup": string | null,
      "task_name": string | null,
      "dateRange": {
        "startDate": string | null,
        "endDate": string | null
      }
    }
  }
}
```

## Error Responses

| Status Code | Description | Response Body |
|-------------|-------------|---------------|
| 400 | Missing project ID | `{ "error": "Bad Request", "message": "Project ID is required in headers (x-project-id)" }` |
| 401 | Invalid API key | `{ "error": "Unauthorized", "message": "Invalid API key" }` |
| 405 | Method not allowed | `{ "message": "Method not allowed" }` |
| 500 | Server error | `{ "error": "Internal server error", "details": {...} }` |

## Usage Examples

### 1. Get All Recognition Records for a Date Range

```bash
curl -X GET 'https://treasury-apis.netlify.app/api/recognitions?startDate=01.01.24&endDate=31.01.24' \
-H 'x-api-key: your-api-key' \
-H 'x-project-id: 722294ef-c9e4-4b2f-8779-a3f7caf4f28d'
```

### 2. Filter Records by Contributor and Subgroup

```bash
curl -X GET 'https://treasury-apis.netlify.app/api/recognitions?contributor_id=ambassador123&subgroup=marketing' \
-H 'x-api-key: your-api-key' \
-H 'x-project-id: 722294ef-c9e4-4b2f-8779-a3f7caf4f28d'
```

### 3. Search for Specific Tasks

```bash
curl -X GET 'https://treasury-apis.netlify.app/api/recognitions?task_name=community' \
-H 'x-api-key: your-api-key' \
-H 'x-project-id: 722294ef-c9e4-4b2f-8779-a3f7caf4f28d'
```

## Best Practices

1. Always include both the API key and project ID in headers
2. Use date filters to limit the amount of data returned
3. Combine filters to get more specific results
4. Monitor the metadata in responses for useful information about your queries

## Rate Limiting and Usage Guidelines

- Include appropriate error handling in your applications
- Cache responses when possible to avoid unnecessary API calls
- Consider implementing pagination in your applications for large data sets

## Support
If you encounter any issues or need assistance, please reach out to the SNET Ambassador program support team.