import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { hasAnalyticsConsent, onCookieConsentChange } from "../lib/cookieConsent";
import {
  trackEngagementPing,
  trackOutboundClick,
  trackPageView,
  trackScrollDepth,
  trackSectionView,
} from "../lib/siteAnalytics";

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
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => hasAnalyticsConsent());

  useEffect(() => onCookieConsentChange(setAnalyticsEnabled), []);

  useEffect(() => {
    if (isAdminRoute || !analyticsEnabled) return;
    trackPageView(location.pathname || "/");
  }, [analyticsEnabled, isAdminRoute, location.pathname]);

  useEffect(() => {
    if (isAdminRoute || !analyticsEnabled) return undefined;

    const path = location.pathname || "/";
    const timerIds = [15, 45, 120].map((seconds) =>
      window.setTimeout(() => {
        trackEngagementPing(path, seconds);
      }, seconds * 1000)
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [analyticsEnabled, isAdminRoute, location.pathname]);

  useEffect(() => {
    if (isAdminRoute || !analyticsEnabled) return undefined;

    const path = location.pathname || "/";
    const milestones = [25, 50, 75, 90];
    const reached = new Set();

    const checkScrollDepth = () => {
      const documentElement = document.documentElement;
      const scrollableHeight = Math.max(
        documentElement.scrollHeight - window.innerHeight,
        1
      );
      const depth = Math.round((window.scrollY / scrollableHeight) * 100);

      milestones.forEach((milestone) => {
        if (depth < milestone || reached.has(milestone)) return;
        reached.add(milestone);
        trackScrollDepth(path, milestone);
      });
    };

    const timerId = window.setTimeout(checkScrollDepth, 600);
    window.addEventListener("scroll", checkScrollDepth, { passive: true });

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("scroll", checkScrollDepth);
    };
  }, [analyticsEnabled, isAdminRoute, location.pathname]);

  useEffect(() => {
    if (isAdminRoute || !analyticsEnabled) return undefined;

    const path = location.pathname || "/";
    const handleClick = (event) => {
      const link = event.target?.closest?.("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      if (!href) return;

      try {
        const url = new URL(href, window.location.origin);
        const isContactLink = url.protocol === "mailto:" || url.protocol === "tel:";
        const isExternal = url.origin !== window.location.origin;
        if (!isContactLink && !isExternal) return;
        trackOutboundClick(path, url.toString());
      } catch {
        // Ignore malformed links.
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [analyticsEnabled, isAdminRoute, location.pathname]);

  useEffect(() => {
    if (isAdminRoute || !analyticsEnabled) return undefined;

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
  }, [analyticsEnabled, isAdminRoute, location.pathname]);

  return null;
}
