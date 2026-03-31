import { motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState, useCallback } from "react";

const EMERALD = "#059669";
const EMERALD_GLOW = "#34D399";
const GOLD = "#F59E0B";
const GOLD_LIGHT = "#FBBF24";
const GOLD_DARK = "#D97706";
const DEEP_PURPLE = "#2E1065";
const BODY_PURPLE = "#1E0A4A";

/**
 * Greggie™ butterfly icon — SVG + Framer Motion.
 * Faithful port from React Native ButterflyIcon.tsx.
 *
 * 5-layer animation system:
 * 1. Idle flutter — wings always somewhat open, gentle oscillation
 * 2. Antenna glow beacons — pulsing scale + opacity on tips
 * 3. Hover activation — dramatic wing spread + pulsing golden glow
 * 4. Sonic boom — dual rings (emerald + gold) after 5s hover
 * 5. Flight sequence — fly up, bob 3×, return
 */
export function ButterflyIcon({
  size = 34,
  hovered = false,
}: {
  size?: number;
  hovered?: boolean;
}) {
  const scale = size / 34;
  const w = useCallback((v: number) => v * scale, [scale]);

  const [showBoom, setShowBoom] = useState(false);
  const [glowPhase, setGlowPhase] = useState(0);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glowRafRef = useRef<number | null>(null);
  const flyControls = useAnimationControls();

  // Pulsing hover glow (matches original shadow pulse: opacity 0.5↔1.0, radius 14↔22)
  useEffect(() => {
    if (hovered) {
      let phase = 0;
      const tick = () => {
        phase += 0.06;
        setGlowPhase(0.5 + 0.5 * Math.sin(phase));
        glowRafRef.current = requestAnimationFrame(tick);
      };
      glowRafRef.current = requestAnimationFrame(tick);
      return () => {
        if (glowRafRef.current) cancelAnimationFrame(glowRafRef.current);
        setGlowPhase(0);
      };
    } else {
      if (glowRafRef.current) cancelAnimationFrame(glowRafRef.current);
      setGlowPhase(0);
    }
  }, [hovered]);

  // 5s hover → sonic boom → fly
  useEffect(() => {
    if (hovered) {
      hoverTimerRef.current = setTimeout(async () => {
        setShowBoom(true);
        setTimeout(() => setShowBoom(false), 600);

        await flyControls.start({
          y: -w(28),
          transition: { duration: 1.2, ease: "easeOut" },
        });
        for (let i = 0; i < 3; i++) {
          await flyControls.start({
            y: -w(24),
            transition: { duration: 0.6, ease: "easeInOut" },
          });
          await flyControls.start({
            y: -w(28),
            transition: { duration: 0.6, ease: "easeInOut" },
          });
        }
        await flyControls.start({
          y: 0,
          transition: { duration: 1.4, ease: "easeInOut" },
        });
      }, 5000);

      return () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      };
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      flyControls.start({ y: 0, transition: { duration: 0.4 } });
    }
  }, [hovered, flyControls, w]);

  // Wing rotation keyframes — matching original RN behavior:
  // Wings always stay somewhat open, oscillating around a positive angle
  const leftUpper = hovered ? [5, 30, 5] : [12, 18, 12];
  const rightUpper = hovered ? [-5, -30, -5] : [-12, -18, -12];
  const leftLower = hovered ? [15, 38, 15] : [22, 28, 22];
  const rightLower = hovered ? [-15, -38, -15] : [-22, -28, -22];

  // Pulsing glow values (original: shadowOpacity 0.5↔1.0, shadowRadius 14↔22)
  const glowRadius = w(14 + glowPhase * 8);
  const glowOpacity = 0.5 + glowPhase * 0.5;

  const bodyOrigin = `${w(14)}px ${w(14)}px`;

  // Antennae extend to y = w(-6) above origin — viewBox must include that
  const vbTop = w(6); // extra space above for antennae + beacon glow
  const vbHeight = w(42) + vbTop;

  return (
    <motion.div
      animate={flyControls}
      style={{
        width: w(28),
        height: vbHeight,
        position: "relative",
        filter: hovered
          ? `drop-shadow(0 0 ${glowRadius}px rgba(251, 191, 36, ${glowOpacity}))`
          : "none",
      }}
    >
      {/* Sonic boom — dual rings (emerald + gold, matching original) */}
      {showBoom && (
        <>
          <motion.div
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: w(20),
              height: w(20),
              marginTop: -w(10),
              marginLeft: -w(10),
              borderRadius: "50%",
              border: `${w(2)}px solid ${EMERALD_GLOW}`,
              pointerEvents: "none",
            }}
          />
          <motion.div
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: w(14),
              height: w(14),
              marginTop: -w(7),
              marginLeft: -w(7),
              borderRadius: "50%",
              border: `${w(1.5)}px solid ${GOLD_LIGHT}`,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <svg
        width={w(28)}
        height={vbHeight}
        viewBox={`0 ${-vbTop} ${w(28)} ${vbHeight}`}
        fill="none"
        overflow="visible"
      >
        {/* ── Upper wings ── */}
        {/* Left upper — emerald edge */}
        <motion.ellipse
          cx={w(7)}
          cy={w(11)}
          rx={w(6.5)}
          ry={w(8.5)}
          fill={EMERALD}
          animate={{ rotate: leftUpper }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: bodyOrigin }}
        />
        {/* Left upper — gold fill */}
        <motion.ellipse
          cx={w(7)}
          cy={w(11)}
          rx={w(5)}
          ry={w(7)}
          fill={GOLD}
          animate={{ rotate: leftUpper }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: bodyOrigin }}
        />
        {/* Left upper — highlight */}
        <motion.ellipse
          cx={w(6)}
          cy={w(10)}
          rx={w(2.5)}
          ry={w(4)}
          fill={GOLD_LIGHT}
          animate={{ rotate: leftUpper }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: bodyOrigin }}
        />

        {/* Right upper — emerald edge */}
        <motion.ellipse
          cx={w(21)}
          cy={w(11)}
          rx={w(6.5)}
          ry={w(8.5)}
          fill={EMERALD}
          animate={{ rotate: rightUpper }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: bodyOrigin }}
        />
        {/* Right upper — gold fill */}
        <motion.ellipse
          cx={w(21)}
          cy={w(11)}
          rx={w(5)}
          ry={w(7)}
          fill={GOLD}
          animate={{ rotate: rightUpper }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: bodyOrigin }}
        />
        {/* Right upper — highlight */}
        <motion.ellipse
          cx={w(22)}
          cy={w(10)}
          rx={w(2.5)}
          ry={w(4)}
          fill={GOLD_LIGHT}
          animate={{ rotate: rightUpper }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: bodyOrigin }}
        />

        {/* ── Lower wings ── */}
        <motion.ellipse
          cx={w(9)}
          cy={w(22)}
          rx={w(5)}
          ry={w(6.5)}
          fill={EMERALD}
          animate={{ rotate: leftLower }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${w(13.5)}px ${w(20)}px` }}
        />
        <motion.ellipse
          cx={w(9)}
          cy={w(22)}
          rx={w(3.5)}
          ry={w(5)}
          fill={GOLD_DARK}
          animate={{ rotate: leftLower }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${w(13.5)}px ${w(20)}px` }}
        />

        <motion.ellipse
          cx={w(19)}
          cy={w(22)}
          rx={w(5)}
          ry={w(6.5)}
          fill={EMERALD}
          animate={{ rotate: rightLower }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${w(14.5)}px ${w(20)}px` }}
        />
        <motion.ellipse
          cx={w(19)}
          cy={w(22)}
          rx={w(3.5)}
          ry={w(5)}
          fill={GOLD_DARK}
          animate={{ rotate: rightLower }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${w(14.5)}px ${w(20)}px` }}
        />

        {/* ── Body ── */}
        <rect
          x={w(12)}
          y={w(5)}
          width={w(4)}
          height={w(26)}
          rx={w(2)}
          fill={BODY_PURPLE}
        />
        {/* Thorax */}
        <rect
          x={w(12.5)}
          y={w(7)}
          width={w(3)}
          height={w(5)}
          rx={w(1.5)}
          fill={DEEP_PURPLE}
        />
        {/* Abdomen */}
        <rect
          x={w(12.5)}
          y={w(20)}
          width={w(3)}
          height={w(8)}
          rx={w(1.5)}
          fill={DEEP_PURPLE}
        />
        {/* Head */}
        <circle cx={w(14)} cy={w(4)} r={w(1.25)} fill={BODY_PURPLE} />

        {/* ── Antennae stems ── */}
        <line
          x1={w(12)}
          y1={w(5)}
          x2={w(7)}
          y2={w(-4)}
          stroke={BODY_PURPLE}
          strokeWidth={w(1.2)}
          strokeLinecap="round"
        />
        <line
          x1={w(16)}
          y1={w(5)}
          x2={w(21)}
          y2={w(-4)}
          stroke={BODY_PURPLE}
          strokeWidth={w(1.2)}
          strokeLinecap="round"
        />

        {/* Antenna tips — glowing beacons with scale pulse */}
        <motion.circle
          cx={w(7)}
          cy={w(-4)}
          r={w(1.2)}
          fill={EMERALD_GLOW}
          animate={{
            opacity: [0.4, 1, 0.4],
            r: [w(1.0), w(1.4), w(1.0)],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx={w(21)}
          cy={w(-4)}
          r={w(1.2)}
          fill={EMERALD_GLOW}
          animate={{
            opacity: [0.4, 1, 0.4],
            r: [w(1.0), w(1.4), w(1.0)],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
        />
      </svg>
    </motion.div>
  );
}
