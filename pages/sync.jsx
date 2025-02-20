import { useState, useEffect } from "react";

export default function SyncPage() {
  const [filename, setFilename] = useState("");
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [message, setMessage] = useState("");

  // Use the public API key from your environment
  const API_KEY = process.env.NEXT_PUBLIC_SERVER_API_KEY;

  // Fetch available files on page load
  useEffect(() => {
    async function fetchFiles() {
      setLoadingFiles(true);
      setMessage("");

      try {
        const response = await fetch("/api/listExcelFiles", { 
          method: "GET",
          headers: { 'api_key': API_KEY }
        });
        const data = await response.json();

        if (response.ok && data.files && data.files.length) {
          setAvailableFiles(data.files);
          setFilename(data.files[0]); // Preselect first file
        } else {
          setAvailableFiles([]);
        }
      } catch (error) {
        console.error("❌ Error fetching file list:", error);
      } finally {
        setLoadingFiles(false);
      }
    }

    fetchFiles();
  }, [API_KEY]);

  const handleSync = async (recentOnly = false) => {
    if (!filename) {
      setMessage("⚠️ Please select a file before syncing.");
      return;
    }

    recentOnly ? setLoadingRecent(true) : setLoadingSync(true);
    setMessage("");

    try {
      const endpoint = recentOnly ? "/api/updateRecentRecognitions" : "/api/syncRecognitions";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'api_key': API_KEY
        },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${recentOnly ? "Recent" : "All"} recognitions synced successfully! Records updated: ${data.records}`);
      } else {
        setMessage(`❌ Error: ${data.error || "Failed to sync"}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      recentOnly ? setLoadingRecent(false) : setLoadingSync(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Sync Recognitions</h1>

        {loadingFiles ? (
          <p className="text-gray-600 mb-4">🔄 Fetching available files...</p>
        ) : availableFiles.length > 0 ? (
          <>
            <p className="text-gray-600 mb-2">Select a file to sync:</p>
            <select 
              value={filename} 
              onChange={(e) => setFilename(e.target.value)}
              className="p-2 border rounded-md mb-4"
            >
              {availableFiles.map(file => (
                <option key={file} value={file}>{file}</option>
              ))}
            </select>
          </>
        ) : (
          <p className="text-gray-600 mb-4">⚠️ No Excel files available.</p>
        )}

        <button onClick={() => handleSync()} className="px-6 py-3 bg-blue-500 text-white rounded-md mr-2" disabled={loadingSync}>
          {loadingSync ? "Syncing All..." : "Sync All Recognitions"}
        </button>

        <button onClick={() => handleSync(true)} className="px-6 py-3 bg-green-500 text-white rounded-md" disabled={loadingRecent}>
          {loadingRecent ? "Syncing Recent..." : "Sync Last 1000"}
        </button>

        {message && <p className="mt-4 text-lg">{message}</p>}
      </div>
    </div>
  );
}
