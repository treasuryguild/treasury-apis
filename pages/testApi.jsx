import { useState } from "react";

export default function TestApiPage() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const API_KEY = process.env.NEXT_PUBLIC_SERVER_API_KEY;

  const fetchData = async (query = "") => {
    setMessage("Fetching data...");
    try {
      const response = await fetch(`/api/recognitions${query ? `?${query}` : ""}`, { 
        method: "GET",
        headers: { 'api_key': API_KEY }
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setMessage(`✅ Fetched ${result.count} records.`);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const fetchLabels = async (query = "") => {
    setMessage("Fetching labels...");
    try {
      const response = await fetch(`/api/treasury_labels${query ? `?${query}` : ""}`, {
        method: "GET",
        headers: { 'api_key': API_KEY }
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setMessage(`✅ Fetched ${result.count} labels.`);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const formatAsDottedDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const postData = async () => {
    setMessage("Posting data...");
    try {
      const today = new Date();
      const formattedDate = formatAsDottedDate(today);

      const payload = {
        records: [
          {
            recognition_id: 0, 
            task_id: 1011, 
            date_completed: formattedDate, 
            insert_date: formattedDate,
            wallet_owner: "TestUser",
            ada: Math.floor(Math.random() * 100),
          },
        ],
      };

      console.log("📤 Sending payload:", payload);

      const response = await fetch("/api/recognitions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'api_key': API_KEY
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("📥 Response received:", result);

      if (result.success) {
        setMessage("✅ Data posted successfully!");
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const postLabels = async () => {
    setMessage("Posting labels...");
    try {
      // For testing, we use a comma-separated string of labels.
      // Running this multiple times should trigger a duplicate error on subsequent posts.
      const payload = {
        labels: "TestLabel1, TestLabel2"
      };

      console.log("📤 Sending label payload:", payload);

      const response = await fetch("/api/treasury_labels", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'api_key': API_KEY
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("📥 Label response received:", result);

      if (result.success) {
        setMessage("✅ Labels posted successfully!");
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Test API Requests</h1>

      {/* ExcelData API Testing Buttons */}
      <div className="space-x-4 mb-4">
        <button onClick={() => fetchData()} className="px-6 py-3 bg-blue-500 text-white rounded-md">
          Fetch All Data (GET)
        </button>
        <button onClick={() => fetchData("limit=5")} className="px-6 py-3 bg-indigo-500 text-white rounded-md">
          Fetch 5 Records
        </button>
        <button onClick={() => fetchData("wallet_owner=TestUser")} className="px-6 py-3 bg-purple-500 text-white rounded-md">
          Fetch by Wallet Owner
        </button>
        <button onClick={() => fetchData("start_date=01.01.2024&end_date=01.02.2024")} className="px-6 py-3 bg-teal-500 text-white rounded-md">
          Fetch by Date Range
        </button>
      </div>

      <div className="space-x-4 mb-4">
        <button onClick={postData} className="px-6 py-3 bg-green-500 text-white rounded-md">
          Post Test Data (POST)
        </button>
      </div>

      {/* External Labels API Testing Buttons */}
      <h2 className="text-xl font-bold mt-8 mb-4">Test External Labels API</h2>
      <div className="space-x-4 mb-4">
        <button onClick={() => fetchLabels()} className="px-6 py-3 bg-blue-500 text-white rounded-md">
          Fetch All Labels (GET)
        </button>
        <button onClick={postLabels} className="px-6 py-3 bg-green-500 text-white rounded-md">
          Post Test Labels (POST)
        </button>
      </div>

      {/* Response Messages */}
      {message && <p className="text-lg mt-4">{message}</p>}

      {/* Display Data */}
      {data && (
        <div className="mt-6 bg-white p-4 rounded-md shadow-md w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-2">Fetched Data:</h2>
          <pre className="text-sm bg-gray-200 p-2 rounded">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
