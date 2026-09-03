"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const zoomAnimation = `
  @keyframes subtle-zoom {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.08);
    }
  }
  .animate-zoom {
    animation: subtle-zoom 2s ease-in-out infinite;
  }
`;

interface PreloaderProps {
  onComplete?: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 300);
    }
  }, [progress, onComplete]);

  if (!isVisible) return null;

  return (
    <>
      <style>{zoomAnimation}</style>
      <div
        className={`fixed inset-0 z-9999 flex items-center justify-center bg-[#0D0A1A] transition-opacity duration-300 ${
          progress >= 100 ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-8">
          {/* Logo with pulse animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#8B5CF6]/20 blur-xl animate-pulse" />
            <div className="relative h-20 w-20 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center border border-[#8B5CF6]/30">
              <Image
                src="/images/logo-icon.jpg"
                alt="MEMBO"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover animate-zoom"
                priority
              />
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center">
            <p className="font-serif text-2xl font-semibold text-white tracking-tight">
              MEMBO
            </p>
            <p className="mt-2 text-sm text-[#AAA5BA]">
              Loading your workspace...
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] rounded-full transition-all duration-100 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Percentage */}
          <p className="text-xs text-white/40 font-mono">
            {Math.round(Math.min(progress, 100))}%
          </p>
        </div>
      </div>
    </>
  );
}
