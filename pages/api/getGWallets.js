// ../pages/api/getGWallets.js
import axios from 'axios';

export default async function handler(req, res) {
  const SHEET_ID = process.env.GOOGLE_SHEET;
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SERVER_API_KEY = process.env.SERVER_API_KEY;
  const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/'Form responses 1'?key=${API_KEY}`;

  const apiKeyHeader = req.headers['api_key'];

  if (!apiKeyHeader || apiKeyHeader !== SERVER_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const response = await axios.get(API_URL);
    const data = response.data.values;

    if (data && data.length > 0) {
      const timestampIndex = data[0].indexOf("Timestamp");
      const discordHandleIndex = data[0].indexOf("Discord handle");
      const walletAddressIndex = data[0].indexOf("Wallet Address");
      const githubNameIndex = 5; // Column F is index 5 (0-based)

      const formattedData = data.slice(1)
        .map(row => ({
          Timestamp: row[timestampIndex],
          DiscordHandle: row[discordHandleIndex] ? row[discordHandleIndex].trim() : null,
          WalletAddress: row[walletAddressIndex] ? row[walletAddressIndex].trim() : null,
          GitHubName: row[githubNameIndex] ? row[githubNameIndex].trim() : null
        }))
        .filter(entry =>
          entry.DiscordHandle &&
          entry.WalletAddress &&
          entry.WalletAddress.startsWith("addr") &&
          entry.WalletAddress.length >= 55
        )
        .map(entry => {
          const parts = entry.WalletAddress.split(" ");
          entry.WalletAddress = parts[0];
          return entry;
        });

      if (formattedData.length > 0) {
        res.status(200).json(formattedData);
      } else {
        res.status(404).json({ error: 'No valid data found' });
      }
    } else {
      res.status(404).json({ error: 'No data found' });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
