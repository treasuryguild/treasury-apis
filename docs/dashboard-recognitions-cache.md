# Dashboard Recognitions: Caching and Refresh Plan

## 1. Goals

- Guarantee that cached dashboard data is **bit‑identical** to the existing `dashboard_recognitions` API output.
- Avoid re‑implementing complex logic in SQL; keep **JS as the single source of truth**.
- Refresh data **automatically** when new transactions land (via GitHub Action).
- Provide a **manual “Refresh” button** on the dashboard page as a fallback when automation fails.

---

## 2. Current Situation

- Live API route: `pages/api/dashboard_recognitions/index.js`
  - Reads from `transactions` via Supabase.
  - Uses `utils/transformRecognitions.js` for:
    - FaultyTx filtering.
    - Hash generation (`generateShortHash`).
    - Recognition shaping.
  - Applies in-memory filters (`filterRecognitions`) based on query params.

- Database table: `dashboard_recognitions_cache`
  - Table now lives directly in Supabase (the earlier `docs/dashboard-recognitions-cron.sql` draft has been removed).
  - We no longer rely on a PL/pgSQL refresh function; all transformation logic stays in JS.

- Injection endpoint (implemented): `pages/api/dashboard_recognitions/inject-cache.js`
  - Validates `x-refresh-key` header against `DASHBOARD_REFRESH_KEY`.
  - Accepts `project_id` (header or body) and a `recognitions` array with the same shape as the live API output.
  - Normalises `transaction_timestamp` and `created_at` to safe timestamp values before insert.
  - Upserts into `dashboard_recognitions_cache` with `onConflict: 'project_id,recognition_id'` and `ignoreDuplicates: true` (append-only per recognition).
  - Batching is currently handled by callers (e.g. dashboard page, future GitHub Action) rather than inside this handler.

- Cache read endpoint (implemented): `pages/api/dashboard_recognitions/cache.js`
  - Validates `api_key` header against `SERVER_API_KEY`.
  - Paginates reads from `dashboard_recognitions_cache` in 1000-row pages for a single `project_id`.
  - Maps rows back into recognition objects and applies `filterRecognitions` with the same filters as the live API.
  - Returns `recognitions` plus metadata including `lastSyncedAt` derived from the latest `synced_at` value in the cache.

- Dashboard tooling UI (implemented): `pages/dashboard-recognitions.tsx`
  - Lets an authorised user:
    - Fetch **live** recognitions from `/api/dashboard_recognitions`.
    - Inject the live results into the cache in client-side batches via `/api/dashboard_recognitions/inject-cache`.
    - Fetch recognitions from the cache via `/api/dashboard_recognitions/cache`.
    - Compare live vs cache recognition IDs and inspect duplicate recognition IDs.
  - This is currently a **technical/ops view**, not yet the final simplified end-user "Refresh recognitions" UX.

- GitHub Action workflow in the transactions repo (`treasury-system-v4`) is **not yet implemented**; the endpoints in this repo are ready for it.

The **canonical behavior** remains the JS implementation (transformRecognitions + current live API), with the cache kept in sync via the injection endpoint.

---

## 3. Target Architecture (High Level)

1. **Canonical pipeline**: keep all transformation logic in JS only.
2. **Cache table**: `dashboard_recognitions_cache` in the database (same schema as in SQL file).
3. **Backend injection endpoint**:

- Accepts recognitions computed by the existing `dashboard_recognitions` API.
- Inserts recognitions into `dashboard_recognitions_cache` **only if not already present** (append-only per `recognition_id`).
- Does **not** delete existing cache rows.
- Is **explicitly batch- and timeout-aware** so that a single refresh never exceeds Netlify/hosting limits.

4. **Dashboard API (read)**:
   - New API route that reads **only from the cache table**.
5. **Dashboard UI**:
   - Uses cached data route for display.
   - Exposes a **“Refresh recognitions”** button that calls the refresh endpoint.
6. **GitHub Action in the transactions repo**:
   - Triggered on transaction updates.
   - Calls the refresh endpoint with the correct project id and secret.
   - Performs refresh work **in bounded batches** to avoid timeouts and rate limits.

---

## 4. Data Model and Cache Table

