"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface PreloaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function Preloader({ onComplete, minDuration = 1600 }: PreloaderProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), minDuration);
    return () => clearTimeout(timer);
  }, [minDuration]);

  useEffect(() => {
    if (!exiting) return;
    const exitTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 500);
    return () => clearTimeout(exitTimer);
  }, [exiting, onComplete]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`
        fixed inset-0 z-100 flex items-center justify-center
        bg-[#0B0B14]
        transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${exiting ? "opacity-0" : "opacity-100"}
      `}
    >
      {/* Soft ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.18)_0%,transparent_58%)]"
      />

      <div
        className={`
          relative
          transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${exiting ? "scale-[0.93] opacity-0" : "scale-100 opacity-100"}
        `}
      >
        <div className="logo-mask">
          <Image
            src="/images/membo-t.svg"
            alt="MEMBO"
            width={72}
            height={65}
            className="h-16.25 w-18 object-contain"
            priority
          />
        </div>
      </div>

      <style jsx>{`
        .logo-mask {
          animation: logoReveal 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
          will-change: clip-path, opacity, transform;
        }

        @keyframes logoReveal {
          /* Fully visible */
          0% {
            clip-path: inset(0 0 0 0);
            opacity: 1;
            transform: scale(1);
          }

          /* Hold */
          20% {
            clip-path: inset(0 0 0 0);
            opacity: 1;
            transform: scale(1);
          }

          /* Erase from left */
          42% {
            clip-path: inset(0 0 0 100%);
            opacity: 0.6;
            transform: scale(0.97);
          }

          /* Fully hidden */
          50% {
            clip-path: inset(0 0 0 100%);
            opacity: 0;
            transform: scale(0.95);
          }

          /* Reset (still hidden, ready to reveal from left) */
          52% {
            clip-path: inset(0 100% 0 0);
            opacity: 0;
            transform: scale(0.95);
          }

          /* Reveal from left */
          78% {
            clip-path: inset(0 0 0 0);
            opacity: 1;
            transform: scale(1);
          }

          /* Settle */
          100% {
            clip-path: inset(0 0 0 0);
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .logo-mask {
            animation: none;
            clip-path: inset(0 0 0 0);
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
