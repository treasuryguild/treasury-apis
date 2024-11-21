// pages/api/zoom-meetings/index2.js First working version
import axios from 'axios';

// Utility function for controlled delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const validateApiKey = (req) => {
  const apiKey = req.headers['api-key'];
  const validApiKey = process.env.SERVER_API_KEY;
  
  if (!apiKey || apiKey !== validApiKey) {
    throw new Error('Invalid API key');
  }
};

const getZoomAccessToken = async () => {
  try {
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'account_credentials',
        account_id: process.env.ZOOM_ACCOUNT_ID,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Zoom access token:', error.response?.data || error.message);
    throw new Error('Failed to get Zoom access token');
  }
};

const fetchAllMeetings = async (accessToken, userId = 'me') => {
  const meetings = [];
  let nextPageToken = '';
  
  do {
    try {
      // Add small delay between paginated requests
      if (nextPageToken) {
        await delay(100); // 100ms delay between paginated requests
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
        // If we hit rate limit, wait for a bit longer and retry
        console.log('Rate limit hit, waiting before retry...');
        await delay(2000); // Wait 2 seconds before retrying
        continue;
      }
      console.error('Error fetching meetings:', error.response?.data || error.message);
      break;
    }
  } while (nextPageToken);

  return meetings;
};

const fetchMeetingParticipants = async (meetingId, accessToken) => {
  try {
    const response = await axios.get(
      `https://api.zoom.us/v2/past_meetings/${meetingId}/participants`,
      {
        params: {
          page_size: 500
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    // Remove duplicate participants based on user_email
    const uniqueParticipants = response.data.participants.reduce((acc, current) => {
      const x = acc.find(item => item.user_email === current.user_email);
      if (!x) {
        return acc.concat([current]);
      } else {
        if (current.duration > x.duration) {
          const index = acc.indexOf(x);
          acc[index] = current;
        }
        return acc;
      }
    }, []);

    return uniqueParticipants;
  } catch (error) {
    if (error.response?.status === 429) {
      // If we hit rate limit, wait and retry once
      console.log(`Rate limit hit for meeting ${meetingId}, waiting before retry...`);
      await delay(2000);
      return fetchMeetingParticipants(meetingId, accessToken); // Retry once
    }
    console.error(`Error fetching participants for meeting ${meetingId}:`, error.response?.data || error.message);
    return [];
  }
};

const fetchParticipantsWithRateLimit = async (meetings, accessToken) => {
  const results = [];
  const BATCH_SIZE = 20; // Process 20 meetings at a time
  const BATCH_DELAY = 100; // Wait 0.1 second between batches

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

const getEarliestJoinTime = (participants) => {
  if (!participants || participants.length === 0) return null;
  return participants.reduce((earliest, participant) => {
    if (!participant.join_time) return earliest;
    const joinTime = new Date(participant.join_time);
    return earliest ? (joinTime < earliest ? joinTime : earliest) : joinTime;
  }, null);
};

const parseDate = (dateString) => {
  if (!dateString) return null;
  
  const [day, month, year] = dateString.split('.');
  // Assuming 20xx for year
  const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
  return new Date(`${fullYear}-${month}-${day}`);
};

const getMonthsDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const yearDiff = d2.getFullYear() - d1.getFullYear();
  const monthDiff = d2.getMonth() - d1.getMonth();
  return yearDiff * 12 + monthDiff;
};

const validateDateRange = (startDate, endDate) => {
  // If either date is missing, skip validation
  if (!startDate || !endDate) return true;

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure end date is not before start date
  if (end < start) {
    throw new Error('End date cannot be before start date');
  }

  // Calculate months difference and throw specific error for range exceeding 10 months
  const monthsDiff = Math.abs(getMonthsDifference(start, end));
  if (monthsDiff > 10) {
    throw new Error('Date range exceeds maximum allowed period of 10 months');
  }

  return true;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    validateApiKey(req);

    const { startDate, endDate, includeMissingData = 'true' } = req.query;
    
    const parsedStartDate = startDate ? parseDate(startDate) : null;
    const parsedEndDate = endDate ? parseDate(endDate) : new Date();

    try {
      validateDateRange(parsedStartDate, parsedEndDate);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid Date Range',
        message: error.message,
        details: {
          startDate: startDate,
          endDate: endDate,
          parsedStartDate: parsedStartDate?.toISOString(),
          parsedEndDate: parsedEndDate?.toISOString(),
          maximumRange: '10 months',
          provided: parsedStartDate && parsedEndDate ? 
            `${Math.abs(getMonthsDifference(parsedStartDate, parsedEndDate))} months` : 
            'incomplete date range'
        }
      });
    }

    console.log('Fetching with params:', { 
      startDate: parsedStartDate?.toISOString(), 
      endDate: parsedEndDate?.toISOString(),
      includeMissingData 
    });

    const accessToken = await getZoomAccessToken();
    console.log('Got access token');

    const allMeetings = await fetchAllMeetings(accessToken);
    console.log(`Fetched ${allMeetings.length} meetings`);

    console.log('Fetching participants in batches...');
    const meetingsWithParticipantsData = await fetchParticipantsWithRateLimit(allMeetings, accessToken);

    const meetingsWithParticipants = meetingsWithParticipantsData.map(({ participants, meetingData }) => ({
      id: meetingData.id,
      uuid: meetingData.uuid,
      topic: meetingData.topic,
      scheduled_start: meetingData.start_time,
      actual_start: getEarliestJoinTime(participants)?.toISOString() || meetingData.start_time || null,
      duration: meetingData.duration,
      total_participants: participants?.length || 0,
      participants: participants?.map(p => ({
        ...p,
        join_time: p.join_time ? new Date(p.join_time).toISOString() : null,
        leave_time: p.leave_time ? new Date(p.leave_time).toISOString() : null
      })) || []
    }));

    let filteredMeetings = meetingsWithParticipants;
    if (parsedStartDate || parsedEndDate) {
      filteredMeetings = meetingsWithParticipants.filter(meeting => {
        // If includeMissingData is true and the meeting has no date, include it
        if (includeMissingData !== 'false' && !meeting.actual_start) {
          return true;
        }
        
        // If the meeting has a date, apply date filtering
        if (meeting.actual_start) {
          const meetingDate = new Date(meeting.actual_start);
          const start = parsedStartDate || new Date(0);
          const end = parsedEndDate || new Date();
          return meetingDate >= start && meetingDate <= end;
        }
        
        // If includeMissingData is false and meeting has no date, exclude it
        return false;
      });
    }

    // Always sort meetings with dates, keeping meetings without dates at the end
    filteredMeetings.sort((a, b) => {
      // If both meetings have dates, sort normally
      if (a.actual_start && b.actual_start) {
        return new Date(b.actual_start) - new Date(a.actual_start);
      }
      // If only one meeting has a date, put the one without a date at the end
      if (a.actual_start) return -1;
      if (b.actual_start) return 1;
      // If neither has a date, maintain original order
      return 0;
    });

    return res.status(200).json({
      meetings: filteredMeetings,
      metadata: {
        total: filteredMeetings.length,
        appliedFilters: {
          dateRange: startDate || endDate ? { 
            startDate: startDate || null,
            endDate: endDate || null,
            parsedStartDate: parsedStartDate?.toISOString() || null,
            parsedEndDate: parsedEndDate?.toISOString() || null
          } : null,
          includeMissingData: includeMissingData !== 'false'
        },
        summary: {
          totalMeetings: filteredMeetings.length,
          totalParticipants: filteredMeetings.reduce((sum, m) => sum + (m.total_participants || 0), 0),
          meetingsWithoutDates: filteredMeetings.filter(m => !m.actual_start).length,
          meetingsWithoutParticipants: filteredMeetings.filter(m => !m.participants || m.participants.length === 0).length,
          dateRange: {
            earliest: filteredMeetings.find(m => m.actual_start)?.actual_start || null,
            latest: [...filteredMeetings].reverse().find(m => m.actual_start)?.actual_start || null
          }
        }
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    if (error.message === 'Invalid API key') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    if (error.message === 'Failed to get Zoom access token') {
      return res.status(500).json({
        error: 'Zoom Authentication Failed',
        message: 'Failed to authenticate with Zoom API'
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
}