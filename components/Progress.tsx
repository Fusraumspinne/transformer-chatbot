"use client"

import React from 'react';

function formatBytes(size: number) {
  if (size === 0) return "0 B";
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  const index = Math.min(i, units.length - 1);
  return +((size / Math.pow(1024, index)).toFixed(2)) + ' ' + units[index];
}

export default function Progress({ text, percentage = 0, total }: { text: string; percentage?: number; total?: number }) {
  const displayTotal = typeof total === "number" && !isNaN(total) ? ` of ${formatBytes(total)}` : "";
  return (
    <div className="w-full bg-gray-900 text-left border border-blue-950 rounded-4xl overflow-hidden mb-0.5 text-gray-200">
      <div className="bg-blue-950 whitespace-nowrap px-1 text-sm" style={{ width: `${percentage}%` }}>
        {text} ({percentage.toFixed(2)}%{displayTotal})
      </div>
    </div>
  );
}