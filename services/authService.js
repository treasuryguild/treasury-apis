// services/authService.js
import axios from 'axios';

export const validateApiKey = (req) => {
  const apiKey = req.headers['api-key'];
  const validApiKey = process.env.SERVER_API_KEY;
  
  if (!apiKey || apiKey !== validApiKey) {
    throw new Error('Invalid API key');
  }
};

export const getZoomAccessToken = async () => {
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