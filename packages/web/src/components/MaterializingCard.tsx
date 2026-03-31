import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ButterflyIcon } from "./ButterflyIcon";

interface MaterializingCardProps {
  /** Category label (e.g. "Tech", "Fashion") */
  category: string;
  /** Category accent color */
  categoryColor: string;
  /** Once the real item arrives, these populate and the card "completes" */
  sellerName?: string;
  title?: string;
  imageUrl?: string;
  price?: string;
  /** true while waiting for the API */
  loading: boolean;
  /** Called when the full reveal animation finishes */
  onRevealed?: () => void;
}

/**
 * Magic Drop card — phantom card that sequentially reveals:
 * 1. Category badge springs in
 * 2. Spinning butterfly loader
 * 3. Seller name types letter-by-letter
 * 4. Title fades in
 * 5. Image slides up
 * 6. Arrival glow pulse
 *
 * Ported from React Native MaterializingCard.tsx for commerce context.
 */
export function MaterializingCard({
  category,
  categoryColor,
  sellerName,
  title,
  imageUrl,
  price,
  loading,
  onRevealed,
}: MaterializingCardProps) {
  const [typedSeller, setTypedSeller] = useState("");
  const [phase, setPhase] = useState<
    "loading" | "typing" | "title" | "image" | "glow" | "done"
  >("loading");
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phase 2: When data arrives, run reveal sequence
  useEffect(() => {
    if (loading || !sellerName) return;

    // Typewriter
    let idx = 0;
    const full = sellerName;
    setTypedSeller("");
    setPhase("typing");

    typingRef.current = setInterval(() => {
      idx++;
      setTypedSeller(full.slice(0, idx));
      if (idx >= full.length) {
        if (typingRef.current) clearInterval(typingRef.current);

        // Stagger: title fade
        setTimeout(() => setPhase("title"), 200);

        // Image slide
        setTimeout(() => setPhase("image"), 600);

        // Glow
        setTimeout(() => {
          setPhase("glow");
          setTimeout(() => {
            setPhase("done");
            onRevealed?.();
          }, 900);
        }, 1000);
      }
    }, 40);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [loading, sellerName]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 14 }}
      className="relative rounded-2xl border p-4 overflow-hidden"
      style={{
        backgroundColor: "#141419",
        borderColor:
          phase === "glow" ? categoryColor : "rgba(255, 255, 255, 0.06)",
        boxShadow:
          phase === "glow"
            ? `0 0 20px ${categoryColor}40, 0 0 40px ${categoryColor}15`
            : "0 0 12px rgba(129, 140, 248, 0.08)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Category badge — springs in */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{
          backgroundColor: `${categoryColor}25`,
          color: categoryColor,
        }}
      >
        {category}
      </motion.div>

      {/* Loading: spinning butterfly + shimmer */}
      <AnimatePresence>
        {loading && (
          <motion.div
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 mb-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <ButterflyIcon size={22} />
            </motion.div>
            <motion.div
              className="h-3 flex-1 rounded-full"
              style={{ backgroundColor: "#2A2A35" }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seller — typewriter */}
      {!loading && typedSeller && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium mb-1"
          style={{ color: "#F1F5F9" }}
        >
          {typedSeller}
          {phase === "typing" && (
            <span style={{ color: "#818CF8" }}>|</span>
          )}
        </motion.p>
      )}

      {/* Title — fades in */}
      <AnimatePresence>
        {(phase === "title" ||
          phase === "image" ||
          phase === "glow" ||
          phase === "done") &&
          title && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-xs mb-3"
              style={{ color: "#94A3B8" }}
            >
              {title}
            </motion.p>
          )}
      </AnimatePresence>

      {/* Image — slides up */}
      <AnimatePresence>
        {(phase === "image" || phase === "glow" || phase === "done") &&
          imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="relative w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src={imageUrl}
                alt={title ?? "Product"}
                className="w-full h-full object-cover"
              />
              {price && (
                <div
                  className="absolute bottom-2 right-2 rounded-lg px-2.5 py-1 text-xs font-bold backdrop-blur-md"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.7)",
                    color: "#F1F5F9",
                  }}
                >
                  {price}
                </div>
              )}
            </motion.div>
          )}
      </AnimatePresence>

      {/* Shimmer placeholder while loading */}
      {loading && (
        <motion.div
          className="w-full rounded-xl"
          style={{
            aspectRatio: "16/9",
            backgroundColor: "#1A1A22",
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}
