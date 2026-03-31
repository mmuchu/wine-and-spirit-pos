// src/app/error.tsx
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-red-50 p-8 text-center">
      <h2 className="text-2xl font-bold text-red-700">Something went wrong!</h2>
      <p className="text-gray-600 mt-2 mb-6">{error.message}</p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold"
      >
        Try again
      </button>
    </div>
  );
}