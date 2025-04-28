# API Documentation: `/api/recognitions`

This document explains how to use the `/api/recognitions` API route for fetching and inserting recognition data.

## Authentication
All requests must include an `api_key` header with a valid API key.

```text
Headers:
api_key: YOUR_API_KEY_HERE
```

---

## 1️⃣ Fetch Data (`GET` Request)

### 🔹 Fetch All Records
```bash
curl -X GET "https://treasury-apis.netlify.app/api/recognitions" \
  -H "api_key: YOUR_API_KEY_HERE"
```

### 🔹 Fetch Limited Records (e.g., first 5)
```bash
curl -X GET "https://treasury-apis.netlify.app/api/recognitions?limit=5" \
  -H "api_key: YOUR_API_KEY_HERE"
```

### 🔹 Fetch by Recognition ID
```bash
curl -X GET "https://treasury-apis.netlify.app/api/recognitions?recognition_id=12345" \
  -H "api_key: YOUR_API_KEY_HERE"
```

### 🔹 Fetch by Task ID
```bash
curl -X GET "https://treasury-apis.netlify.app/api/recognitions?task_id=1011" \
  -H "api_key: YOUR_API_KEY_HERE"
```

### 🔹 Fetch by Wallet Owner (Partial Match Allowed)
```bash
curl -X GET "https://treasury-apis.netlify.app/api/recognitions?wallet_owner=TestUser" \
  -H "api_key: YOUR_API_KEY_HERE"
```

### 🔹 Fetch by Date Range (Format: DD.MM.YYYY)
```bash
curl -X GET "https://treasury-apis.netlify.app/api/recognitions?start_date=01.01.2024&end_date=01.02.2024" \
  -H "api_key: YOUR_API_KEY_HERE"
```

---

## 2️⃣ Insert or Update Data (`POST` Request)

### 🔹 Insert a Single Record
```bash
curl -X POST "https://treasury-apis.netlify.app/api/recognitions" \
  -H "api_key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "recognition_id": 12345,
        "task_id": 1011,
        "date_completed": "01.01.2024",
        "insert_date": "01.01.2024",
        "wallet_owner": "TestUser",
        "group_name": "SingularityNET",
        "sub_group": "Video Workgroup",
        "task_labels": "Operations,Facilitating",
        "task_name": "Facilitating the CIP-1694 workshop",
        "status": "On Chain",
        "rewarded": true,
        "ada": 50,
        "mins": 30,
        "agix": 20,
        "usd": 5,
        "wallet_address": "addr_test...",
        "proof_link": "https://example.com/proof",
        "transaction_id": "9dfcecac86f1724..."
      }
    ]
  }'
```

### 🔹 Insert Multiple Records
```bash
curl -X POST "https://treasury-apis.netlify.app/api/recognitions" \
  -H "api_key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "recognition_id": 12345,
        "task_id": 1011,
        "date_completed": "01.01.2024",
        "insert_date": "01.01.2024",
        "wallet_owner": "TestUser",
        "group_name": "SingularityNET",
        "sub_group": "Video Workgroup",
        "task_labels": "Operations,Facilitating",
        "task_name": "Facilitating the CIP-1694 workshop",
        "status": "On Chain",
        "rewarded": true,
        "ada": 50,
        "mins": 30,
        "agix": 20,
        "usd": 5,
        "wallet_address": "addr_test...",
        "proof_link": "https://example.com/proof",
        "transaction_id": "9dfcecac86f1724..."
      },
      {
        "recognition_id": 67890,
        "task_id": 2022,
        "date_completed": "02.01.2024",
        "insert_date": "02.01.2024",
        "wallet_owner": "AnotherUser",
        "group_name": "SingularityNET",
        "sub_group": "Video Workgroup",
        "task_labels": "Operations,Facilitating",
        "task_name": "Participation in the CIP-1694 workshop",
        "status": "On Chain",
        "rewarded": true,
        "ada": 75,
        "mins": 40,
        "agix": 25,
        "usd": 10,
        "wallet_address": "addr_test...",
        "proof_link": "https://example.com/proof",
        "transaction_id": "9dfcecac86f1724..."
      }
    ]
  }'
```

---

## 3️⃣ Error Logging and Responses

### Error Logging
The API implements comprehensive error logging with the following features:

- Each request is assigned a unique `requestId` for tracking
- All errors include:
  - Error message
  - Stack trace
  - Request context (method, path, timestamp)
  - Relevant data (query parameters, record counts, etc.)
- Warnings are logged for:
  - Invalid date formats (with automatic conversion)
  - Invalid insert_date formats (with automatic conversion)

### Error Responses
If the request is invalid or unauthorized, the API will return an error message:

| Status Code | Error Message | Logged Context |
|-------------|--------------|----------------|
| 400 | `"Missing records in request body."` | Request method, path, timestamp |
| 400 | `"Invalid JSON string in request body."` | Body type, length, request context |
| 400 | `"Each record must include recognition_id (number), task_id (number), and date_completed (string)."` | Invalid record details, request context |
| 401 | `"Invalid or missing API key."` | Request context, API key presence |
| 405 | `"Method Not Allowed"` | Request method, path, timestamp |
| 500 | `"Internal Server Error"` | Error stack trace, request context, relevant data |

### Warning Logs
The API will log warnings for the following scenarios:

| Scenario | Logged Information |
|----------|-------------------|
| Invalid date format | Original date, record ID, request context |
| Invalid insert_date format | Original date, record ID, request context |

---

## Notes
- `recognition_id` and `task_id` **must be numbers**.
- `date_completed` and `insert_date` must be in **DD.MM.YYYY** format.
- If a record with the same `recognition_id` exists, it will be **updated** instead of duplicated.
- Invalid date formats will be automatically converted to DD.MM.YYYY format with a warning log.

---
Happy Coding! 🚀
