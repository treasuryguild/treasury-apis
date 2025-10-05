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
- `api_key`: Your API authentication key (Required)

Example:
```
api_key: your_api_key_here
```

## Query Parameters

| Parameter | Description | Format | Example | Default |
|-----------|-------------|---------|---------|---------|
| startDate | Start date for filtering meetings | Multiple formats supported | "01.01.2024" | null |
| endDate | End date for filtering meetings | Multiple formats supported | "31.01.2024" | Current date |
| includeMissingData | Include meetings with missing date information | boolean | "true"/"false" | "true" |

### Supported Date Formats
The API supports multiple date formats for `startDate` and `endDate` parameters:

| Format | Example | Description |
|--------|---------|-------------|
| DD.MM.YYYY | "15.03.2024" | Dot-separated with 4-digit year |
| DD.MM.YY | "15.03.24" | Dot-separated with 2-digit year |
| YYYY-MM-DD | "2024-03-15" | ISO format |
| DD/MM/YYYY | "15/03/2024" | Slash-separated with 4-digit year |
| DD/MM/YY | "15/03/24" | Slash-separated with 2-digit year |

**Note**: Dates are automatically converted to ISO format for processing. The API will try to match formats in the order listed above.

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
    dateFormatInfo: {
      supportedFormats: string[];
      examples: string[];
      constraints: {
        maximumRange: string;
        maximumFutureDate: string;
        note: string;
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
    },
    "dateFormatInfo": {
      "supportedFormats": ["DD.MM.YYYY", "DD.MM.YY", "YYYY-MM-DD", "DD/MM/YYYY", "DD/MM/YY"],
      "examples": ["15.03.2024", "15.03.24", "2024-03-15", "15/03/2024", "15/03/24"],
      "constraints": {
        "maximumRange": "10 months",
        "maximumFutureDate": "1 year from today",
        "note": "Dates are automatically converted to ISO format for processing"
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
  "message": "Date range exceeds maximum allowed period of 10 months. Range: 1/1/2023 to 12/31/2023 (12 months). Please reduce the date range.",
  "details": {
    "startDate": {
      "provided": "01.01.23",
      "parsed": "2023-01-01T00:00:00.000Z",
      "formatted": "1/1/2023"
    },
    "endDate": {
      "provided": "31.12.23",
      "parsed": "2023-12-31T00:00:00.000Z",
      "formatted": "12/31/2023"
    },
    "constraints": {
      "maximumRange": "10 months",
      "maximumFutureDate": "1 year from today",
      "supportedFormats": ["DD.MM.YYYY", "DD.MM.YY", "YYYY-MM-DD", "DD/MM/YYYY", "DD/MM/YY"]
    },
    "rangeInfo": {
      "duration": "12 months",
      "isValidRange": true
    }
  }
}
```

#### 400 Bad Request - Invalid Date Format
```json
{
  "error": "Invalid Start Date",
  "message": "Invalid date format: \"32.13.24\". Supported formats: DD.MM.YYYY, DD.MM.YY, YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY",
  "details": {
    "providedValue": "32.13.24",
    "supportedFormats": ["DD.MM.YYYY", "DD.MM.YY", "YYYY-MM-DD", "DD/MM/YYYY", "DD/MM/YY"],
    "examples": ["15.03.2024", "15.03.24", "2024-03-15", "15/03/2024", "15/03/24"]
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
- Maximum future date is 1 year from today
- Multiple date formats are supported (see Supported Date Formats section above)
- If no endDate is provided, current date is used
- If no startDate is provided, all meetings up to endDate are returned
- Dates are automatically converted to ISO format for processing

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
  'https://treasury-apis.netlify.app/api/zoom-meetings?startDate=01.01.2024&endDate=31.01.2024' \
  -H 'api_key: your_api_key_here'
```

### JavaScript (Fetch)
```javascript
const response = await fetch(
  'https://treasury-apis.netlify.app/api/zoom-meetings?startDate=01.01.2024&endDate=31.01.2024',
  {
    method: 'GET',
    headers: {
      'api_key': 'your_api_key_here'
    }
  }
);

const data = await response.json();
```

### Python (Requests)
```python
import requests

headers = {
    'api_key': 'your_api_key_here'
}

response = requests.get(
    'https://treasury-apis.netlify.app/api/zoom-meetings',
    params={
        'startDate': '01.01.2024',
        'endDate': '31.01.2024'
    },
    headers=headers
)
data = response.json()
```

## Best Practices
1. Always use date filters to limit the amount of data returned
2. Keep date ranges within the 10-month limit and avoid dates more than 1 year in the future
3. Use 4-digit years (YYYY) when possible to avoid ambiguity
4. Monitor the metadata.summary in responses for data quality metrics
5. Check the dateFormatInfo section in responses for supported formats and constraints
6. Cache responses when possible to avoid unnecessary API calls
7. Handle missing data appropriately using the includeMissingData parameter
8. Use the detailed error messages to troubleshoot date format issues


## Support
For API access and support, please contact andretreasuryguild in Discord.