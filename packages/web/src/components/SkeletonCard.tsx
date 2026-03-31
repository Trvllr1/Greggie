import { motion } from "motion/react";

/**
 * Skeleton loading card — shimmer effect on bone-colored placeholders.
 * Ported from React Native SkeletonCard.tsx, adapted for Tailwind + Framer Motion.
 */
export function SkeletonCard() {
  const bone = {
    animate: { opacity: [0.3, 0.6, 0.3] },
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const },
  };

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: "#141419",
        borderColor: "rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <motion.div
          className="h-6 w-24 rounded-full"
          style={{ backgroundColor: "#1A1A22" }}
          {...bone}
        />
        <motion.div
          className="h-8 w-8 rounded-full"
          style={{ backgroundColor: "#1A1A22" }}
          {...bone}
        />
      </div>

      {/* Text lines */}
      <motion.div
        className="mb-1.5 h-3 w-2/5 rounded-full"
        style={{ backgroundColor: "#1A1A22" }}
        {...bone}
      />
      <motion.div
        className="mb-3 h-3 w-3/4 rounded-full"
        style={{ backgroundColor: "#1A1A22" }}
        {...bone}
      />

      {/* Image placeholder */}
      <motion.div
        className="w-full rounded-xl"
        style={{ backgroundColor: "#1A1A22", aspectRatio: "16/9" }}
        {...bone}
      />
    </div>
  );
}
