# API Documentation: `/api/labels`

This document explains how to use the `/api/labels` API route for fetching and inserting label data.

## Authentication
All requests must include an `api_key` header with a valid API key.

```text
Headers:
api_key: YOUR_API_KEY_HERE
```

---

## 1️⃣ Fetch Data (`GET` Request)

### 🔹 Fetch All Labels
```bash
curl -X GET "https://treasury-apis.netlify.app/api/labels" \
  -H "api_key: YOUR_API_KEY_HERE"
```

### 🔹 Fetch Limited Labels (e.g., first 5)
```bash
curl -X GET "https://treasury-apis.netlify.app/api/labels?limit=5" \
  -H "api_key: YOUR_API_KEY_HERE"
```

### 🔹 Fetch by Label (Partial Match Allowed)
```bash
curl -X GET "https://treasury-apis.netlify.app/api/labels?label=Test" \
  -H "api_key: YOUR_API_KEY_HERE"
```

---

## 2️⃣ Insert Labels (`POST` Request)

When inserting labels, you can provide either a comma-separated string or an array of label strings. The API will split the input into individual labels, check for duplicates, and return an error if any provided label already exists.

### 🔹 Insert New Labels (Using Comma-Separated String)
```bash
curl -X POST "https://treasury-apis.netlify.app/api/labels" \
  -H "api_key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "labels": "TestLabel1, TestLabel2, TestLabel3"
  }'
```

### 🔹 Insert New Labels (Using an Array)
```bash
curl -X POST "https://treasury-apis.netlify.app/api/labels" \
  -H "api_key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "labels": ["TestLabel1", "TestLabel2", "TestLabel3"]
  }'
```

> **Note:** If any of the provided labels already exist in the database, the API will return a `409 Conflict` error indicating which labels are duplicates.

---

## 3️⃣ Error Responses

If the request is invalid or unauthorized, the API will return an error message:

| Status Code | Error Message                                                                              |
|-------------|--------------------------------------------------------------------------------------------|
| 400         | "Missing labels in request body."                                                          |
| 400         | "Labels must be provided as a comma separated string or an array of strings."               |
| 409         | "Some labels already exist."                                                               |
| 401         | "Invalid or missing API key."                                                              |
| 405         | "Method Not Allowed"                                                                       |
| 500         | "Internal Server Error"                                                                    |

---

## Notes
- The `label` field is stored as text and must be **unique**.
- When posting labels, ensure there are no duplicate entries within the payload.
- For GET requests, the `label` query parameter supports partial matching (case-insensitive).

---

Happy Coding! 🚀
