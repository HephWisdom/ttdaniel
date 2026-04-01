import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView, trackSectionView } from "../lib/siteAnalytics";

function getSectionName(element) {
  const explicit = element.getAttribute("data-analytics-section");
  if (explicit) return explicit;

  if (element.tagName.toLowerCase() === "section" && element.id) {
    return element.id;
  }

  return "";
}

export default function SiteAnalyticsTracker() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin/blog");

  useEffect(() => {
    if (isAdminRoute) return;
    trackPageView(location.pathname || "/");
  }, [isAdminRoute, location.pathname]);

  useEffect(() => {
    if (isAdminRoute) return undefined;

    let observer = null;
    const timerId = window.setTimeout(() => {
      const elements = [...document.querySelectorAll("[data-analytics-section], section[id]")];
      if (!elements.length) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const sectionName = getSectionName(entry.target);
            if (!sectionName) return;

            trackSectionView(location.pathname || "/", sectionName);
          });
        },
        { threshold: 0.45 }
      );

      elements.forEach((element) => observer?.observe(element));
    }, 180);

    return () => {
      window.clearTimeout(timerId);
      observer?.disconnect();
    };
  }, [isAdminRoute, location.pathname]);

  return null;
}
