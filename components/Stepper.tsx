"use client";

import { useCalculator } from "@/context/CalculatorContext";
import { STEPS, type StepId } from "@/context/CalculatorContext";

export default function Stepper() {
  const { currentStep, setCurrentStep } = useCalculator();

  return (
    <nav className="mb-8" aria-label="Progress">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
          const step = (i + 1) as StepId;
          const isActive = currentStep === step;
          const isPast = currentStep > step;
          return (
            <li key={step} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-600">/</span>}
              <button
                type="button"
                onClick={() => setCurrentStep(step)}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-blue-400"
                    : isPast
                      ? "text-gray-400 hover:text-gray-300"
                      : "text-gray-500 hover:text-gray-400"
                }`}
              >
                {step}. {label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
