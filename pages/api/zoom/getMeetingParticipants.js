// pages/api/zoom/getMeetingParticipants.js
import { getMeetingParticipantsForUUID } from '../../../services/zoomService';
import { validateApiKey, getZoomAccessToken } from '../../../services/authService';

/**
 * Handler for GET /api/zoom/getMeetingParticipants?uuid=<encodedUUID>
 * 
 * Responds with: { participants: Array<ParticipantObject> }
 */
export default async function handler(req, res) {
    // Only allow GET:
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    // Validate our server API key (in the "api_key" header):
    try {
        validateApiKey(req);
    } catch {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    // Read uuid from query:
    const { uuid } = req.query;
    if (typeof uuid !== 'string' || !uuid.trim()) {
        return res.status(400).json({ error: 'Missing or invalid "uuid" query parameter.' });
    }

    // Get a fresh Zoom OAuth token:
    let accessToken;
    try {
        accessToken = await getZoomAccessToken();
    } catch (err) {
        console.error('Failed to obtain Zoom access token', err);
        return res.status(500).json({ error: 'Failed to obtain Zoom access token' });
    }

    try {
        // Fetch participants for exactly this UUID:
        const participants = await getMeetingParticipantsForUUID(accessToken, uuid);
        return res.status(200).json({ participants });
    } catch (err) {
        // If axios error, it may have err.response.data
        const data = err.response?.data || { message: err.message };
        const status = err.response?.status || 500;
        return res.status(status).json({ error: data });
    }
}
