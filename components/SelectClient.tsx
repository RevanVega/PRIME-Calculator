"use client";

import { useCalculator } from "@/context/CalculatorContext";

export default function SelectClient() {
  const { selectedClientId, setSelectedClientId } = useCalculator();

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-1">Select client (optional)</h2>
      <p className="text-sm text-gray-400 mb-3">Choose a client to pre-fill from X-Ray data.</p>
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={selectedClientId ?? ""}
          onChange={(e) => setSelectedClientId(e.target.value || null)}
          className="flex-1 min-w-[200px] max-w-md bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose a client or add new</option>
          <option value="mock1">Mock Client 1</option>
          <option value="mock2">Mock Client 2</option>
        </select>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add new client
        </button>
      </div>
    </section>
  );
}
