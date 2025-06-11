// services/zoomService.js
import axios from 'axios';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Add exponential backoff for rate limits with jitter
const exponentialBackoff = async (retryCount = 0, maxRetries = 5) => {
  const baseDelay = 2000; // 2 seconds
  const maxDelay = 64000; // 64 seconds
  const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay) + jitter;
  await delay(delay);
  return retryCount + 1;
};

// Rate limit tracking
const rateLimitState = {
  lastRequestTime: 0,
  minRequestInterval: 100, // Minimum 100ms between requests
  concurrentRequests: 0,
  maxConcurrentRequests: 2, // Limit concurrent requests
};

// Helper to manage request timing and concurrency
const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - rateLimitState.lastRequestTime;

  // Wait if we're making requests too quickly
  if (timeSinceLastRequest < rateLimitState.minRequestInterval) {
    await delay(rateLimitState.minRequestInterval - timeSinceLastRequest);
  }

  // Wait if we have too many concurrent requests
  while (rateLimitState.concurrentRequests >= rateLimitState.maxConcurrentRequests) {
    await delay(100);
  }

  rateLimitState.concurrentRequests++;
  rateLimitState.lastRequestTime = Date.now();
};

// Helper to release request slot
const releaseRequest = () => {
  rateLimitState.concurrentRequests = Math.max(0, rateLimitState.concurrentRequests - 1);
};

// -----------------------------------------------------------------------------
// NEW: Fetch participants for exactly one meeting UUID (using both endpoints)
// -----------------------------------------------------------------------------
export const getMeetingParticipantsForUUID = async (accessToken, meetingUUID) => {
  try {
    // Fetch from both endpoints with retries, but not concurrently
    const pastParticipants = await fetchWithRetries(
      () => fetchPastMeetingParticipants(meetingUUID, accessToken),
      {
        onError: (err) => {
          const respData = err.response?.data || {};
          if (respData.code === 3001) {
            console.warn(`Zoom reports "Meeting does not exist" for UUID ${meetingUUID} in past meetings endpoint`);
            return [];
          }
          throw err;
        }
      }
    );

    // Add a small delay between endpoints
    await delay(500);

    const reportParticipants = await fetchWithRetries(
      () => fetchReportMeetingParticipants(meetingUUID, accessToken),
      {
        onError: (err) => {
          console.warn(`Error fetching report participants for UUID ${meetingUUID}:`, err.message);
          return [];
        }
      }
    );

    // Create a map of participants by user_id to merge data
    const mergedParticipants = new Map();

    // First add all past participants
    pastParticipants.forEach(participant => {
      if (participant.user_id) {
        mergedParticipants.set(participant.user_id, {
          ...participant,
          source: 'past_meetings'
        });
      }
    });

    // Then merge in report participants data
    reportParticipants.forEach(participant => {
      if (participant.user_id) {
        const existing = mergedParticipants.get(participant.user_id);
        if (existing) {
          // Merge data, preferring non-null values from either source
          mergedParticipants.set(participant.user_id, {
            ...existing,
            ...participant,
            source: 'both'
          });
        } else {
          mergedParticipants.set(participant.user_id, {
            ...participant,
            source: 'report'
          });
        }
      }
    });

    return Array.from(mergedParticipants.values());
  } catch (err) {
    // If both endpoints fail with 3001, return empty array
    const respData = err.response?.data || {};
    if (respData.code === 3001) {
      console.warn(`Zoom reports "Meeting does not exist" for UUID ${meetingUUID}`);
      return [];
    }
    // Other unexpected errors should bubble up
    throw err;
  }
};

/**
 * List full meeting‐report objects via Zoom's Report API, within an optional date range.
 * 
 * @param accessToken - Zoom OAuth token
 * @param userId      - Zoom user ID (not "me")
 * @param fromDate    - "YYYY-MM-DD" (inclusive). If omitted, Zoom defaults to 30 days ago.
 * @param toDate      - "YYYY-MM-DD" (inclusive). If omitted, Zoom defaults to today.
 */
