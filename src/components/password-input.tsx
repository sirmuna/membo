"use client";

import { useState } from "react";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  showStrengthIndicator?: boolean;
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
}

interface PasswordStrength {
  hasLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "••••••••",
  required = false,
  minLength = 8,
  showStrengthIndicator = false,
  autoComplete = "current-password",
  className = "",
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const strength: PasswordStrength = {
    hasLength: value.length >= minLength,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(value),
  };

  const strengthCount = Object.values(strength).filter(Boolean).length;
  const strengthPercent = (strengthCount / 5) * 100;

  const getStrengthColor = () => {
    if (strengthCount <= 1) return "bg-red-500";
    if (strengthCount <= 2) return "bg-orange-500";
    if (strengthCount <= 3) return "bg-yellow-500";
    if (strengthCount <= 4) return "bg-[#8B5CF6]";
    return "bg-[#6D28D9]";
  };

  const getStrengthText = () => {
    if (strengthCount <= 1) return "Weak";
    if (strengthCount <= 2) return "Fair";
    if (strengthCount <= 3) return "Good";
    if (strengthCount <= 4) return "Strong";
    return "Very Strong";
  };

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-12 text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
          placeholder={placeholder}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>

      {showStrengthIndicator && value.length > 0 && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                style={{ width: `${strengthPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium text-white/70">
              {getStrengthText()}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <RequirementBadge
              met={strength.hasLength}
              text={`${minLength}+ chars`}
            />
            <RequirementBadge met={strength.hasUppercase} text="Uppercase" />
            <RequirementBadge met={strength.hasLowercase} text="Lowercase" />
            <RequirementBadge met={strength.hasNumber} text="Number" />
            <RequirementBadge met={strength.hasSpecial} text="Special" />
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementBadge({ met, text }: { met: boolean; text: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
        met
          ? "bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30"
          : "bg-white/5 text-white/40 border border-white/10"
      }`}
    >
      {met && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1.5 h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      {text}
    </span>
  );
}
