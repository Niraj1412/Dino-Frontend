"use client";

import { useEffect, useState } from "react";

const TOGGLE_STORAGE_KEY = "dino-stream-perf-overlay";

function readStoredToggleState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(TOGGLE_STORAGE_KEY) === "1";
}

export function PerfOverlay() {
  const [enabled, setEnabled] = useState(readStoredToggleState);
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const [longTasks, setLongTasks] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.altKey && event.key.toLowerCase() === "p")) {
        return;
      }

      setEnabled((previous) => {
        const next = !previous;
        window.localStorage.setItem(TOGGLE_STORAGE_KEY, next ? "1" : "0");
        return next;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let rafId = 0;
    let frameCount = 0;
    let lastFrameTime = performance.now();
    let sampleStart = lastFrameTime;
    let frameTotal = 0;

    const tick = (now: number) => {
      frameCount += 1;
      const delta = now - lastFrameTime;
      frameTotal += delta;
      lastFrameTime = now;

      const elapsed = now - sampleStart;
      if (elapsed >= 1000) {
        const sampledFps = (frameCount / elapsed) * 1000;
        const sampledFrameMs = frameTotal / frameCount;
        setFps(Math.round(sampledFps));
        setFrameMs(Number(sampledFrameMs.toFixed(1)));

        frameCount = 0;
        frameTotal = 0;
        sampleStart = now;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !("PerformanceObserver" in window)) {
      return;
    }

    const observer = new PerformanceObserver((entries) => {
      setLongTasks((currentValue) => currentValue + entries.getEntries().length);
    });

    try {
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      observer.disconnect();
    }

    return () => observer.disconnect();
  }, [enabled]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[120]">
      <button
        type="button"
        onClick={() => {
          setEnabled((currentValue) => {
            const next = !currentValue;
            window.localStorage.setItem(TOGGLE_STORAGE_KEY, next ? "1" : "0");
            return next;
          });
        }}
        aria-label="Toggle performance overlay"
        className="pointer-events-auto mb-2 rounded-full border border-slate-100/20 bg-black/60 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-slate-100 backdrop-blur"
      >
        Perf
      </button>
      {enabled ? (
        <div className="rounded-2xl border border-slate-100/20 bg-black/70 px-3 py-2 text-[0.7rem] text-slate-100 backdrop-blur">
          <p>FPS: {fps || "--"}</p>
          <p>Frame: {frameMs || "--"}ms</p>
          <p>Long tasks: {longTasks}</p>
          <p className="mt-1 text-slate-300">Toggle: Alt + P</p>
        </div>
      ) : null}
    </div>
  );
}
