import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCookieConsentStatus,
  onCookieConsentChange,
  onCookiePreferencesOpen,
  setCookieConsentStatus,
} from "../lib/cookieConsent";
import { clearSiteAnalyticsStorage } from "../lib/siteAnalytics";

function getStatusLabel(status) {
  if (status === "accepted") return "Analytics on";
  if (status === "essential") return "Essential only";
  return "Cookie settings";
}

export default function CookieConsent() {
  const [consentStatus, setConsentStatus] = useState(() => getCookieConsentStatus());
  const [isOpen, setIsOpen] = useState(() => getCookieConsentStatus() === "unset");

  useEffect(() => onCookieConsentChange(setConsentStatus), []);
  useEffect(() => onCookiePreferencesOpen(() => setIsOpen(true)), []);

  const handleAccept = () => {
    setCookieConsentStatus("accepted");
    setConsentStatus("accepted");
    setIsOpen(false);
  };

  const handleEssentialOnly = () => {
    clearSiteAnalyticsStorage();
    setCookieConsentStatus("essential");
    setConsentStatus("essential");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[65] px-4 pb-2.5">
      <div className="mx-auto w-full max-w-[33rem] overflow-hidden rounded-[22px] border border-[#d7bf95]/35 bg-[linear-gradient(180deg,rgba(20,16,12,0.98)_0%,rgba(9,8,7,0.98)_100%)] text-[#f8edd4] shadow-[0_40px_90px_-35px_rgba(0,0,0,0.85)] backdrop-blur">
        <div className="relative px-4 py-3.5">
          {consentStatus !== "unset" ? (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close cookie banner"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-[#cdb48b] transition hover:border-[#d7b780] hover:text-[#fff4de]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M3 3l10 10" />
                <path d="M13 3L3 13" />
              </svg>
            </button>
          ) : null}

          <div className="pr-10">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d7b780]">
              {getStatusLabel(consentStatus)}
            </p>
            <h2 className="mt-1 text-[1.1rem] font-black uppercase tracking-tight text-[#fff4de]">
              Cookies
            </h2>
            <p className="mt-1.5 max-w-[42ch] text-[12px] leading-[1.45] text-[#dbc7a4]">
              Essential cookies keep the site working. Analytics help us improve it.
            </p>
          </div>

          <div className="mt-2 flex">
            <Link
              to="/privacy-cookies"
              className="inline-flex items-center justify-center rounded-full border border-transparent px-1 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#cdb48b] transition hover:text-[#fff4de]"
            >
              Privacy and cookies
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#f0c372] px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#23170d] transition hover:bg-[#fff1d1]"
            >
              Accept analytics
            </button>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/12 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#f6ead2] transition hover:border-[#d7b780] hover:bg-[#f6ead2] hover:text-[#1d160f]"
            >
              Essential only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
