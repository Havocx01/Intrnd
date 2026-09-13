import { useEffect, useRef } from "react";

export function useRecommendationImpression(surface: "HOME" | "BROWSE", enabled: boolean) {
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target) return;
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      void fetch("/api/users/me/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "RECOMMENDATION_IMPRESSION", surface }),
      });
    };
    if (!("IntersectionObserver" in window)) {
      record();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
          record();
          observer.disconnect();
        }
      },
      { threshold: [0.25] },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, surface]);

  return targetRef;
}
