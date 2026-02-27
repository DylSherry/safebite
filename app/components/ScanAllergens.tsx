"use client";
import React, { useState } from "react";

export default function ScanAllergens() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/scan-allergens", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 24, borderRadius: 8, maxWidth: 400, margin: "24px auto" }}>
      <h2>Scan for Allergens</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleScan} disabled={!file || loading} style={{ marginLeft: 8 }}>
        {loading ? "Scanning..." : "Scan"}
      </button>
      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <h4>Scan Result:</h4>
          {result.ingredients && (
            <div>
              <strong>Ingredients:</strong>
              <ul>
                {result.ingredients.map((ing: string, i: number) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            </div>
          )}
          {result.allergensFound && (
            <div>
              <strong>Allergens Found:</strong>
              <ul>
                {result.allergensFound.map((al: string, i: number) => (
                  <li key={i}>{al}</li>
                ))}
              </ul>
            </div>
          )}
          {result.raw && (
            <div>
              <strong>Raw Output:</strong>
              <pre style={{ whiteSpace: "pre-wrap" }}>{result.raw}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}