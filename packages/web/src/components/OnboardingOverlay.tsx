import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ButterflyIcon } from "./ButterflyIcon";
import { CATEGORY_COLORS } from "@greggie/core";

// ── Category grid (from Master Design CATEGORIES) ──
const CATEGORIES = [
  { key: "Tech", icon: "💻", color: CATEGORY_COLORS.Tech },
  { key: "Fashion", icon: "👗", color: CATEGORY_COLORS.Fashion },
  { key: "Collectibles", icon: "🃏", color: CATEGORY_COLORS.Collectibles },
  { key: "Beauty", icon: "💄", color: CATEGORY_COLORS.Beauty },
  { key: "Food", icon: "🍜", color: CATEGORY_COLORS.Food },
  { key: "Art", icon: "🎨", color: CATEGORY_COLORS.Art },
  { key: "Fitness", icon: "💪", color: CATEGORY_COLORS.Fitness },
  { key: "Automotive", icon: "🏎️", color: CATEGORY_COLORS.Automotive },
  { key: "Home", icon: "🏡", color: CATEGORY_COLORS.Home },
  { key: "Luxury", icon: "💎", color: CATEGORY_COLORS.Luxury },
  { key: "Pets", icon: "🐾", color: CATEGORY_COLORS.Pets },
  { key: "Travel", icon: "✈️", color: CATEGORY_COLORS.Travel },
];

const STORAGE_KEY = "greggie_onboarding_done";
const DEV_PARAM = "dev";

/** Check if onboarding should be skipped (?dev=1 or already completed) */
export function shouldSkipOnboarding(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(DEV_PARAM) === "1") return true;
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markOnboardingDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // ignore
  }
}

interface OnboardingOverlayProps {
  onComplete: (selectedCategories: string[]) => void;
}

type Step = "welcome" | "pick" | "building";

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [buildProgress, setBuildProgress] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Welcome sonic boom state
  const [welcomeReady, setWelcomeReady] = useState(false);
  const boomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    boomTimerRef.current = setTimeout(() => setWelcomeReady(true), 600);
    return () => {
      if (boomTimerRef.current) clearTimeout(boomTimerRef.current);
    };
  }, []);

  const transitionTo = (next: Step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 250);
  };

  const handleToggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBuild = () => {
    transitionTo("building");
    let progress = 0;
    const timer = setInterval(() => {
      progress += 0.12;
      if (progress >= 1) {
        progress = 1;
        clearInterval(timer);
        setTimeout(() => {
          markOnboardingDone();
          onComplete(Array.from(selected));
        }, 500);
      }
      setBuildProgress(progress);
    }, 250);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: "rgba(10, 10, 15, 0.97)" }}
    >
      <motion.div
        animate={{ opacity: transitioning ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center"
      >
        {/* ── Step 1: Welcome ── */}
        {step === "welcome" && (
          <div className="flex flex-col items-center gap-5">
            {/* Sonic boom ring */}
            <div className="relative flex items-center justify-center">
              <AnimatePresence>
                {welcomeReady && (
                  <motion.div
                    initial={{ scale: 0.3, opacity: 1 }}
                    animate={{ scale: 5, opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute rounded-full"
                    style={{
                      width: 60,
                      height: 60,
                      border: "3px solid #34D399",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 8 }}
              >
                <ButterflyIcon size={80} hovered />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 160, damping: 14 }}
              className="text-center"
            >
              <h1
                className="text-3xl font-extrabold tracking-tight"
                style={{ color: "#F1F5F9" }}
              >
                Welcome to Greggie
              </h1>
              <p className="mt-1 text-base" style={{ color: "#94A3B8" }}>
                Live commerce, reimagined
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => transitionTo("pick")}
              className="mt-4 rounded-full px-8 py-3.5 text-base font-bold text-white"
              style={{ backgroundColor: "#6366F1" }}
            >
              Get Started
            </motion.button>
          </div>
        )}

        {/* ── Step 2: Category Picker ── */}
        {step === "pick" && (
          <div className="flex w-full max-w-md flex-col items-center px-6">
            <h2
              className="text-2xl font-extrabold"
              style={{ color: "#F1F5F9" }}
            >
              What interests you?
            </h2>
            <p className="mt-1.5 mb-5 text-sm" style={{ color: "#94A3B8" }}>
              Pick categories to personalize your mall
            </p>

            <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {CATEGORIES.map(({ key, icon, color }) => {
                const active = selected.has(key);
                return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleToggle(key)}
                    className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-4 transition-colors"
                    style={{
                      backgroundColor: active
                        ? `${color}25`
                        : "rgba(255,255,255,0.04)",
                      borderColor: active ? color : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: active ? color : "#94A3B8" }}
                    >
                      {key}
                    </span>
                    {active && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white"
                        style={{ backgroundColor: color }}
                      >
                        ✓
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBuild}
              disabled={selected.size === 0}
              className="rounded-full px-8 py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#6366F1" }}
            >
              Build My Mall ({selected.size})
            </motion.button>

            <button
              onClick={() => {
                markOnboardingDone();
                onComplete([]);
              }}
              className="mt-3 text-sm"
              style={{ color: "#64748B" }}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 3: Building ── */}
        {step === "building" && (
          <div className="flex flex-col items-center gap-4">
            <ButterflyIcon size={50} hovered />
            <h2
              className="text-xl font-bold"
              style={{ color: "#F1F5F9" }}
            >
              Building your mall...
            </h2>

            {/* Progress bar */}
            <div
              className="h-1.5 w-64 overflow-hidden rounded-full"
              style={{ backgroundColor: "#1A1A22" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#818CF8" }}
                animate={{ width: `${Math.round(buildProgress * 100)}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>

            <p className="text-sm" style={{ color: "#64748B" }}>
              {buildProgress < 0.3
                ? "Connecting to stores..."
                : buildProgress < 0.7
                  ? "Curating the best drops..."
                  : buildProgress < 1
                    ? "Almost there..."
                    : "Welcome in! ✨"}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
