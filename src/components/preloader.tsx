"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface PreloaderProps {
  onComplete?: () => void;
  /** Minimum time the preloader stays visible (ms) */
  minDuration?: number;
}

export function Preloader({ onComplete, minDuration = 1400 }: PreloaderProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  useEffect(() => {
    if (!exiting) return;

    const exitTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 450);

    return () => clearTimeout(exitTimer);
  }, [exiting, onComplete]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-[#0B0B14]
        transition-opacity duration-450 ease-out
        ${exiting ? "opacity-0" : "opacity-100"}
      `}
    >
      <div
        className={`
          relative
          transition-all duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"}
        `}
      >
        {/* Animated logo, erases from the left, then reappears from the left, loop */}
        <div className="logo-wipe">
          <Image
            src="/images/membo-t.png"
            alt="MEMBO"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
            priority
          />
        </div>
      </div>

      <style jsx>{`
        .logo-wipe {
          animation: logoWipe 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        @keyframes logoWipe {
          /* Hold, fully visible */
          0% {
            clip-path: inset(0 0 0 0);
          }
          10% {
            clip-path: inset(0 0 0 0);
          }

          /* Erase: sweep hides the logo starting from the left edge */
          32% {
            clip-path: inset(0 0 0 100%);
          }

          /* Hold, fully hidden */
          40% {
            clip-path: inset(0 0 0 100%);
          }

          /* Setup for reveal, still hidden, but expressed from the opposite side
             so the next phase can sweep back in from the left */
          52% {
            clip-path: inset(0 100% 0 0);
          }

          /* Appear: sweep reveals the logo starting from the left edge */
          76% {
            clip-path: inset(0 0 0 0);
          }

          /* Hold, fully visible, before looping */
          100% {
            clip-path: inset(0 0 0 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .logo-wipe {
            animation: none;
            clip-path: inset(0 0 0 0);
          }
        }
      `}</style>
    </div>
  );
}
