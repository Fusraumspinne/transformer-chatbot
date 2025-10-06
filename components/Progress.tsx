"use client"

import React from 'react';

function formatBytes(size: number) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return +((size / Math.pow(1024, i)).toFixed(2)) + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

export default function Progress({ text, percentage = 0, total }: { text: string; percentage?: number; total?: number }) {
  return (
    <div className="w-full bg-gray-900 text-left border border-blue-950 rounded-4xl overflow-hidden mb-0.5 text-gray-200">
      <div className="bg-blue-950 whitespace-nowrap px-1 text-sm" style={{ width: `${percentage}%` }}>
        {text} ({percentage.toFixed(2)}%{isNaN(total as number) ? '' : ` of ${formatBytes(total as number)}`})
      </div>
    </div>
  );
}