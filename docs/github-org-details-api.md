# GitHub Organization Details API Documentation

This API route fetches details for a GitHub organization using the GitHub GraphQL API. All requests require a valid API key.

---

## Authentication

Include the API key in the request headers:

```http
api_key: YOUR_API_KEY
```

---

## HTTP Methods Supported

- **GET** – Pass parameters via the query string.

---

## Request Parameters

**Required Parameters (via Query String):**

- **`orgName` (string):**  
  The organization login name to fetch details for.

---

## Example Request

### Fetch Organization Details (GET)

```bash
curl -X GET "https://treasury-apis.netlify.app/api/github/org-details?orgName=ORG_NAME" \
  -H "api_key: YOUR_API_KEY"
```

---

## Response Format

A successful response returns a JSON object containing an array of project details. Each project in the array has the following structure:

```json
{
  "data": [
    {
      "id": "PVT_kwDOCkl5vM4A1FkH",
      "number": 22,
      "title": "Treasury Automation WG",
      "updatedAt": "2025-03-24T11:07:32Z",
      "url": "https://github.com/orgs/SingularityNet-Ambassador-Program/projects/22",
      "closed": false,
      "repoName": null,
      "source": "org"
    },
    // ... additional projects
  ]
}
```

### Response Fields

- **`id` (string):**  
  The unique identifier for the project.

- **`number` (number):**  
  The project number within the organization.

- **`title` (string):**  
  The name/title of the project.

- **`updatedAt` (string):**  
  The timestamp of the last update to the project in ISO 8601 format.

- **`url` (string):**  
  The GitHub URL to access the project.

- **`closed` (boolean):**  
  Indicates whether the project is closed or active.

- **`repoName` (string | null):**  
  The name of the repository if the project is repository-level, or `null` if it's an organization-level project.

- **`source` (string):**  
  Indicates the source of the project, either `"org"` for organization-level projects or `"repo"` for repository-level projects.

---

## Error Handling

The API returns appropriate HTTP status codes and error messages in case of issues:

- **401 Unauthorized:**  
  When the API key is missing or invalid.
  
  ```json
  { "error": "Invalid API key" }
  ```

- **400 Bad Request:**  
  When the required parameter (`orgName`) is missing.
  
  ```json
  { "error": "Missing organization name (orgName)." }
  ```

- **500 Internal Server Error:**  
  For any unexpected server errors or issues with the GitHub GraphQL API.

---

## Notes

- The API uses a GitHub GraphQL client initialized with a token from the `GITHUB_TOKEN` environment variable.
- The `api_key` header is validated against the value set in `SERVER_API_KEY`.
- The API returns both organization-level and repository-level projects.
- Projects are returned in an array, with each project containing metadata about its source and status.

Happy coding! 