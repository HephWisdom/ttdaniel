import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.replace("#", ""));
      if (id === "top") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

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
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}