- Reuse the existing `dashboard_recognitions_cache` table in the database:
  - `dashboard_recognitions_cache` columns:
    - `project_id` (uuid, part of PK)
    - `recognition_id` (text, part of PK) = `<task_id>-<contributor_id>-<workgroup_slug>-<last6_of_tx_hash>`
    - `task_id`, `contributor_id`, `task_name`, `task_date`, `label`, `sub_group`, `task_creator`
    - `amounts` (jsonb)
    - `tx_id`, `transaction_hash`, `transaction_timestamp`, `tx_type`, `created_at`, `exchange_rate`
    - `synced_at` (timestamptz)
  - Indexes on `project_id` and `task_date`.

- We keep this schema but **stop relying on PL/pgSQL logic** for the transformation itself.

---

## 5. Backend: Injection + Cache Read

### 5.1 Injection API Route

**Status:** Implemented as `pages/api/dashboard_recognitions/inject-cache.js`.

- Route:
  - `POST /api/dashboard_recognitions/inject-cache`
- Behavior:
  - Validates secret key from a header (`x-refresh-key`, matched against `DASHBOARD_REFRESH_KEY`).
  - Accepts body with:
    - `project_id` (required; can also be supplied via `project-id` header).
    - `recognitions` array (required) — same shape as returned by the existing `GET /api/dashboard_recognitions` endpoint.
  - Steps (current implementation):
    1. Validate `project_id` and `recognitions` payload.
    2. Map each recognition to the cache table shape:
       - `project_id`, `recognition_id`, `task_id`, `contributor_id`, `task_name`, `task_date`, `label`, `sub_group`, `task_creator`, `amounts`, `tx_id`, `transaction_hash`, `transaction_timestamp`, `tx_type`, `created_at`, `exchange_rate`, `synced_at = now()`.
       - `transaction_timestamp` and `created_at` values are normalized to ISO 8601 timestamps; numeric or numeric-string epoch values are converted before insert to avoid Supabase date/time range errors.
    3. Insert into `dashboard_recognitions_cache` using Supabase `upsert`:
       - Conflict target: `(project_id, recognition_id)`.
       - `ignoreDuplicates: true` (append-only per recognition; no deletes).
    4. Return success payload including `attemptedCount`, `insertedCount` (when available), and `synced_at`.

- Batching / guardrails:
  - Callers (e.g. `pages/dashboard-recognitions.tsx`, planned GitHub Action) currently split work into safe batches (e.g. 200 recognitions per request).
  - An optional future enhancement is to enforce `MAX_RECOGNITIONS_PER_REQUEST` inside this handler and reject oversized payloads with a clear error.

- This keeps the table **append-only per recognition** and lets the canonical `dashboard_recognitions` API remain the single source of truth for how recognitions are computed.

### 5.2 Read-Only Cache API

**Status:** Implemented as `pages/api/dashboard_recognitions/cache.js`.

- Route:
  - `GET /api/dashboard_recognitions/cache`
- Behavior:
  - Validates API key via `api_key` header (`SERVER_API_KEY`).
  - Accepts same query filters as current route:
    - `startDate`, `endDate`, `subgroup`, `contributor_id`, `task_name`.
    - `project-id` header for `project_id`.
  - Reads from `dashboard_recognitions_cache` in **paged batches** (1000-row pages) to work around Supabase row limits, aggregating all rows for the given `project_id`.
  - Maps rows back into recognition objects and applies the same in-memory filters as the live API via `filterRecognitions` on the aggregated result set.
  - Returns:
    - `recognitions` array.
    - Metadata (total, projectId, appliedFilters, lastSyncedAt derived from `synced_at`).

- Eventually, the existing route `pages/api/dashboard_recognitions/index.js` can be refactored to:
  - Either call the cache directly.
  - Or be replaced by this cache-backed endpoint.

---

## 6. Dashboard UI: Manual Refresh Button

File: `pages/dashboard-recognitions.tsx`

### 6.1 UX Behavior

**Current state (technical view):**

- `pages/dashboard-recognitions.tsx` currently provides an **internal/ops dashboard** that exposes three main actions:
  - Fetch **live** recognitions from `/api/dashboard_recognitions`.
  - Inject the current live recognitions into the cache in batches via `/api/dashboard_recognitions/inject-cache`.
  - Fetch recognitions from the cache via `/api/dashboard_recognitions/cache` and compare live vs cache recognition IDs.
- It also surfaces basic metadata (counts, duplicate recognition IDs) to help validate that the cache is bit-identical to the live API.

