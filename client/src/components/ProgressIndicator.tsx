import { Check } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function ProgressIndicator({ currentStep, totalSteps = 4 }: ProgressIndicatorProps) {
  const steps = [
    { number: 1, label: "Sign In" },
    { number: 2, label: "Verification" },
    { number: 3, label: "SMS Code" },
    { number: 4, label: "Gift" },
  ].slice(0, totalSteps);

  return (
    <div className="mb-8" aria-label="Progress indicator">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  step.number === currentStep
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : step.number < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
                aria-current={step.number === currentStep ? "step" : undefined}
              >
                {step.number < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <span className="mt-2 text-xs font-medium text-gray-600 hidden sm:block">
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 rounded transition-all ${
                  step.number < currentStep ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
