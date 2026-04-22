import { useEffect } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export function useReadingProgress() {
  const progress = useMotionValue(0);
  const scaleX = useSpring(progress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const compute = () => {
      const prose = document.querySelector<HTMLElement>(".prose");
      if (!prose) return 0;
      const start = prose.getBoundingClientRect().top + window.scrollY;
      const range = prose.offsetHeight - window.innerHeight;
      if (range <= 0) return 1;
      return Math.max(0, Math.min(1, (window.scrollY - start) / range));
    };
    const handleScroll = () => progress.set(compute());
    const current = compute();
    progress.set(current);
    scaleX.jump(current);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [progress, scaleX]);

  return scaleX;
}
