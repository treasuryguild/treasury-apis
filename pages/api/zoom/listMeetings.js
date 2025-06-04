// pages/api/zoom/listMeetings.js
import { listMeetingSummaries } from '../../../services/zoomService';
import { validateApiKey, getZoomAccessToken } from '../../../services/authService';

/**
 * Helper: Convert “dd.mm.yy” to “YYYY-MM-DD”.
 * Assumes all dates are in the 2000s (e.g. “25.06.21” → “2021-06-25”).
 */
function parseDdMmYy(dateStr) {
  const [dd, mm, yy] = dateStr.split('.');
  if (!dd || !mm || !yy) return null;
  // If yy is “21” → 20 + “21” = “2021”
  const fullYear = parseInt(yy, 10) + 2000;
  return `${fullYear.toString().padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export default async function handler(req, res) {
  // 1) Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  // 2) Validate our server API key (“api_key” header)
  try {
    validateApiKey(req);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // 3) Exchange our Zoom credentials for an access token
  let accessToken;
  try {
    accessToken = await getZoomAccessToken();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to obtain Zoom access token' });
  }

  // 4) Read and convert startDate/endDate from query string (dd.mm.yy)
  //    e.g. /api/zoom/listMeetings?startDate=01.05.25&endDate=31.05.25
  const { startDate, endDate } = req.query;
  let fromDate, toDate;

  if (typeof startDate === 'string') {
    const parsed = parseDdMmYy(startDate);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid startDate format. Use dd.mm.yy' });
    }
    fromDate = parsed; // “YYYY-MM-DD”
  }
  if (typeof endDate === 'string') {
    const parsed = parseDdMmYy(endDate);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid endDate format. Use dd.mm.yy' });
    }
    toDate = parsed; // “YYYY-MM-DD”
  }

  try {
    // 5) Fetch all past meeting‐reports within [fromDate, toDate]
    const meetings = await listMeetingSummaries(accessToken, fromDate, toDate);

    // 6) Return the full array
    return res.status(200).json({ meetings });
  } catch (err) {
    const data = err.response?.data || { message: err.message };
    const status = err.response?.status || 500;
    return res.status(status).json({ error: data });
  }
}