**Planned end-user UX:**

- Add a **“Refresh recognitions”** button, visible to authorised users:
  - Disabled while a refresh is running.
  - Shows a loading spinner / “Refreshing…” label while waiting.
  - On success:
    - Show a small toast / banner: “Dashboard recognitions refreshed at hh:mm:ss”.
    - Re-fetch from the cache-backed API.
  - On error:
    - Show error toast with a concise message and maybe a “View logs” link (if relevant).

### 6.2 Wiring

- Button click flow (to be implemented):
  1. Frontend calls `POST /api/dashboard_recognitions/refresh` with:
  - `project-id` in headers.
  - `api_key` in headers (same API key as used by the GitHub Action, but provided from server-side config).
  - Authorization (e.g. user must be signed in / have admin role).
  2. The refresh endpoint **must not perform an unbounded full refresh inside a single Netlify/serverless invocation**. Instead, it should:
  - Either trigger the same batched GitHub Action flow used for automatic refreshes, and return quickly ("refresh started"), **or**
  - Perform a limited-scope refresh (e.g. latest N days or a small number of batches) that is guaranteed to complete within the function timeout.
  3. On success/completion, trigger a re-fetch from the cache endpoint.
  4. Update local state to show the new recognitions and last synced timestamp.

- The **end-user display** should eventually use only the cache route (`/api/dashboard_recognitions/cache`), so UI is always consistent with the cached table. The current technical view already consumes both live and cache endpoints for validation; this will be simplified for normal dashboard users.

---

## 7. GitHub Action: Automatic Cache Injection

