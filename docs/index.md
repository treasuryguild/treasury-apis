# index.md
---
layout: default
title: Home
nav_order: 1
---

# API Documentation

Welcome to the API documentation. Here you'll find comprehensive guides and documentation to help you start working with our APIs as quickly as possible.

## Getting Started

To get started with our APIs, you'll need:

1. An API key
2. Basic understanding of RESTful APIs
3. A tool to make HTTP requests (curl, Postman, etc.)

## Available APIs

- [Contributors API](/docs/contributors-api)
- [Wallets API](/docs/wallets-api)
- [Recognitions API](/docs/recognitions-api)

---

# docs/contributors-api.md
---
layout: default
title: Contributors API
nav_order: 2
---

# Contributors API Documentation

## Endpoint
```
GET /api/contributors
```

## Description
This endpoint retrieves a list of contributors and their wallet addresses from the database. Only wallets starting with 'addr' are included in the results.

## Authentication
The API requires authentication using an API key header.

### Headers
- `api_key`: Your server API key (Required)

Example:
```
api_key: your_api_key_here
```

## Response Format

### Success Response (200 OK)
Returns an array of objects containing:
- `contributor_id`: Unique identifier for the contributor
- `wallet`: Contributor's wallet address

Example Response:
```json
[
  {
    "contributor_id": "123",
    "wallet": "addr1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
]
```

### Error Responses

#### 403 Forbidden
```json
{
  "error": "Forbidden"
}
```
Returned when the API key is missing or invalid.

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
  "error": "Internal server error"
}
```
Returned when there's a server-side error.

## Example Usage

### cURL
```bash
curl -X GET \
  'https://your-domain.com/api/contributors' \
  -H 'api_key: your_api_key_here'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('https://your-domain.com/api/contributors', {
  method: 'GET',
  headers: {
    'api_key': 'your_api_key_here'
  }
});

const data = await response.json();
```

### Python (Requests)
```python
import requests

headers = {
    'api_key': 'your_api_key_here'
}

response = requests.get('https://your-domain.com/api/contributors', headers=headers)
data = response.json()
```

---

# docs/wallets-api.md
---
layout: default
title: Wallets API
nav_order: 3
---

# Wallets API

This endpoint retrieves wallet addresses and associated Discord handles.

## Endpoint

`GET /api/getGWallets`

[Rest of your Wallets API documentation...]

---

# docs/recognitions-api.md
---
layout: default
title: Recognitions API
nav_order: 4
---

# Recognitions API

This endpoint allows you to query recognition data with various filters.

## Endpoint

`GET /api/recognitions`

[Rest of your Recognitions API documentation...]