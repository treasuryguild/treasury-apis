---
layout: default
title: Zoom Meetings API
nav_order: 6
parent: APIs
---

# Zoom Meetings API

## Overview
The Zoom Meetings API endpoint provides access to historical meeting data including participant information, meeting times, and attendance details.

## Endpoint
```
GET /api/zoom-meetings
```

## Authentication
The API requires authentication using an API key header.

### Required Headers
- `api-key`: Your API authentication key (Required)

Example:
```
api-key: your_api_key_here
```

## Query Parameters

| Parameter | Description | Format | Example | Default |
|-----------|-------------|---------|---------|---------|
| startDate | Start date for filtering meetings | dd.mm.yy | "01.01.24" | null |
| endDate | End date for filtering meetings | dd.mm.yy | "31.01.24" | Current date |
| includeMissingData | Include meetings with missing date information | boolean | "true"/"false" | "true" |

## Response Format

### Success Response (200 OK)
Returns an object containing meetings array and metadata.

#### Example Response Body
```typescript
{
  meetings: Array<{
    id: string;
    uuid: string;
    topic: string;
    scheduled_start: string | null;  // ISO date string
    actual_start: string | null;     // ISO date string
    duration: number;                // in minutes
    total_participants: number;
    participants: Array<{
      id: string;
      user_id: string;
      name: string;
      user_email: string;
      join_time: string | null;      // ISO date string
      leave_time: string | null;     // ISO date string
      duration: number;              // in seconds
      registrant_id: string;
      failover: boolean;
      status: string;
      groupId: string;
      internal_user: boolean;
    }>;
  }>;
  metadata: {
    total: number;
    appliedFilters: {
      dateRange: {
        startDate: string | null;
        endDate: string | null;
        parsedStartDate: string | null;
        parsedEndDate: string | null;
      } | null;
      includeMissingData: boolean;
    };
    summary: {
      totalMeetings: number;
      totalParticipants: number;
      meetingsWithoutDates: number;
      meetingsWithoutParticipants: number;
      dateRange: {
        earliest: string | null;
        latest: string | null;
      };
    };
  };
}
```

Example Response:
```json
{
  "meetings": [
    {
      "id": "123456789",
      "uuid": "abcd1234-efgh-5678-ijkl-mnopqrstuvwx",
      "topic": "Marketing guild",
      "scheduled_start": "2024-01-15T10:00:00Z",
      "actual_start": "2024-01-15T10:02:15Z",
      "duration": 60,
      "total_participants": 8,
      "participants": [
        {
          "id": "04LJMnpnTc2IusLb5qv0ZQ",
          "user_id": "16778240",
          "name": "Ambassadors SingularityNET",
          "user_email": "singularitynetambassadors@gmail.com",
          "join_time": "2024-03-15T12:52:45.000Z",
          "leave_time": "2024-03-15T13:33:12.000Z",
          "duration": 2427,
          "registrant_id": "",
          "failover": false,
          "status": "in_meeting",
          "groupId": "",
          "internal_user": true
        }
      ]
    }
  ],
  "metadata": {
    "total": 1,
    "appliedFilters": {
      "dateRange": {
        "startDate": "01.01.24",
        "endDate": "31.01.24",
        "parsedStartDate": "2024-01-01T00:00:00.000Z",
        "parsedEndDate": "2024-01-31T23:59:59.999Z"
      },
      "includeMissingData": true
    },
    "summary": {
      "totalMeetings": 1,
      "totalParticipants": 8,
      "meetingsWithoutDates": 0,
      "meetingsWithoutParticipants": 0,
      "dateRange": {
        "earliest": "2024-01-15T10:02:15Z",
        "latest": "2024-01-15T10:02:15Z"
      }
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Date Range
```json
{
  "error": "Invalid Date Range",
  "message": "Date range exceeds maximum allowed period of 10 months",
  "details": {
    "startDate": "01.01.23",
    "endDate": "31.12.23",
    "parsedStartDate": "2023-01-01T00:00:00.000Z",
    "parsedEndDate": "2023-12-31T23:59:59.999Z",
    "maximumRange": "10 months",
    "provided": "12 months"
  }
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

#### 405 Method Not Allowed
```json
{
  "error": "Method Not Allowed",
  "message": "Only GET requests are allowed"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Features and Functionality

### Date Filtering
- Meetings can be filtered by date range using `startDate` and `endDate` parameters
- Maximum date range is 10 months
- Dates should be provided in dd.mm.yy format
- If no endDate is provided, current date is used
- If no startDate is provided, all meetings up to endDate are returned

### Meeting Data Processing
- Actual start time is determined by the earliest participant join time
- If no participant data is available, scheduled start time is used
- Meetings are sorted by actual start time in descending order
- Meetings without start times are included by default (control with includeMissingData parameter)

### Rate Limiting
The API implements rate limiting when fetching participant data from Zoom to avoid hitting API limits.

## Example Usage

### cURL
```bash
curl -X GET \
  'https://treasury-apis.netlify.app/api/zoom-meetings?startDate=01.01.24&endDate=31.01.24' \
  -H 'api-key: your_api_key_here'
```

### JavaScript (Fetch)
```javascript
const response = await fetch(
  'https://treasury-apis.netlify.app/api/zoom-meetings?startDate=01.01.24&endDate=31.01.24',
  {
    method: 'GET',
    headers: {
      'api-key': 'your_api_key_here'
    }
  }
);

const data = await response.json();
```

### Python (Requests)
```python
import requests

headers = {
    'api-key': 'your_api_key_here'
}

response = requests.get(
    'https://treasury-apis.netlify.app/api/zoom-meetings',
    params={
        'startDate': '01.01.24',
        'endDate': '31.01.24'
    },
    headers=headers
)
data = response.json()
```

## Best Practices
1. Always use date filters to limit the amount of data returned
2. Keep date ranges within the 10-month limit
3. Monitor the metadata.summary in responses for data quality metrics
4. Cache responses when possible to avoid unnecessary API calls
5. Handle missing data appropriately using the includeMissingData parameter


## Support
For API access and support, please contact andretreasuryguild in Discord.