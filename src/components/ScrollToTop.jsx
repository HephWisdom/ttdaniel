import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    let retryTimer;
    let attempts = 0;

    if (hash) {
      const id = decodeURIComponent(hash.replace("#", ""));
      if (id === "top") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return undefined;
      }

      const scrollToHash = () => {
        const element = document.getElementById(id);
        if (element) {
          const headerOffset = 92;
          const elementTop = element.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: Math.max(elementTop - headerOffset, 0),
            left: 0,
            behavior: "auto",
          });
          return;
        }

        attempts += 1;
        if (attempts < 60) {
          retryTimer = window.setTimeout(scrollToHash, 50);
        }
      };

      scrollToHash();
      return () => window.clearTimeout(retryTimer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return undefined;
  }, [pathname, hash]);

  return null;
}
