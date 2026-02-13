"use client";

import { useCalculator } from "@/context/CalculatorContext";
import type { StepId } from "@/context/CalculatorContext";
import Header from "@/components/Header";
import Stepper from "@/components/Stepper";
import SelectClient from "@/components/SelectClient";
import ClientSection from "@/components/ClientSection";
import IncomeSection from "@/components/IncomeSection";
import GuaranteedIncomeSection from "@/components/GuaranteedIncomeSection";
import AccountsSection from "@/components/AccountsSection";
import CurrentIncomeSummary from "@/components/CurrentIncomeSummary";
import AnnuityPrimeSection from "@/components/AnnuityPrimeSection";
import ComparisonGraph from "@/components/ComparisonGraph";

function StepContent({ step }: { step: StepId }) {
  switch (step) {
    case 1:
      return (
        <>
          <SelectClient />
          <ClientSection />
        </>
      );
    case 2:
      return <IncomeSection />;
    case 3:
      return <GuaranteedIncomeSection />;
    case 4:
      return <AccountsSection />;
    case 5:
      return <CurrentIncomeSummary />;
    case 6:
      return <AnnuityPrimeSection />;
    case 7:
      return <ComparisonGraph />;
    default:
      return null;
  }
}

function StepNav({ currentStep }: { currentStep: StepId }) {
  const { setCurrentStep } = useCalculator();
  const isFirst = currentStep === 1;
  const isLast = currentStep === 7;
  const prev: StepId = (currentStep - 1) as StepId;
  const next: StepId = (currentStep + 1) as StepId;

  return (
    <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
      <button
        type="button"
        onClick={() => setCurrentStep(prev)}
        disabled={isFirst}
        className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Back
      </button>
      <button
        type="button"
        onClick={() => setCurrentStep(next)}
        disabled={isLast}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

export default function PrimeCalculatorPage() {
  const { currentStep } = useCalculator();

  return (
    <main className="min-h-screen bg-black text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Header />
        <Stepper />
        <StepContent step={currentStep} />
        <StepNav currentStep={currentStep} />
      </div>
    </main>
  );
}