export const listMeetingSummaries = async (accessToken, fromDate, toDate) => {
  // 1) Resolve a real Zoom userId (cannot use "me" for report endpoints).
  const usersResponse = await axios.get('https://api.zoom.us/v2/users', {
    params: { status: 'active', page_size: 1, page_number: 1 },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const firstUser = usersResponse.data.users?.[0];
  if (!firstUser?.id) {
    throw new Error('Could not retrieve any active user from Zoom.');
  }
  const userId = firstUser.id;

  // 2) Fetch all past meeting‐reports for that user, passing along our date range:
  const meetingReports = await fetchAllMeetingReports(accessToken, userId, fromDate, toDate);
  return meetingReports; // return the array of objects
};

/**
 * Fetch all past meeting reports for a given user via Report API, with pagination.
 *
 * @param accessToken - Zoom OAuth token
 * @param userId      - Zoom user ID from listMeetingSummaries
 * @param fromDate    - "YYYY-MM-DD" (inclusive). If omitted, Zoom defaults to 30 days ago.
 * @param toDate      - "YYYY-MM-DD" (inclusive). If omitted, Zoom defaults to today.
 */
export const fetchAllMeetingReports = async (accessToken, userId, fromDate, toDate) => {
  const reports = [];
  let nextPageToken = '';

  do {
    try {
      if (nextPageToken) {
        await delay(100);
      }

      // Build the params object, always include type=past.
      const params = {
        type: 'past',
        page_size: 300,
        next_page_token: nextPageToken || undefined,
      };

      // If caller provided a fromDate, pass it as "from"
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const response = await axios.get(
        `https://api.zoom.us/v2/report/users/${userId}/meetings`,
        {
          params,
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      reports.push(...response.data.meetings);
      nextPageToken = response.data.next_page_token;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(
          'Rate limit hit while fetching meeting reports, waiting before retry...'
        );
        await delay(2000);
        continue;
      }
      console.error(
        'Error fetching meeting reports:',
        error.response?.data || error.message
      );
      break;
    }
  } while (nextPageToken);

  return reports;
};

/**
 * 1) List all past meetings for a given user (unchanged).
 *    Each returned `meeting` object has both:
 *      - `meeting.id`   → numeric Meeting ID (for the most recent instance only)
 *      - `meeting.uuid` → a base64 UUID that uniquely identifies that specific occurrence
 */
export const fetchAllMeetings = async (accessToken, userId = 'me') => {
  const meetings = [];
  let nextPageToken = '';

  do {
    try {
      if (nextPageToken) {
        await delay(100);
      }

      const response = await axios.get(
        `https://api.zoom.us/v2/users/${userId}/meetings`,
        {
          params: {
            type: 'past',
            page_size: 500,
            next_page_token: nextPageToken || undefined,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      meetings.push(...response.data.meetings);
      nextPageToken = response.data.next_page_token;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('Rate limit hit while fetching meetings, waiting before retry...');
        await delay(2000);
        continue;
      }
      console.error('Error fetching meetings:', error.response?.data || error.message);
      break;
    }
  } while (nextPageToken);

  return meetings;
};

/**
 * 2) For each `meeting` object (with .id and .uuid), fetch participants in batches.
 *    We first try /past_meetings/{uuid}/participants (conditionally URL‐encoded).
 *    Only if Zoom returns code=3001 (“Meeting does not exist” or “too old”) do we fall back to
 *    /report/meetings/{uuid}/participants
 */
export const fetchParticipantsWithRateLimit = async (meetings, accessToken) => {
  const results = [];
  const BATCH_SIZE = 20;
  const BATCH_DELAY = 100; // ms between batches

  for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
    const batch = meetings.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map((meeting) =>
        fetchMeetingParticipantsEither(meeting, accessToken)
      )
    );

    for (let j = 0; j < batch.length; j++) {
      results.push({
        meetingData: batch[j],
        participants: batchResults[j],
      });
    }

    if (i + BATCH_SIZE < meetings.length) {
      console.log(`Processed ${i + BATCH_SIZE} meetings, waiting before next batch...`);
      await delay(BATCH_DELAY);
    }
  }

  return results;
};

/**
 * Try the UUID‐based "past_meetings" endpoint first (conditionally encoding).
 * If Zoom returns error code=3001 (“Meeting does not exist”), fall back to the "report" endpoint.
 */
const fetchMeetingParticipantsEither = async (meeting, accessToken) => {
  try {
    // Always attempt the UUID endpoint first:
    return await fetchPastMeetingParticipants(meeting.uuid, accessToken);
  } catch (err) {
    const respData = err.response?.data || {};
    if (respData.code === 3001) {
      // Zoom did not recognize that UUID (maybe >1 year old or never existed)
      console.log(
        `UUID not found (or too old) for "${meeting.uuid}", falling back to fetchReportMeetingParticipants search`
      );
      return await fetchReportMeetingParticipants(meeting.uuid, accessToken);
    }
    // Other errors (e.g. rate-limit didn't retry or 400/404), so just return an empty array
    console.error(
      `Unhandled error for UUID ${meeting.uuid}:`,
      respData || err.message
    );
    return [];
  }
};

/**
 * Fetch participants via `/past_meetings/{uuid}/participants`
 * → Must encode the UUID just enough so that Zoom sees the exact instance.
 * Zoom's own docs say: "If the UUID begins with '/' or contains '//' → double-encode."
 * Otherwise, single-encode (or even raw) is fine.
 */
const fetchPastMeetingParticipants = async (meetingUUID, accessToken) => {
  let encodedUUID;

  // If the raw UUID begins with "/" or contains "//", we do encodeURIComponent twice
  if (meetingUUID.startsWith('/') || meetingUUID.includes('//')) {
    encodedUUID = encodeURIComponent(encodeURIComponent(meetingUUID));
  } else {
    // Otherwise, a single encodeURIComponent keeps "==" or "+" safe in a URL path
    encodedUUID = encodeURIComponent(meetingUUID);
  }

  const participants = [];
  let nextPageToken = '';

  do {
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/past_meetings/${encodedUUID}/participants`,
        {
          params: {
            page_size: 300,              // max page size for /past_meetings
            next_page_token: nextPageToken || undefined,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      participants.push(...(response.data.participants || []));
      nextPageToken = response.data.next_page_token;
    } catch (error) {
      const status = error.response?.status;
      const respData = error.response?.data || {};

      if (status === 429) {
        console.log(
          `Rate limit hit on /past_meetings/${meetingUUID}, waiting before retry...`
        );
        await delay(2000);
        continue; // retry same page
      }

      // Any other error (400, 404, or Zoom code=3001) is thrown so caller can catch code=3001
      throw error;
    }
  } while (nextPageToken);

  return participants;
};

/**
 * Fetch participants via `/report/meetings/{meetingUuid}/participants`
 */
const fetchReportMeetingParticipants = async (meetingIdOrUUID, accessToken) => {
  const participants = [];
  let nextPageToken = '';

  // First try with UUID
  try {
    let encodedUUID;
    if (meetingIdOrUUID.startsWith('/') || meetingIdOrUUID.includes('//')) {
      encodedUUID = encodeURIComponent(encodeURIComponent(meetingIdOrUUID));
    } else {
      encodedUUID = encodeURIComponent(meetingIdOrUUID);
    }

    do {
      try {
        const response = await axios.get(
          `https://api.zoom.us/v2/report/meetings/${encodedUUID}/participants`,
          {
            params: {
              page_size: 500,
              next_page_token: nextPageToken || undefined,
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        participants.push(...(response.data.participants || []));
        nextPageToken = response.data.next_page_token;
      } catch (error) {
        const status = error.response?.status;
        const respData = error.response?.data || {};

        if (status === 429) {
          console.log(
            `Rate limit hit on /report/meetings/${encodedUUID}, waiting before retry...`
          );
          await delay(2000);
          continue;
        }

        // If UUID attempt fails, break 
      }
    } while (nextPageToken);

    // If we got participants with UUID, return them
    if (participants.length > 0) {
      return participants;
    }
  } catch (error) {
    console.log(`UUID attempt failed for ${meetingIdOrUUID}, trying numeric ID...`);
  }

  // Fall back if UUID attempt failed or returned no participants
  nextPageToken = '';
  do {
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/report/meetings/${meetingIdOrUUID}/participants`,
        {
          params: {
            page_size: 500,
            next_page_token: nextPageToken || undefined,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      participants.push(...(response.data.participants || []));
      nextPageToken = response.data.next_page_token;
    } catch (error) {
      const status = error.response?.status;
      const respData = error.response?.data || {};

      if (status === 429) {
        console.log(
          `Rate limit hit on /report/meetings/${meetingIdOrUUID}, waiting before retry...`
        );
        await delay(2000);
        continue;
      }

      // Zoom can return 3001 here again,
      // or 404/400 if it's truly invalid—just stop and return what we have so far.
      console.error(
        `Error fetching participants from report endpoint for ID ${meetingIdOrUUID}:`,
        respData || error.message
      );
      break;
    }
  } while (nextPageToken);

  return participants;
};

// Helper function to handle retries with exponential backoff
const fetchWithRetries = async (fetchFn, { maxRetries = 5, onError } = {}) => {
  let retryCount = 0;
  let lastError;
  let result;

  while (retryCount <= maxRetries) {
    try {
      await waitForRateLimit();
      result = await fetchFn();
      releaseRequest();
      return result;
    } catch (error) {
      releaseRequest();
      lastError = error;

      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after']) || 0;
        if (retryAfter > 0) {
          console.log(`Rate limit hit with retry-after: ${retryAfter}s`);
          await delay(retryAfter * 1000);
        } else {
          console.log(`Rate limit hit, attempt ${retryCount + 1}/${maxRetries + 1}`);
          retryCount = await exponentialBackoff(retryCount, maxRetries);
        }
        continue;
      }

      if (onError) {
        return onError(error);
      }
      throw error;
    }
  }

  throw lastError;
};
