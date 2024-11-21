---
layout: default
title: Recognitions API
nav_order: 3
parent: APIs
---

# Recognition API

## Endpoint
```
GET /api/recognitions
```

## Description
This endpoint provides access to recognition data from the Treasury Guild Database. It allows retrieving and filtering recognition records based on various parameters.

## Authentication
The API requires authentication using specific headers.

### Headers
- `api-key`: Your API authentication key (Required - Contact andretreasuryguild for access)
- `project-id`: The project identifier (Required)
  - Use `722294ef-c9e4-4b2f-8779-a3f7caf4f28d` for SNet Ambassador program data

Example:
```
api-key: your_api_key_here
project-id: 722294ef-c9e4-4b2f-8779-a3f7caf4f28d
```

## Query Parameters

| Parameter | Description | Format | Example |
|-----------|-------------|---------|---------|
| startDate | Start date for filtering records | dd.mm.yy | "01.01.24" |
| endDate | End date for filtering records | dd.mm.yy | "31.01.24" |
| subgroup | Filter by specific subgroup | string | "treasury guild" |
| contributor_id | Filter by specific contributor | string | "7xcueh" |
| task_name | Filter by task name | string | "Treasury Operator Rewards" |

## Response Format

### Success Response (200 OK)
Returns an object containing recognitions array and metadata.

#### Example Response Body
```typescript
{
  // Array of recognition records
  recognitions: Recognition[];
  metadata: {
    total: number;        // Total number of records
    projectId: string;    // Project identifier
    appliedFilters: {     // Applied filter values
      contributor_id: string | null;
      subgroup: string | null;
      task_name: string | null;
      dateRange: {
        startDate: string | null;  // Format: dd.mm.yy
        endDate: string | null;    // Format: dd.mm.yy
      }
    }
  }
}
```

Example Response:
```json
{
  "recognitions": [
    {
      "recognition_id": "m0y7q3n81nzx-mmdfl0",
      "transaction_hash": "0202cae4ff851d7cee6e041a945b4b13b27aa1d7dbf77153da8bce1d8036f926",
      "transaction_timestamp": "1732017590927",
      "tx_type": "Outgoing",
      "tx_id": "565ebbc1-0b33-448e-ba81-56245ac0b618",
      "task_id": "m0y7q3n81nzx",
      "created_at": "2024-11-19T11:59:51.075998+00:00",
      "contributor_id": "mmdfl0",
      "task_name": "Participate in Marketing Guild 15.11.24",
      "date": "15.11.24",
      "label": [
        "Community Communication",
        "Coordination"
      ],
      "subGroup": "Marketing Guild",
      "taskCreator": "singularitynet",
      "amounts": {
        "MINS": "65"
      },
      "exchange_rate": "0.737"
    }
  ],
  "metadata": {
    "total": 1,
    "projectId": "722294ef-c9e4-4b2f-8779-a3f7caf4f28d",
    "appliedFilters": {
      "contributor_id": null,
      "subgroup": null,
      "task_name": null,
      "dateRange": {
        "startDate": null,
        "endDate": null
      }
    }
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Project ID is required in headers (x-project-id)"
}
```
Returned when project ID is missing.

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```
Returned when the API key is invalid.

#### 405 Method Not Allowed
```json
{
  "message": "Method not allowed"
}
```
Returned when using any HTTP method other than GET.

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": {}
}
```
Returned when there's a server-side error.

## Example Usage

### cURL
```bash
curl -X GET \
  'https://treasury-apis.netlify.app/api/recognitions?startDate=01.01.24&endDate=31.01.24' \
  -H 'api-key: your_api_key_here' \
  -H 'project-id: 722294ef-c9e4-4b2f-8779-a3f7caf4f28d'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('https://treasury-apis.netlify.app/api/recognitions?startDate=01.01.24&endDate=31.01.24', {
  method: 'GET',
  headers: {
    'api-key': 'your_api_key_here',
    'project-id': '722294ef-c9e4-4b2f-8779-a3f7caf4f28d'
  }
});

const data = await response.json();
```

### Python (Requests)
```python
import requests

headers = {
    'api-key': 'your_api_key_here',
    'project-id': '722294ef-c9e4-4b2f-8779-a3f7caf4f28d'
}

response = requests.get(
    'https://treasury-apis.netlify.app/api/recognitions?startDate=01.01.24&endDate=31.01.24',
    headers=headers
)
data = response.json()
```

## Best Practices
- Always include both the API key and project ID in headers
- Use date filters to limit the amount of data returned
- Combine filters to get more specific results
- Monitor the metadata in responses for useful information about your queries
- Cache responses when possible to avoid unnecessary API calls

## Support
For API access and support, please contact andretreasuryguild in Discord