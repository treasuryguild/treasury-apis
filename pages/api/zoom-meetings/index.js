// pages/api/zoom-meetings/index.js
import { validateApiKey, getZoomAccessToken } from '../../../services/authService';
import { fetchAllMeetings, fetchParticipantsWithRateLimit } from '../../../services/zoomService';
import { parseDate, validateDateRange } from '../../../utils/dateHelpers';
import { processMeetingData } from '../../../utils/meetingHelpers';

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
          startDate,
          endDate,
          parsedStartDate: parsedStartDate?.toISOString(),
          parsedEndDate: parsedEndDate?.toISOString(),
          maximumRange: '10 months',
          provided: parsedStartDate && parsedEndDate ? 
            `${Math.abs(getMonthsDifference(parsedStartDate, parsedEndDate))} months` : 
            'incomplete date range'
        }
      });
    }

    const accessToken = await getZoomAccessToken();
    const allMeetings = await fetchAllMeetings(accessToken);
    const meetingsWithParticipantsData = await fetchParticipantsWithRateLimit(allMeetings, accessToken);
    let filteredMeetings = processMeetingData(meetingsWithParticipantsData);

    if (parsedStartDate || parsedEndDate) {
      filteredMeetings = filteredMeetings.filter(meeting => {
        if (includeMissingData !== 'false' && !meeting.actual_start) {
          return true;
        }
        
        if (meeting.actual_start) {
          const meetingDate = new Date(meeting.actual_start);
          const start = parsedStartDate || new Date(0);
          const end = parsedEndDate || new Date();
          return meetingDate >= start && meetingDate <= end;
        }
        
        return false;
      });
    }

    filteredMeetings.sort((a, b) => {
      if (a.actual_start && b.actual_start) {
        return new Date(b.actual_start) - new Date(a.actual_start);
      }
      if (a.actual_start) return -1;
      if (b.actual_start) return 1;
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