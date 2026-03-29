/**
 * Client-side URL → platform detection.
 * Used by Magic Drop to show a phantom card before the API responds.
 */

export interface DetectedPlatform {
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "reddit" | "open-web";
  icon: string;
  label: string;
}

const RULES: { patterns: string[]; result: DetectedPlatform }[] = [
  {
    patterns: ["youtube.com", "youtu.be"],
    result: { platform: "youtube", icon: "▶️", label: "YouTube" },
  },
  {
    patterns: ["tiktok.com"],
    result: { platform: "tiktok", icon: "🎵", label: "TikTok" },
  },
  {
    patterns: ["instagram.com", "instagr.am"],
    result: { platform: "instagram", icon: "📸", label: "Instagram" },
  },
  {
    patterns: ["facebook.com", "fb.com", "fb.watch"],
    result: { platform: "facebook", icon: "👥", label: "Facebook" },
  },
  {
    patterns: ["reddit.com", "redd.it"],
    result: { platform: "reddit", icon: "🔺", label: "Reddit" },
  },
];

export function detectPlatform(url: string): DetectedPlatform {
  const lower = url.toLowerCase();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => lower.includes(p))) {
      return rule.result;
    }
  }
  return { platform: "open-web", icon: "🌐", label: "Web" };
}
