'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [appName] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('app_software_name');
        if (stored) return stored;
      }
    } catch {}
    return 'United Link Group';
  });
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col space-y-8">
        <h1 className="text-4xl font-bold text-indigo-900">{appName}</h1>
        <p className="text-xl text-gray-600">Workforce Management SaaS</p>
        
        <div className="flex space-x-4">
          <Link href="/login" className="px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
