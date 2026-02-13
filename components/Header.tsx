"use client";

import Link from "next/link";
import { useCalculator } from "@/context/CalculatorContext";

export default function Header() {
  const { loadSampleData } = useCalculator();

  return (
    <header className="flex items-center justify-between gap-4 mb-8 flex-wrap">
      <div className="flex items-center gap-4">
        <Link
          href="#"
          className="text-gray-400 hover:text-white transition-colors p-1 rounded"
          aria-label="Back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">PRIME Calculator</h1>
          <p className="text-sm text-gray-400">Protected Retirement Income Made Easy</p>
        </div>
      </div>
      <button
        type="button"
        onClick={loadSampleData}
        className="text-xs px-3 py-1.5 rounded border border-amber-600/60 text-amber-400 hover:bg-amber-500/10 transition-colors"
        title="Pre-fill form with sample data for testing"
      >
        Dev: Pre-fill test data
      </button>
    </header>
  );
}
