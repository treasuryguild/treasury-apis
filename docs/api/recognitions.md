---
layout: default
title: Recognitions API
nav_order: 3
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
Returns an object containing recognitions array and metadata:

Example Response:
```json
{
  "recognitions": [
    {
      "transaction_hash": "string",
      "transaction_timestamp": "string",
      "tx_type": "string",
      "tx_id": "string",
      "task_id": "string",
      "created_at": "string",
      "contributor_id": "string",
      "task_name": "string",
      "date": "string",
      "label": "string",
      "subGroup": "string",
      "taskCreator": "string",
      "amounts": {},
      "exchange_rate": 0
    }
  ],
  "metadata": {
    "total": 0,
    "projectId": "string",
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