Repository: [treasuryguild/treasury-system-v4](https://github.com/treasuryguild/treasury-system-v4), which updates whenever a transaction happens.

### 7.1 Trigger

- GitHub Actions workflow:
  - `on: push` or `on: workflow_run` depending on how transaction data is updated.
  - Optionally filter paths (e.g., only when a particular JSON/file is changed).

### 7.2 Action Steps

1. Checkout the repo.
2. Determine which `project_id`(s) are affected:

- For treasury-system-v4, use a specific `project_id` that represents this project.
- Store this value in a GitHub secret, e.g. `DASHBOARD_REFRESH_PROJECT_ID`.

3. Call the live dashboard recognitions API to compute recognitions:

- `GET ${{ secrets.DASHBOARD_REFRESH_BASE_URL }}/api/dashboard_recognitions?project_id=...` (plus any filters if needed)
- Headers:
  - `api_key: ${{ secrets.SERVER_API_KEY }}`
  - `project-id: ${{ secrets.DASHBOARD_REFRESH_PROJECT_ID }}`

4. Call the treasury-apis injection endpoint to write into the cache **in batches**:

- Split `response.recognitions` into chunks of size `MAX_RECOGNITIONS_PER_REQUEST` (must match the limit enforced by the injection API).
- For each chunk:
  - `POST ${{ secrets.DASHBOARD_REFRESH_BASE_URL }}/api/dashboard_recognitions/inject-cache`
  - Headers:
    - `x-refresh-key: ${{ secrets.DASHBOARD_REFRESH_KEY }}`
  - Body:
    - `project_id: ${{ secrets.DASHBOARD_REFRESH_PROJECT_ID }}`
    - `recognitions: <current_chunk>`
  - Optionally add a small delay/backoff between batches if we observe rate limiting from Supabase or the hosting provider.

4. Handle failures:

- Mark job as failed if response is non-2xx.
- Optionally send notification (Slack, email, GitHub issue, etc.).

### 7.3 Security

- Treasury-apis deployment environment:
  - `SERVER_API_KEY`: server-only API key used by `/api/dashboard_recognitions` and `/api/dashboard_recognitions/cache` (and other protected APIs).
  - `DASHBOARD_REFRESH_KEY`: separate secret used only by `/api/dashboard_recognitions/inject-cache` via the `x-refresh-key` header. This should **not** be the same value as `SERVER_API_KEY`.

- GitHub Actions secrets in `treasury-system-v4` (transactions repo):
  - `DASHBOARD_REFRESH_BASE_URL`: base URL for the treasury-apis instance (e.g. `https://treasury-apis.example.com`).
  - `DASHBOARD_REFRESH_PROJECT_ID`: the specific `project_id` used when calling the dashboard recognitions APIs.
  - `SERVER_API_KEY`: API key secret sent in the `api_key` header when calling `/api/dashboard_recognitions`; this should mirror the `SERVER_API_KEY` value configured for the treasury-apis deployment.
  - `DASHBOARD_REFRESH_KEY`: refresh secret sent in the `x-refresh-key` header when calling `/api/dashboard_recognitions/inject-cache`; this should match the value of `DASHBOARD_REFRESH_KEY` configured for the treasury-apis deployment and be different from `SERVER_API_KEY`.

- The refresh endpoint:
  - Should accept **only POST**.
  - Should validate the secret and reject all other calls.
  - Optionally limit calls to a whitelist of `project_id`s.

### 7.4 Example GitHub Actions Workflow YAML

Create a workflow in the transactions repo (e.g. `.github/workflows/refresh-dashboard-recognitions.yml`) that:

- Fetches recognitions from the live API (`pages/api/dashboard_recognitions/index.js`).
- Injects them into the cache via the injection API (`pages/api/dashboard_recognitions/inject-cache.js`).

```yaml
name: Refresh Dashboard Recognitions Cache

on:
  # Run on a schedule (adjust as needed)
  schedule:
    - cron: "0 * * * *" # every hour
  # Allow manual runs
  workflow_dispatch: {}

jobs:
  refresh-cache:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Fetch recognitions from live API
        id: fetch
        run: |
          set -euo pipefail

          RESPONSE=$(curl -sS \
            -H "api_key: ${{ secrets.SERVER_API_KEY }}" \
            -H "project-id: ${{ secrets.DASHBOARD_REFRESH_PROJECT_ID }}" \
            "${{ secrets.DASHBOARD_REFRESH_BASE_URL }}/api/dashboard_recognitions")

          echo "$RESPONSE" > recognitions.json

          # Basic sanity check
          if ! jq -e '.recognitions' recognitions.json > /dev/null; then
            echo "ERROR: recognitions array not found in API response" >&2
            cat recognitions.json >&2
            exit 1
          fi

      - name: Inject recognitions into cache
        run: |
          set -euo pipefail

          RECOGNITIONS_JSON=$(jq -c '.recognitions' recognitions.json)
          # Split recognitions into batches to avoid Netlify/serverless timeouts
          BATCH_SIZE=800  # must be <= MAX_RECOGNITIONS_PER_REQUEST enforced by the API
          TOTAL=$(echo "$RECOGNITIONS_JSON" | jq 'length')

          echo "Total recognitions: $TOTAL"

          i=0
          while [ "$i" -lt "$TOTAL" ]; do
            echo "Injecting batch starting at index $i"

            BATCH=$(echo "$RECOGNITIONS_JSON" | jq ".[${i}:(.${TOTAL} | tonumber) ] | .[:$BATCH_SIZE]")

            # Build the request body expected by inject-cache.js
            BODY=$(jq -n \
              --arg pid "${{ secrets.DASHBOARD_REFRESH_PROJECT_ID }}" \
              --argjson rec "$BATCH" \
              '{project_id: $pid, recognitions: $rec}')

            curl -sS -X POST \
              -H "Content-Type: application/json" \
              -H "x-refresh-key: ${{ secrets.DASHBOARD_REFRESH_KEY }}" \
              -d "$BODY" \
              "${{ secrets.DASHBOARD_REFRESH_BASE_URL }}/api/dashboard_recognitions/inject-cache" \
              -o inject-response.json

            echo "Inject response for batch starting at $i:"
            cat inject-response.json

            # Optionally fail if the response contains an error field
            if jq -e '.error' inject-response.json > /dev/null; then
              echo "ERROR: injection endpoint returned an error" >&2
              exit 1
            fi

            i=$((i + BATCH_SIZE))

            # Optional: brief sleep to avoid rate limiting
            sleep 1
          done
```

---

## 8. Auth and Permissions

- **Injection endpoint**:
  - Protected by a dedicated secret header (for GitHub Action / backend callers only).
  - Not exposed to regular frontend users.

- **Cache read endpoint**:
  - Same auth model as current dashboard API (`SERVER_API_KEY` or session-based auth, depending on existing patterns).

---

## 9. Failure Modes and Observability

- **GitHub Action fails**:
  - Cache is stale, but:
    - Manual “Refresh recognitions” button can recover.
    - The API / dashboards should surface `synced_at` so users can see staleness.
- **Injection endpoint fails**:
  - Return structured error JSON including reason (e.g., Supabase error).
  - Log to server logs with enough context (project_id, timestamps, error).
- **Partial DB write**:
  - Use DB transactions or Supabase upsert semantics in the injection endpoint:
    - Inserts should be idempotent and conflict-safe (no deletes).
    - On error, existing cache rows remain valid.

---

## 10. Implementation Steps (Checklist)

1. **Database**

- Ensure `dashboard_recognitions_cache` exists with the schema below (or equivalent in Supabase).
- Suggested table definition:

  ```sql
  CREATE TABLE public.dashboard_recognitions_cache (
    project_id uuid NOT NULL,
    recognition_id text NOT NULL,
    task_id text,
    contributor_id text,
    task_name text,
    task_date text,
    label text,
    sub_group text,
    task_creator text,
    amounts jsonb,
    tx_id uuid,
    transaction_hash text,
    transaction_timestamp timestamp with time zone,
    tx_type text,
    created_at timestamp with time zone DEFAULT now(),
    exchange_rate text,
    synced_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dashboard_recognitions_cache_pkey PRIMARY KEY (project_id, recognition_id),
    CONSTRAINT dashboard_recognitions_cache_project_id_fkey FOREIGN KEY (project_id)
      REFERENCES public.projects(project_id),
    CONSTRAINT dashboard_recognitions_cache_tx_id_fkey FOREIGN KEY (tx_id)
      REFERENCES public.transactions(tx_id)
  );

  CREATE INDEX dashboard_recognitions_cache_project_id_idx
    ON public.dashboard_recognitions_cache (project_id);

  CREATE INDEX dashboard_recognitions_cache_task_date_idx
    ON public.dashboard_recognitions_cache (task_date);
  ```

- (Optional) Remove or ignore the PL/pgSQL refresh function if not needed.

2. **Backend**
   - [x] `POST /api/dashboard_recognitions/inject-cache` implemented as `pages/api/dashboard_recognitions/inject-cache.js`:
     - Accepts `recognitions` from the existing `dashboard_recognitions` API and upserts into `dashboard_recognitions_cache`, skipping already-present `(project_id, recognition_id)` pairs (no deletes).
     - Normalises timestamp fields to avoid Supabase date/time range errors.
     - Batching is currently handled by callers (dashboard page, future GitHub Action); an optional enhancement is to enforce `MAX_RECOGNITIONS_PER_REQUEST` inside this handler.
   - [x] `GET /api/dashboard_recognitions/cache` implemented as `pages/api/dashboard_recognitions/cache.js`:
     - Reads from `dashboard_recognitions_cache` in paged batches.
     - Applies the same in-memory filters as the live API via `filterRecognitions`.

3. **Frontend**
   - [x] Implement internal validation/ops view in `pages/dashboard-recognitions.tsx` that:
     - Fetches live recognitions from `/api/dashboard_recognitions`.
     - Injects live recognitions into the cache in batches via `/api/dashboard_recognitions/inject-cache`.
     - Fetches recognitions from `/api/dashboard_recognitions/cache` and compares live vs cache results (including duplicate recognition diagnostics).
   - [ ] Implement the end-user dashboard UX:
     - Use the cache endpoint as the primary data source for display.
     - Surface `lastSyncedAt` from the cache metadata.
     - Add and wire up a single “Refresh recognitions” button backed by a refresh endpoint / GitHub Action flow.

4. **GitHub Action (transactions repo)**
   - [ ] Create workflow in `treasury-system-v4`:
     - Trigger on transaction updates.
     - Call `GET /api/dashboard_recognitions` to compute recognitions, then `POST /api/dashboard_recognitions/inject-cache` with secret and project id, in bounded batches.

5. **Testing**
   - [ ] Compare:
     - Direct call to old API (`/api/dashboard_recognitions`) vs.
     - Cache-backed API (`/api/dashboard_recognitions/cache`)
     - For the same `project_id` and filters, after a refresh.
   - [ ] Verify:
     - Manual/triggered refresh updates cache as expected.
     - GitHub Action runs and updates cache on new commits.

6. **Rollout**
   - [ ] Temporarily keep both:
     - Existing live-compute API.
     - New cache-backed API.
   - [ ] Once parity is confirmed, point the dashboard & external consumers exclusively to the cache-backed API.
