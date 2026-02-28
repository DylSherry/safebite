"use client";
import React, { useState, useRef, useMemo } from "react";
import { useUserProfile } from "@/app/hooks/useUserProfile";

/** Case-insensitive check: does a detected allergen string overlap with a profile allergy string? */
function allergensMatch(detected: string, profileAllergy: string): boolean {
  const d = detected.toLowerCase();
  const p = profileAllergy.toLowerCase();
  return d === p || d.includes(p) || p.includes(d);
}

export default function ScanAllergens() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { profile } = useUserProfile();

  /** All allergens the user has saved in their profile */
  const userAllergens: string[] = useMemo(() => {
    if (!profile) return [];
    const top = profile.allergies ?? [];
    const dietary = profile.dietary?.allergies ?? [];
    return [...new Set([...top, ...dietary])];
  }, [profile]);

  /** Which detected allergens match the user's profile — triggers a personal warning */
  const dangerousForUser: string[] = useMemo(() => {
    if (!result?.allergensFound?.length || !userAllergens.length) return [];
    return (result.allergensFound as string[]).filter((detected) =>
      userAllergens.some((pa) => allergensMatch(detected, pa))
    );
  }, [result, userAllergens]);

  const applyFile = (f: File) => {
    setResult(null);
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) applyFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) applyFile(e.dataTransfer.files[0]);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
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
    <div className="w-full max-w-xl flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Allergen Scanner</h1>
        <p className="text-emerald-200 text-sm leading-relaxed">
          Upload a photo of an ingredient label and we'll identify allergens using AI.
        </p>
      </div>

      {/* Upload area — hidden once results are shown */}
      {!result && (
      <div
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          dragging ? "border-emerald-400 bg-emerald-800" : "border-emerald-600 bg-emerald-900 hover:border-emerald-400"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {preview && !result ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="max-h-48 rounded-xl object-contain mb-4" />
        ) : !result ? (
          <svg className="w-12 h-12 text-emerald-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5V19a2 2 0 002 2h14a2 2 0 002-2v-2.5M16 10l-4-4m0 0L8 10m4-4v12" />
          </svg>
        ) : null}
        {!result && (
          <p className="text-emerald-200 text-sm">
            {file ? file.name : "Drag & drop or click to upload an ingredient label"}
          </p>
        )}
        {file && !result && (
          <p className="text-emerald-300 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
        )}
      </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleScan}
          disabled={!file || loading}
          className="flex-1 px-6 py-3 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Scanning...
            </>
          ) : (
            "Scan for Allergens"
          )}
        </button>
        {(file || result) && (
          <button
            onClick={handleReset}
            className="px-5 py-3 rounded-full border border-emerald-500 text-emerald-200 hover:bg-emerald-800 hover:border-emerald-400 active:bg-emerald-700 transition-colors text-sm font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-900/50 border border-red-700 p-5 text-red-200 text-sm">
          <strong className="block mb-1">Error</strong>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-5">
          {/* ── Personal safety verdict ── */}
          {profile && userAllergens.length > 0 ? (
            dangerousForUser.length > 0 ? (
              <div className="rounded-2xl p-5 border border-orange-600 bg-orange-900/40">
                <h3 className="font-semibold text-orange-200 text-lg mb-2">⚠ Unsafe for You</h3>
                <p className="text-orange-300 text-sm mb-3">
                  This product contains allergens that match your profile:
                </p>
                <div className="flex flex-wrap gap-2">
                  {dangerousForUser.map((al, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-orange-800 text-orange-100 px-3 py-1 text-sm font-semibold">
                      {al}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-5 border border-green-600 bg-green-900/40">
                <h3 className="font-semibold text-green-200 text-lg mb-1">✓ Safe for You</h3>
                <p className="text-green-300 text-sm">
                  None of the detected allergens match your profile allergens.
                </p>
              </div>
            )
          ) : profile && userAllergens.length === 0 ? (
            <div className="rounded-2xl p-5 border border-emerald-700 bg-emerald-900/40">
              <p className="text-emerald-300 text-sm">
                <span className="font-semibold text-emerald-200">No allergens saved in your profile.</span>{" "}
                Add your allergens in{" "}
                <a href="/profile" className="underline hover:text-emerald-100">Profile Settings</a>{" "}
                to get a personal safety check.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl p-5 border border-emerald-700 bg-emerald-900/40">
              <p className="text-emerald-300 text-sm">
                <a href="/login" className="underline hover:text-emerald-100">Sign in</a>{" "}
                and save your allergens in your profile to get a personal safety check.
              </p>
            </div>
          )}
          <div className={`rounded-2xl p-6 border ${
            result.allergensFound && result.allergensFound.length > 0
              ? "bg-red-900/40 border-red-700"
              : "bg-green-900/40 border-green-700"
          }`}>
            <h3 className={`font-semibold text-lg mb-4 ${
              result.allergensFound && result.allergensFound.length > 0 ? "text-red-200" : "text-green-200"
            }`}>
              {result.allergensFound && result.allergensFound.length > 0 ? "⚠ Allergens Detected" : "✓ No Allergens Found"}
            </h3>
            {result.allergensFound && result.allergensFound.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.allergensFound.map((al: string, i: number) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-red-800 text-red-100 px-3 py-1 text-sm font-medium">
                    {al}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ingredients list */}
          {result.ingredients && result.ingredients.length > 0 && (
            <div className="rounded-2xl bg-emerald-900 border border-emerald-700 p-6">
              <h3 className="font-semibold text-white mb-4">Ingredients ({result.ingredients.length})</h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-emerald-100">
                {result.ingredients.map((ing: string, i: number) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-emerald-500 mt-0.5">•</span> {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw fallback */}
          {result.raw && (
            <div className="rounded-2xl bg-emerald-900 border border-emerald-700 p-6">
              <h3 className="font-semibold text-white mb-3">AI Response</h3>
              <pre className="text-emerald-100 text-sm whitespace-pre-wrap">{result.raw}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}