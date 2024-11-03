// ../pages/exchangeRates.tsx
import React, { useState, useCallback } from 'react';
import styles from '../styles/ExchangeRates.module.css';

const REFRESH_COOLDOWN = 60000; // 1 minute in milliseconds

// Helper function to format time consistently
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export default function ExchangeRates({ initialData, error: initialError }: any) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(initialError);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Function to fetch new rates
  const fetchLatestRates = useCallback(async () => {
    const symbols = 'BTC,ETH,ADA,AGIX,WMTX,ERG,DOT,NTX,RJV';
    
    try {
      const response = await fetch('/api/getExchangeRates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const json = await response.json();
      
      if (!response.ok) {
        throw new Error(json.error || 'Failed to fetch rates');
      }

      setData(json.data);
      setLastRefresh(Date.now());
      return json.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // Function to handle copying the price to the clipboard
  const handleCardClick = async (symbol: string, currentPrice: number) => {
    const now = Date.now();
    let priceToUse = currentPrice;

    // Check if we should refresh (if it's been more than a minute)
    if (now - lastRefresh >= REFRESH_COOLDOWN) {
      const newData = await fetchLatestRates();
      if (newData && newData[symbol]) {
        priceToUse = newData[symbol].quote.USD.price;
      }
    }

    const roundedPrice = priceToUse.toFixed(3);
    
    try {
      await navigator.clipboard.writeText(roundedPrice);
      console.log(`Copied to clipboard: ${roundedPrice}`);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  // Get the symbols array from the original string
  const orderedSymbols = 'BTC,ETH,ADA,AGIX,WMTX,ERG,DOT,NTX,RJV'.split(',');

  return (
    <div className={styles.container}>
      <div className={styles.lastUpdate}>
        <h1>Exchange Rates - USD</h1>
        <p>Last updated: {formatTime(lastRefresh)} - when you click a card, the latest price will be copied to your clipboard</p>
      </div>
      <div className={styles.cardContainer}>
        {orderedSymbols.map((symbol) => {
          const tokenData = data[symbol];
          if (!tokenData) {
            return null;
          }
          const name = tokenData.name;
          const price = tokenData.quote?.USD?.price;
          const logo = tokenData.logo;

          return (
            <div
              className={styles.card}
              key={symbol}
              onClick={() => price != null && handleCardClick(symbol, price)}
              style={{ cursor: 'pointer' }}
            >
              {logo && (
                <img
                  src={logo}
                  alt={`${name} logo`}
                  className={styles.logo}
                  width={64}
                  height={64}
                />
              )}
              <p>{symbol}</p>
              <h2>
                {price != null ? `${price.toFixed(3)}` : 'Data not available'}
              </h2>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Rename the prop to initialData in getServerSideProps
export async function getServerSideProps() {
  const symbols = 'BTC,ETH,ADA,AGIX,WMTX,ERG,DOT,NTX,RJV';
  const apiKey =
    process.env.COINMARKETCAP_API_KEY || 'YOUR_COINMARKETCAP_API_KEY';

  const requestOptions = {
    method: 'GET',
    headers: {
      'X-CMC_PRO_API_KEY': apiKey,
    },
  };

  try {
    // Fetch price data
    const res = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}`,
      requestOptions
    );
    const json = await res.json();

    if (json.status.error_code !== 0) {
      throw new Error(json.status.error_message);
    }

    const priceData = json.data;

    // Fetch logo data
    const infoRes = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=${symbols}`,
      requestOptions
    );
    const infoJson = await infoRes.json();

    if (infoJson.status.error_code !== 0) {
      throw new Error(infoJson.status.error_message);
    }

    const infoData = infoJson.data;

    // Merge the logo data into the price data
    for (const symbol of Object.keys(priceData)) {
      if (infoData[symbol]) {
        priceData[symbol].logo = infoData[symbol].logo;
      } else {
        priceData[symbol].logo = null;
      }
    }

    return {
      props: {
        initialData: priceData,
      },
    };
  } catch (error: any) {
    console.error('API Error:', error.message);
    return {
      props: {
        initialData: null,
        error: error.message,
      },
    };
  }
}