"use client";

import { useCalculator } from "@/context/CalculatorContext";
import { STEPS, type StepId } from "@/context/CalculatorContext";

const INPUT_STEPS = [1, 2, 3, 4, 5] as const;
const DELIVERABLE_STEPS = [6, 7, 8] as const;

function StepButton({
  step,
  label,
  isActive,
  isPast,
  onClick,
  showSeparator,
}: {
  step: StepId;
  label: string;
  isActive: boolean;
  isPast: boolean;
  onClick: () => void;
  showSeparator: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      {showSeparator && <span className="text-gray-600">/</span>}
      <button
        type="button"
        onClick={onClick}
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
}

export default function Stepper() {
  const { currentStep, setCurrentStep } = useCalculator();

  return (
    <nav className="mb-8" aria-label="Progress">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs uppercase tracking-wider text-gray-500 mr-2">Inputs</span>
          <ol className="flex flex-wrap gap-x-2 gap-y-1">
            {INPUT_STEPS.map((step, i) => (
              <StepButton
                key={step}
                step={step}
                label={STEPS[step - 1]}
                isActive={currentStep === step}
                isPast={currentStep > step}
                onClick={() => setCurrentStep(step)}
                showSeparator={i > 0}
              />
            ))}
          </ol>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs uppercase tracking-wider text-gray-500 mr-2">Deliverables</span>
          <ol className="flex flex-wrap gap-x-2 gap-y-1">
            {DELIVERABLE_STEPS.map((step, i) => (
              <StepButton
                key={step}
                step={step}
                label={STEPS[step - 1]}
                isActive={currentStep === step}
                isPast={currentStep > step}
                onClick={() => setCurrentStep(step)}
                showSeparator={i > 0}
              />
            ))}
          </ol>
        </div>
      </div>
    </nav>
  );
}
