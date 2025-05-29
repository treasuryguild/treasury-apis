// services/zoomService.js
import axios from 'axios';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchAllMeetings = async (accessToken, userId = 'me') => {
  const meetings = [];
  let nextPageToken = '';

  do {
    try {
      if (nextPageToken) {
        await delay(100);
      }

      const response = await axios.get(`https://api.zoom.us/v2/users/${userId}/meetings`, {
        params: {
          type: 'past',
          page_size: 500,
          next_page_token: nextPageToken || undefined
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      meetings.push(...response.data.meetings);
      nextPageToken = response.data.next_page_token;

    } catch (error) {
      if (error.response?.status === 429) {
        console.log('Rate limit hit, waiting before retry...');
        await delay(2000);
        continue;
      }
      console.error('Error fetching meetings:', error.response?.data || error.message);
      break;
    }
  } while (nextPageToken);

  return meetings;
};

export const fetchParticipantsWithRateLimit = async (meetings, accessToken) => {
  const results = [];
  const BATCH_SIZE = 20;
  const BATCH_DELAY = 100;

  for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
    const batch = meetings.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(meeting => fetchMeetingParticipants(meeting.id, accessToken))
    );

    for (let j = 0; j < batch.length; j++) {
      results.push({
        participants: batchResults[j],
        meetingData: batch[j]
      });
    }

    if (i + BATCH_SIZE < meetings.length) {
      console.log(`Processed ${i + BATCH_SIZE} meetings, waiting before next batch...`);
      await delay(BATCH_DELAY);
    }
  }

  return results;
};

const fetchMeetingParticipants = async (meetingId, accessToken) => {
  try {
    const response = await axios.get(
      `https://api.zoom.us/v2/report/meetings/${meetingId}/participants`,
      {
        params: {
          page_size: 500
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(response.data.participants);
    return response.data.participants;

  } catch (error) {
    if (error.response?.status === 429) {
      console.log(`Rate limit hit for meeting ${meetingId}, waiting before retry...`);
      await delay(2000);
      return fetchMeetingParticipants(meetingId, accessToken);
    }
    console.error(`Error fetching participants for meeting ${meetingId}:`, error.response?.data || error.message);
    return [];
  }
};