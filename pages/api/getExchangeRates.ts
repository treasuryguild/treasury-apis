import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const symbols = 'BTC,ETH,ADA,AGIX,WMTX,ERG,DOT,NTX,RJV';
  const apiKey = process.env.COINMARKETCAP_API_KEY;

  try {
    // Fetch price data
    const priceRes = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}`,
      {
        method: 'GET',
        headers: {
          'X-CMC_PRO_API_KEY': apiKey!,
        },
      }
    );
    const priceJson = await priceRes.json();

    if (priceJson.status.error_code !== 0) {
      throw new Error(priceJson.status.error_message);
    }

    // Fetch logo data
    const infoRes = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=${symbols}`,
      {
        method: 'GET',
        headers: {
          'X-CMC_PRO_API_KEY': apiKey!,
        },
      }
    );
    const infoJson = await infoRes.json();

    if (infoJson.status.error_code !== 0) {
      throw new Error(infoJson.status.error_message);
    }

    // Merge the logo data into the price data
    const priceData = priceJson.data;
    const infoData = infoJson.data;

    for (const symbol of Object.keys(priceData)) {
      if (infoData[symbol]) {
        priceData[symbol].logo = infoData[symbol].logo;
      } else {
        priceData[symbol].logo = null;
      }
    }

    res.status(200).json({ data: priceData });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}