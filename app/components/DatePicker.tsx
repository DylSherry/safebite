"use client";

import React, { useEffect, useRef, useState } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function parseValue(value: string): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { y: parts[0], m: parts[1] - 1, d: parts[2] };
}

function toValue(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(value: string) {
  const p = parseValue(value);
  if (!p) return "";
  return new Date(p.y, p.m, p.d).toLocaleDateString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, label, placeholder = "Pick a date" }: Props) {
  const today = new Date();
  const parsed = parseValue(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.getMonth());
  const [pickingYear, setPickingYear] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync view when value is set externally
  useEffect(() => {
    if (parsed) { setViewYear(parsed.y); setViewMonth(parsed.m); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (d: number) => {
    onChange(toValue(viewYear, viewMonth, d));
    setOpen(false);
    setPickingYear(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Year grid: show a window of 12 years centred around viewYear
  const yearStart = Math.floor(viewYear / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">{label}</label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setPickingYear(false); }}
        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors min-w-36
          ${open ? "border-emerald-500 ring-2 ring-emerald-500 bg-emerald-800" : "border-emerald-700 bg-emerald-800 hover:border-emerald-600"}
          ${value ? "text-white" : "text-emerald-500"}`}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={clearDate}
              className="text-emerald-500 hover:text-red-400 transition-colors leading-none text-base"
              role="button"
              aria-label="Clear date"
            >
              ×
            </span>
          )}
          {/* Calendar icon */}
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 w-72 rounded-2xl border border-emerald-700 bg-emerald-950 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-800">
            {pickingYear ? (
              <>
                <button
                  type="button"
                  onClick={() => setPickingYear(false)}
                  className="text-xs text-emerald-400 hover:text-white transition-colors"
                >
                  ← Back
                </button>
                <span className="text-sm font-semibold text-white">
                  {yearStart}–{yearStart + 11}
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setViewYear((y) => y - 12)} className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-800 hover:text-white transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button type="button" onClick={() => setViewYear((y) => y + 12)} className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-800 hover:text-white transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={prevMonth} className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-800 hover:text-white transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setPickingYear(true)}
                  className="text-sm font-semibold text-white hover:text-emerald-300 transition-colors"
                >
                  {MONTHS[viewMonth]} {viewYear}
                </button>
                <button type="button" onClick={nextMonth} className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-800 hover:text-white transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            )}
          </div>

          {/* Year grid */}
          {pickingYear && (
            <div className="grid grid-cols-4 gap-1 p-3">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setPickingYear(false); }}
                  className={`rounded-lg py-1.5 text-sm font-medium transition-colors
                    ${y === viewYear ? "bg-emerald-600 text-white" : "text-emerald-300 hover:bg-emerald-800 hover:text-white"}
                    ${y === today.getFullYear() && y !== viewYear ? "ring-1 ring-emerald-600" : ""}`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Day grid */}
          {!pickingYear && (
            <div className="p-3">
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <span key={d} className="text-center text-xs font-semibold text-emerald-500 py-1">{d}</span>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, i) => {
                  if (!day) return <span key={i} />;
                  const isSelected = parsed?.y === viewYear && parsed?.m === viewMonth && parsed?.d === day;
                  const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`rounded-lg py-1.5 text-sm font-medium transition-colors
                        ${isSelected ? "bg-emerald-600 text-white font-bold" : isToday ? "ring-1 ring-emerald-500 text-emerald-300 hover:bg-emerald-800" : "text-emerald-200 hover:bg-emerald-800 hover:text-white"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-emerald-800 px-4 py-2 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                setViewYear(t.getFullYear());
                setViewMonth(t.getMonth());
                selectDay(t.getDate());
              }}
              className="text-xs text-emerald-400 hover:text-white transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-emerald-400 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
