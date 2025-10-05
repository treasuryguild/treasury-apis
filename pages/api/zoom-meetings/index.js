// pages/api/zoom-meetings/index.js
import { validateApiKey, getZoomAccessToken } from '../../../services/authService';
import { listMeetingSummaries, getMeetingParticipantsForUUID } from '../../../services/zoomService';
import { parseDate, validateDateRange, getMonthsDifference } from '../../../utils/dateHelpers';

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

    let parsedStartDate = null;
    let parsedEndDate = new Date();

    // Parse start date with better error handling
    if (startDate) {
      try {
        parsedStartDate = parseDate(startDate);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid Start Date',
          message: error.message,
          details: {
            providedValue: startDate,
            supportedFormats: ['DD.MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YY'],
            examples: ['15.03.2024', '15.03.24', '2024-03-15', '15/03/2024', '15/03/24']
          }
        });
      }
    }

    // Parse end date with better error handling
    if (endDate) {
      try {
        parsedEndDate = parseDate(endDate);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid End Date',
          message: error.message,
          details: {
            providedValue: endDate,
            supportedFormats: ['DD.MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YY'],
            examples: ['15.03.2024', '15.03.24', '2024-03-15', '15/03/2024', '15/03/24']
          }
        });
      }
    }

    // Validate date range with better error handling
    try {
      validateDateRange(parsedStartDate, parsedEndDate);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid Date Range',
        message: error.message,
        details: {
          startDate: {
            provided: startDate,
            parsed: parsedStartDate?.toISOString(),
            formatted: parsedStartDate?.toLocaleDateString()
          },
          endDate: {
            provided: endDate,
            parsed: parsedEndDate?.toISOString(),
            formatted: parsedEndDate?.toLocaleDateString()
          },
          constraints: {
            maximumRange: '10 months',
            maximumFutureDate: '1 year from today',
            supportedFormats: ['DD.MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YY']
          },
          rangeInfo: parsedStartDate && parsedEndDate ? {
            duration: `${Math.abs(getMonthsDifference(parsedStartDate, parsedEndDate))} months`,
            isValidRange: parsedEndDate >= parsedStartDate
          } : 'incomplete date range'
        }
      });
    }

    const accessToken = await getZoomAccessToken();

    // Get meeting summaries using the new function
    const meetings = await listMeetingSummaries(
      accessToken,
      parsedStartDate?.toISOString().split('T')[0], // Convert to YYYY-MM-DD
      parsedEndDate?.toISOString().split('T')[0]
    );

    // Process each meeting to add participants
    const meetingsWithParticipants = await Promise.all(
      meetings.map(async (meeting) => {
        try {
          const participants = await getMeetingParticipantsForUUID(accessToken, meeting.uuid);
          return {
            ...meeting,
            participants,
            total_participants: participants.length
          };
        } catch (error) {
          console.error(`Error fetching participants for meeting ${meeting.uuid}:`, error);
          return {
            ...meeting,
            participants: [],
            total_participants: 0
          };
        }
      })
    );

    // Sort meetings by start time (newest first)
    meetingsWithParticipants.sort((a, b) => {
      if (a.start_time && b.start_time) {
        return new Date(b.start_time) - new Date(a.start_time);
      }
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return 0;
    });

    return res.status(200).json({
      meetings: meetingsWithParticipants,
      metadata: {
        total: meetingsWithParticipants.length,
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
          totalMeetings: meetingsWithParticipants.length,
          totalParticipants: meetingsWithParticipants.reduce((sum, m) => sum + (m.total_participants || 0), 0),
          meetingsWithoutDates: meetingsWithParticipants.filter(m => !m.start_time).length,
          meetingsWithoutParticipants: meetingsWithParticipants.filter(m => !m.participants || m.participants.length === 0).length,
          dateRange: {
            earliest: meetingsWithParticipants.find(m => m.start_time)?.start_time || null,
            latest: [...meetingsWithParticipants].reverse().find(m => m.start_time)?.start_time || null
          }
        },
        dateFormatInfo: {
          supportedFormats: ['DD.MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YY'],
          examples: ['15.03.2024', '15.03.24', '2024-03-15', '15/03/2024', '15/03/24'],
          constraints: {
            maximumRange: '10 months',
            maximumFutureDate: '1 year from today',
            note: 'Dates are automatically converted to ISO format for processing'
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