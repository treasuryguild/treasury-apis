// netlify/functions/scheduled-sync.js
const axios = require('axios');

const handler = async (event, context) => {
  console.log('Function started', new Date().toISOString());
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('URL:', process.env.URL);

  try {
    // Use http://localhost:3000 for the Next.js API route
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.URL;
    const apiUrl = `${baseUrl}/api/sync-sheets`;
    
    console.log('Attempting to call:', apiUrl);

    try {
      const response = await axios({
        method: 'post',
        url: apiUrl,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: false 
      });

      console.log('Raw response:', {
        status: response.status,
        data: response.data
      });

      if (response.status >= 400) {
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Sync completed successfully",
          data: response.data
        })
      };

    } catch (requestError) {
      console.error('Request error:', {
        message: requestError.message,
        code: requestError.code,
        response: requestError.response?.data
      });
      throw requestError;
    }

  } catch (error) {
    console.error('Handler error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message,
        error: error.toString()
      })
    };
  }
};

exports.handler = handler;