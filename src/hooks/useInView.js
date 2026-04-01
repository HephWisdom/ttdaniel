import { useEffect, useRef, useState } from "react";

export default function useInView(options = {}) {
  const {
    threshold = 0.2,
    root = null,
    rootMargin = "0px 0px -10% 0px",
    once = true,
  } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(
    () => typeof window === "undefined" || !("IntersectionObserver" in window)
  );

  useEffect(() => {
    const node = ref.current;

    if (!node) return undefined;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);

          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [once, root, rootMargin, threshold]);

  return { ref, isVisible };
}
