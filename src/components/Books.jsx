import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Container from "./ui/Container";
import MotionReveal from "./ui/MotionReveal";
import SlideArrowButton from "./ui/SlideArrowButton";
import { books, booksFallbackImage } from "../data/books";
import {
  buildCurrentPagePath,
  createEbookCheckoutSession,
  EBOOK_MAX_CART_ITEMS,
  fetchEbookSessionStatus,
  formatEbookPrice,
  getEbookDisplayPrice,
  isValidBuyerEmail,
  normalizeBuyerEmail,
  readStoredCartBookIds,
  storeCartBookIds,
} from "../lib/ebookCheckout";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const REGION_PREVIEW_STORAGE_KEY = "tt_daniel_books_region_preview";
const SCROLL_EDGE_TOLERANCE = 12;
let stripeClientPromise = null;

function formatTitle(title = "") {
  return String(title || "").replace(/\n/g, " ");
}

function detectAfricaTimezone() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return timezone.startsWith("Africa/");
  } catch {
    return false;
  }
}

function isLocalDevelopmentHost() {
  try {
    const hostname = window.location.hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

function readRegionPreviewMode(fallbackMode) {
  if (!isLocalDevelopmentHost()) return fallbackMode;

  try {
    const storedMode = window.localStorage.getItem(REGION_PREVIEW_STORAGE_KEY);
    return storedMode === "africa" || storedMode === "world" ? storedMode : fallbackMode;
  } catch {
    return fallbackMode;
  }
}

function getDisplayPrice(book, isAfricaUser) {
  if (isAfricaUser) {
    return book.ghsPrice || book.price || getEbookDisplayPrice(book);
  }

  return getEbookDisplayPrice(book);
}

function isDirectEbookAvailable(book) {
  return Boolean(book?.id) && book.ebookAvailable !== false;
}

function areSameBookIds(firstIds, secondIds) {
  if (firstIds.length !== secondIds.length) return false;
  return firstIds.every((bookId, index) => bookId === secondIds[index]);
}

function readStoredAvailableCartBookIds() {
  const availableBookMap = new Map(
    books.filter(isDirectEbookAvailable).map((book) => [book.id, book])
  );
  return readStoredCartBookIds().filter((bookId) => availableBookMap.has(bookId));
}

async function getStripeClient() {
  if (!STRIPE_PUBLISHABLE_KEY) return null;

  if (!stripeClientPromise) {
    stripeClientPromise = import("@stripe/stripe-js").then(({ loadStripe }) =>
      loadStripe(STRIPE_PUBLISHABLE_KEY)
    );
  }

  return stripeClientPromise;
}

function CartIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M6.2 6.8h14l-1.7 7.4a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.7L5.8 4.9H3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 20h.1M17 20h.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function PlusIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CloseIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function Books() {
  const location = useLocation();
  const checkoutContainerRef = useRef(null);
  const embeddedCheckoutRef = useRef(null);
  const booksTrackRef = useRef(null);
  const isLocalPreviewHost = useMemo(() => isLocalDevelopmentHost(), []);
  const detectedAfricaUser = useMemo(() => detectAfricaTimezone(), []);
  const [regionPreviewMode, setRegionPreviewMode] = useState(() =>
    readRegionPreviewMode(detectedAfricaUser ? "africa" : "world")
  );
  const isAfricaUser = isLocalPreviewHost
    ? regionPreviewMode === "africa"
    : detectedAfricaUser;
  const [activeBook, setActiveBook] = useState(null);
  const [cartBookIds, setCartBookIds] = useState(() => readStoredAvailableCartBookIds());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [cartError, setCartError] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [cartToast, setCartToast] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [isPreparingCheckout, setIsPreparingCheckout] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState("");
  const [sessionStatus, setSessionStatus] = useState(null);
  const [showAllBooks, setShowAllBooks] = useState(false);
  const [canScrollBooksLeft, setCanScrollBooksLeft] = useState(false);
  const [canScrollBooksRight, setCanScrollBooksRight] = useState(false);

  const bookMap = useMemo(() => {
    return new Map(books.filter((book) => book.id).map((book) => [book.id, book]));
  }, []);

  const cartBooks = useMemo(() => {
    return cartBookIds.map((bookId) => bookMap.get(bookId)).filter(isDirectEbookAvailable);
  }, [bookMap, cartBookIds]);

  const cartTotalCents = useMemo(() => {
    return cartBooks.reduce((total, book) => {
      const price = Number(book.ebookPriceCents);
      return Number.isFinite(price) && price > 0 ? total + price : total;
    }, 0);
  }, [cartBooks]);

  const hasUnknownCartPrice = cartBooks.some((book) => {
    const price = Number(book.ebookPriceCents);
    return !Number.isFinite(price) || price <= 0;
  });

  const cartTotalLabel =
    cartBooks.length && !hasUnknownCartPrice
      ? formatEbookPrice(cartTotalCents, cartBooks[0]?.ebookCurrency || "usd")
      : "Calculated at checkout";

  const modalDetails = useMemo(() => {
    if (!activeBook) return null;

    const description =
      activeBook.details ||
      `${activeBook.blurb} This book offers deeper biblical and practical guidance for personal transformation, growth, and daily Christian living.`;

    return {
      book: activeBook,
      description,
      priceTag: getDisplayPrice(activeBook, isAfricaUser),
      ebookAvailable: isAfricaUser
        ? Boolean(activeBook.paystackLink)
        : isDirectEbookAvailable(activeBook),
      inCart: isDirectEbookAvailable(activeBook) && cartBookIds.includes(activeBook.id),
    };
  }, [activeBook, cartBookIds, isAfricaUser]);

  const destroyEmbeddedCheckout = useCallback(() => {
    if (embeddedCheckoutRef.current) {
      embeddedCheckoutRef.current.destroy();
      embeddedCheckoutRef.current = null;
    }
  }, []);

  const closeCart = useCallback(() => {
    destroyEmbeddedCheckout();
    setIsCartOpen(false);
    setCheckoutStep("cart");
    setCartError("");
    setIsPreparingCheckout(false);
  }, [destroyEmbeddedCheckout]);

  useEffect(() => {
    const availableIds = cartBooks.map((book) => book.id);
    if (!areSameBookIds(availableIds, cartBookIds)) {
      setCartBookIds(availableIds);
      return;
    }

    storeCartBookIds(availableIds);
  }, [cartBookIds, cartBooks]);

  useEffect(() => {
    if (!isLocalPreviewHost) return;

    try {
      window.localStorage.setItem(REGION_PREVIEW_STORAGE_KEY, regionPreviewMode);
    } catch {
      // The preview still works for this page load if local storage is unavailable.
    }
  }, [isLocalPreviewHost, regionPreviewMode]);

  useEffect(() => {
    if (isAfricaUser && isCartOpen) {
      closeCart();
    }
  }, [closeCart, isAfricaUser, isCartOpen]);

  useEffect(() => {
    if (!isCartOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCart, isCartOpen]);

  useEffect(() => {
    if (
      checkoutStep !== "checkout" ||
      !embeddedCheckoutRef.current ||
      !checkoutContainerRef.current
    ) {
      return undefined;
    }

    embeddedCheckoutRef.current.mount(checkoutContainerRef.current);

    return () => {
      embeddedCheckoutRef.current?.unmount();
    };
  }, [checkoutStep, checkoutSessionId]);

  useEffect(() => {
    return () => {
      destroyEmbeddedCheckout();
    };
  }, [destroyEmbeddedCheckout]);

  useEffect(() => {
    if (showAllBooks) {
      return undefined;
    }

    const track = booksTrackRef.current;

    if (!track) {
      return undefined;
    }

    const syncScrollState = () => {
      const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);

      setCanScrollBooksLeft(track.scrollLeft > SCROLL_EDGE_TOLERANCE);
      setCanScrollBooksRight(track.scrollLeft < maxScrollLeft - SCROLL_EDGE_TOLERANCE);
    };

    const frameId = window.requestAnimationFrame(syncScrollState);
    track.addEventListener("scroll", syncScrollState, { passive: true });

    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncScrollState);
      resizeObserver.observe(track);
    }

    window.addEventListener("resize", syncScrollState);

    return () => {
      window.cancelAnimationFrame(frameId);
      track.removeEventListener("scroll", syncScrollState);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncScrollState);
    };
  }, [showAllBooks]);

  useEffect(() => {
    if (!cartToast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setCartToast(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cartToast]);

  const showCartToast = useCallback((message, type = "notice") => {
    setCartToast({ message, type, id: Date.now() });
  }, []);

  const addToCart = useCallback((book, options = {}) => {
    const shouldOpenCart = options.openCart !== false;
    let feedbackMessage = "";
    let feedbackType = "notice";

    if (!isDirectEbookAvailable(book)) {
      feedbackMessage = "This e-book is not available yet.";
      feedbackType = "error";
      setCartError(feedbackMessage);

      if (shouldOpenCart) {
        setIsCartOpen(true);
      } else {
        showCartToast(feedbackMessage, feedbackType);
      }

      return;
    }

    if (cartBookIds.includes(book.id)) {
      feedbackMessage = `${formatTitle(book.title)} is already in your cart.`;
      setCartError("");
      setCartNotice(feedbackMessage);
    } else if (cartBookIds.length >= EBOOK_MAX_CART_ITEMS) {
      feedbackMessage = `You can checkout with up to ${EBOOK_MAX_CART_ITEMS} e-books at once.`;
      feedbackType = "error";
      setCartError(feedbackMessage);
    } else {
      setCartBookIds([...cartBookIds, book.id]);
      setCartError("");
      feedbackMessage = `${formatTitle(book.title)} added to cart.`;
      setCartNotice(feedbackMessage);
    }

    setActiveBook(null);
    setCheckoutStep("cart");

    if (shouldOpenCart) {
      setIsCartOpen(true);
    } else {
      showCartToast(feedbackMessage, feedbackType);
    }
  }, [cartBookIds, showCartToast]);

  const removeFromCart = useCallback((bookId) => {
    setCartBookIds((currentIds) => currentIds.filter((id) => id !== bookId));
    setCartError("");
  }, []);

  const handleCheckoutComplete = useCallback(
    async (sessionId) => {
      destroyEmbeddedCheckout();
      setCartError("");

      try {
        const status = await fetchEbookSessionStatus(sessionId);
        setSessionStatus(status);
        setCheckoutStep("success");

        if (status.emailSent || status.fulfilled) {
          setCartBookIds([]);
          setCartNotice(
            status.customerEmail
              ? `Delivery email sent to ${status.customerEmail}.`
              : "Delivery email sent."
          );
        } else {
          setCartNotice(status.message || "Payment received. Delivery email is being prepared.");
        }
      } catch {
        setCheckoutStep("success");
        setCartError(
          "Payment completed, but delivery could not be confirmed. Please contact support with your order email."
        );
      }
    },
    [destroyEmbeddedCheckout]
  );

  const handleStartCheckout = async () => {
    setCartError("");
    setCartNotice("");

    const checkoutBookIds = cartBooks.map((book) => book.id);

    if (!checkoutBookIds.length) {
      setCartError("Add at least one e-book to your cart.");
      return;
    }

    const normalizedEmail = normalizeBuyerEmail(buyerEmail);
    if (!isValidBuyerEmail(normalizedEmail)) {
      setCartError("Enter a valid email address for delivery.");
      return;
    }

    if (!STRIPE_PUBLISHABLE_KEY) {
      setCartError("Secure checkout is not configured yet.");
      return;
    }

    setIsPreparingCheckout(true);
    destroyEmbeddedCheckout();

    try {
      const stripe = await getStripeClient();
      if (!stripe) {
        throw new Error("Secure checkout failed to load.");
      }

      const session = await createEbookCheckoutSession({
        bookIds: checkoutBookIds,
        customerEmail: normalizedEmail,
        pagePath: buildCurrentPagePath(location),
      });

      setBuyerEmail(normalizedEmail);
      setCheckoutSessionId(session.sessionId);
      setSessionStatus(null);

      embeddedCheckoutRef.current = await stripe.initEmbeddedCheckout({
        fetchClientSecret: () => Promise.resolve(session.clientSecret),
        onComplete: () => {
          handleCheckoutComplete(session.sessionId);
        },
      });

      setCheckoutStep("checkout");
    } catch (error) {
      destroyEmbeddedCheckout();
      setCheckoutStep("cart");
      setCartError(
        error instanceof Error ? error.message : "Unable to open the secure checkout."
      );
    } finally {
      setIsPreparingCheckout(false);
    }
  };

  const keepShopping = () => {
    destroyEmbeddedCheckout();
    setCheckoutStep("cart");
    setIsCartOpen(false);
    setCartError("");
  };

  const scrollBooks = (direction) => {
    const track = booksTrackRef.current;

    if (!track) {
      return;
    }

    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.86, 220),
      behavior: "smooth",
    });
  };

  const renderBookCard = (pkg, idx) => {
    const isFeatured =
      idx === 0 && pkg.title === "ACCESS PORTALS FOR SUPERNATURAL BREAKTHROUGHS";
    const isInCart = isDirectEbookAvailable(pkg) && cartBookIds.includes(pkg.id);
    const africaEbookLink = pkg.paystackLink || null;
    const ebookAvailable = isAfricaUser
      ? Boolean(africaEbookLink)
      : isDirectEbookAvailable(pkg);
    const priceTag = getDisplayPrice(pkg, isAfricaUser);

    return (
      <MotionReveal
        key={pkg.id || pkg.title + idx}
        as="article"
        delay={80 + idx * 80}
        distance={30}
        className={`group relative flex flex-col overflow-hidden rounded-[26px] border bg-gradient-to-b from-[#fbf8f2] to-[#efe4cf] transition-all duration-500 hover:-translate-y-1.5 ${
          showAllBooks
            ? "mx-auto w-full max-w-[340px]"
            : "w-[292px] shrink-0 snap-start sm:w-[320px]"
        } ${
          isFeatured
            ? "border-[#aa8852]/80 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.42)]"
            : "border-[#cab28a]/70 shadow-[0_22px_56px_-36px_rgba(0,0,0,0.34)] hover:border-[#b79862]/70 hover:shadow-[0_32px_86px_-36px_rgba(0,0,0,0.45)]"
        }`}
        style={isFeatured ? { animation: "featuredGlow 2.8s ease-in-out infinite" } : undefined}
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          {isFeatured ? (
            <span className="absolute right-[-50px] top-5 z-20 w-[190px] rotate-45 border-y border-[#f3deab] bg-[#8f1e1c] py-1 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#fff5da] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
              New Release
            </span>
          ) : null}
          <img
            src={pkg.image}
            alt={formatTitle(pkg.title)}
            onError={(event) => {
              event.currentTarget.src = booksFallbackImage;
            }}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
          <span className="absolute left-4 top-4 inline-flex items-center rounded-full border border-[#f0d7a7]/60 bg-[#20170d]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f3d9a2] backdrop-blur-sm">
            {priceTag}
          </span>
          {isAfricaUser ? (
            ebookAvailable ? (
              <a
                href={africaEbookLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${formatTitle(pkg.title)} E-book`}
                className="absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#f0d7a7]/70 bg-[#20170d]/80 text-[#f3d9a2] backdrop-blur-sm transition hover:border-[#fff1c8] hover:bg-[#f5ead2] hover:text-[#231a11]"
              >
                <PlusIcon className="h-5 w-5" />
              </a>
            ) : (
              <span className="absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d8c39d]/60 bg-[#e8dcc8]/90 text-[#7a6a55] backdrop-blur-sm">
                <PlusIcon className="h-5 w-5" />
              </span>
            )
          ) : (
            <button
              type="button"
              onClick={() => addToCart(pkg, { openCart: false })}
              disabled={!ebookAvailable}
              aria-label={`${isInCart ? "Already in cart:" : "Add"} ${formatTitle(pkg.title)} e-book`}
              className="absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#f0d7a7]/70 bg-[#20170d]/80 text-[#f3d9a2] backdrop-blur-sm transition hover:border-[#fff1c8] hover:bg-[#f5ead2] hover:text-[#231a11] disabled:cursor-not-allowed disabled:border-[#d8c39d]/60 disabled:bg-[#e8dcc8]/90 disabled:text-[#7a6a55]"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="whitespace-pre-line text-[15px] font-bold uppercase tracking-[0.02em] text-[#231a11]">
            {pkg.title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#5d4e3d]">
            {pkg.blurb ||
              "A timeless and practical guide. Add this title to your personal library."}{" "}
            <button
              type="button"
              onClick={() => setActiveBook(pkg)}
              className="inline font-semibold text-[#8f6b32] underline decoration-[#8f6b32]/60 underline-offset-2 transition hover:text-[#3a2b15] hover:decoration-[#3a2b15]"
            >
              Read more
            </button>
          </p>

          <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
            {pkg.amazon ? (
              <a
                href={pkg.amazon}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${formatTitle(pkg.title)} Amazon`}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#2b2116] bg-transparent text-sm font-semibold uppercase tracking-[0.12em] text-[#22180f] transition hover:bg-[#22180f] hover:text-[#f7e9cc]"
              >
                Amazon
              </a>
            ) : (
              <span className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#bfa785]/55 bg-[#e8dcc8] text-sm font-semibold uppercase tracking-[0.12em] text-[#7a6a55]">
                Direct
              </span>
            )}

            {isAfricaUser ? (
              ebookAvailable ? (
                <a
                  href={africaEbookLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${formatTitle(pkg.title)} E-book`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] text-sm font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11]"
                >
                  E-book
                </a>
              ) : (
                <span className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#bfa785]/55 bg-[#e8dcc8] text-sm font-semibold uppercase tracking-[0.12em] text-[#7a6a55]">
                  Coming soon
                </span>
              )
            ) : (
              <button
                type="button"
                onClick={() => addToCart(pkg)}
                disabled={!ebookAvailable}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] text-sm font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11] disabled:cursor-not-allowed disabled:border-[#bfa785]/55 disabled:bg-[#e8dcc8] disabled:text-[#7a6a55]"
              >
                {isInCart ? "In cart" : "E-book"}
              </button>
            )}
          </div>
        </div>
      </MotionReveal>
    );
  };

  return (
    <section id="books" className="bg-[#f5f1e8] text-[#1b1711]">
      <style>{`
        @keyframes featuredGlow {
          0%, 100% {
            box-shadow: 0 24px 60px -36px rgba(0,0,0,0.42), 0 0 0 1px rgba(170,136,82,0.48), inset 0 0 0 1px rgba(255,255,255,0.45);
          }
          50% {
            box-shadow: 0 32px 85px -34px rgba(0,0,0,0.52), 0 0 0 1px rgba(170,136,82,0.65), inset 0 0 0 1px rgba(255,255,255,0.6);
          }
        }
      `}</style>

      <Container className="py-20 md:py-24">
        <MotionReveal delay={40} distance={28}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d6642]">
                Book Collection
              </p>
              <h2 className="mt-3 text-[36px] font-black uppercase tracking-tight md:text-[42px]">
                Books
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#4e4336] md:text-base">
                {isAfricaUser
                  ? "African readers can complete e-book purchases through the regional checkout links."
                  : "Direct e-book purchases are delivered by email after payment is confirmed. Add more than one title to your cart and checkout once."}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {isLocalPreviewHost ? (
                <div className="rounded-md border border-[#c8ad7b] bg-[#fff8eb] p-1">
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a6242]">
                    Local preview
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { label: "Africa", value: "africa" },
                      { label: "World", value: "world" },
                    ].map((option) => {
                      const isActive = regionPreviewMode === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setRegionPreviewMode(option.value);
                            setActiveBook(null);
                          }}
                          className={`h-9 rounded-md px-3 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                            isActive
                              ? "bg-[#22180f] text-[#f7e9cc]"
                              : "text-[#4e3a1f] hover:bg-[#efe1c8]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {!isAfricaUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutStep("cart");
                    setIsCartOpen(true);
                  }}
                  className="inline-flex h-12 items-center justify-center gap-3 rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-sm font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11]"
                >
                  <CartIcon className="h-5 w-5" />
                  Cart
                  <span className="inline-flex min-w-7 justify-center rounded-full bg-[#f5ead2] px-2 py-1 text-xs text-[#22180f]">
                    {cartBooks.length}
                  </span>
                </button>
              ) : null}

            </div>
          </div>
        </MotionReveal>

        <div className="relative mt-10">
          {!showAllBooks && canScrollBooksLeft ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#f5f1e8] via-[#f5f1e8]/88 to-transparent" />
          ) : null}
          {!showAllBooks && canScrollBooksRight ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[#f5f1e8] via-[#f5f1e8]/90 to-transparent" />
          ) : null}

          <div
            id="books-track"
            ref={showAllBooks ? null : booksTrackRef}
            className={
              showAllBooks
                ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                : "flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-4 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            }
          >
            {books.map(renderBookCard)}
          </div>

          {!showAllBooks && canScrollBooksLeft ? (
            <SlideArrowButton
              direction="left"
              onClick={() => scrollBooks(-1)}
              ariaLabel="Scroll to previous books"
            />
          ) : null}

          {!showAllBooks && canScrollBooksRight ? (
            <SlideArrowButton
              direction="right"
              onClick={() => scrollBooks(1)}
              ariaLabel="Scroll to more books"
            />
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllBooks((currentValue) => !currentValue)}
            className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-[#c9ab77] bg-[#fff8eb] px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#4e3a1f] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)] transition hover:border-[#6d5530] hover:bg-[#22180f] hover:text-[#f7e9cc]"
          >
            {showAllBooks ? "Back To Slider" : `View All ${books.length} Books`}
          </button>
        </div>
      </Container>

      {cartToast && !isCartOpen ? (
        <div
          key={cartToast.id}
          role={cartToast.type === "error" ? "alert" : "status"}
          aria-live={cartToast.type === "error" ? "assertive" : "polite"}
          className={`fixed bottom-4 left-3 right-3 z-[140] rounded-lg border px-4 py-3 text-sm font-semibold shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)] sm:left-auto sm:right-5 sm:max-w-sm ${
            cartToast.type === "error"
              ? "border-[#edcabd] bg-[#fff5f1] text-[#8b3c26]"
              : "border-[#d8c59f] bg-[#20160d] text-[#f7e9cc]"
          }`}
        >
          {cartToast.message}
        </div>
      ) : null}

      {modalDetails ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
          onClick={() => setActiveBook(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-details-title"
        >
          <div
            className="flex h-[82vh] w-full max-w-2xl flex-col rounded-2xl border border-[#c4ac84] bg-[#fffaf0] p-6 shadow-[0_38px_88px_-42px_rgba(0,0,0,0.8)] md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a6242]">
                  Book Details
                </p>
                <h3
                  id="book-details-title"
                  className="mt-2 whitespace-pre-line text-xl font-extrabold uppercase leading-tight text-[#20160d] md:text-2xl"
                >
                  {modalDetails.book.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveBook(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#3b2a18] transition hover:bg-[#efe1c8] hover:text-black"
                aria-label="Close book details"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid min-h-0 flex-1 gap-4 sm:grid-cols-[180px_1fr]">
              <img
                src={modalDetails.book.image}
                alt={formatTitle(modalDetails.book.title)}
                onError={(event) => {
                  event.currentTarget.src = booksFallbackImage;
                }}
                className="hidden h-[230px] w-full rounded-xl border border-[#d8c59f] object-cover sm:block"
                loading="lazy"
              />
              <div className="flex min-h-0 flex-col">
                <p className="inline-flex rounded-full border border-[#d7c39f] bg-[#efe1c8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3a2b16]">
                  {modalDetails.priceTag}
                </p>
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[#4a3b2a]">
                    {modalDetails.description}
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {modalDetails.book.amazon ? (
                    <a
                      href={modalDetails.book.amazon}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center rounded-md border border-[#2b2116] bg-transparent px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#22180f] transition hover:bg-[#22180f] hover:text-[#f7e9cc]"
                    >
                      Amazon
                    </a>
                  ) : null}
                  {isAfricaUser ? (
                    modalDetails.book.paystackLink ? (
                      <a
                        href={modalDetails.book.paystackLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex h-10 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11] ${
                          modalDetails.book.amazon ? "" : "col-span-2"
                        }`}
                      >
                        E-book
                      </a>
                    ) : (
                      <span
                        className={`inline-flex h-10 items-center justify-center rounded-md border border-[#bfa785]/55 bg-[#e8dcc8] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6a55] ${
                          modalDetails.book.amazon ? "" : "col-span-2"
                        }`}
                      >
                        Coming soon
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(modalDetails.book)}
                      disabled={!modalDetails.ebookAvailable}
                      className={`inline-flex h-10 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11] ${
                        modalDetails.book.amazon ? "" : "col-span-2"
                      } disabled:cursor-not-allowed disabled:border-[#bfa785]/55 disabled:bg-[#e8dcc8] disabled:text-[#7a6a55]`}
                    >
                      {!modalDetails.ebookAvailable
                        ? "Coming soon"
                        : modalDetails.inCart
                          ? "View cart"
                          : "Add e-book"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCartOpen && !isAfricaUser ? (
        <div
          className="fixed inset-0 z-[130] bg-[#080604]/75 p-2 backdrop-blur-[3px] sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="E-book cart"
          onClick={closeCart}
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="flex max-h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[#cbb38b] bg-[#fff8eb] shadow-[0_32px_90px_-34px_rgba(0,0,0,0.9)] sm:max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#3c2b18] bg-[#20160d] px-4 py-4 text-[#fff4d6] sm:px-6 sm:py-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d8bb7c]">
                    E-book cart
                  </p>
                  <h3 className="mt-2 text-lg font-black uppercase leading-tight tracking-tight sm:text-2xl">
                    {checkoutStep === "success" ? "Order received" : "Complete your order"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#5b4126] text-[#f7e9cc] transition hover:border-[#d8bb7c] hover:bg-[#3a2b15]"
                  aria-label="Close cart"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {cartNotice ? (
                <div className="border-b border-[#d8c59f] bg-[#f7edda] px-4 py-3 text-xs font-medium leading-relaxed text-[#4d3a20] sm:px-6 sm:text-sm">
                  {cartNotice}
                </div>
              ) : null}

              {cartError ? (
                <div className="border-b border-[#edcabd] bg-[#fff5f1] px-4 py-3 text-xs font-medium leading-relaxed text-[#8b3c26] sm:px-6 sm:text-sm">
                  {cartError}
                </div>
              ) : null}

              {checkoutStep === "checkout" ? (
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#fff8eb] p-4 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#20160d]">{cartTotalLabel}</p>
                      <p className="break-all text-xs text-[#746348]">{buyerEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        destroyEmbeddedCheckout();
                        setCheckoutStep("cart");
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-[#c4ac84] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#2f2416] transition hover:bg-[#efe1c8]"
                    >
                      Back to cart
                    </button>
                  </div>
                  <div
                    ref={checkoutContainerRef}
                    className="min-h-[540px] overflow-hidden rounded-lg border border-[#e5d7bc] bg-white"
                  />
                </div>
              ) : checkoutStep === "success" ? (
                <div className="overflow-y-auto bg-[#fff8eb] px-5 py-8 text-center sm:px-8 sm:py-10">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f5df] text-[#28611f]">
                    <CartIcon className="h-7 w-7" />
                  </div>
                  <h4 className="mt-5 text-2xl font-black uppercase tracking-tight text-[#20160d]">
                    Check your email
                  </h4>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#5b4a33]">
                    {sessionStatus?.emailSent || sessionStatus?.fulfilled
                      ? "Your e-book delivery email has been sent. Keep the download links private."
                      : "Your payment was received. Delivery is being prepared and the order email remains your proof of purchase."}
                  </p>
                  {sessionStatus?.customerEmail ? (
                    <p className="mt-4 text-sm font-semibold text-[#20160d]">
                      {sessionStatus.customerEmail}
                    </p>
                  ) : null}
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={keepShopping}
                      className="inline-flex h-11 items-center justify-center rounded-md bg-[#22180f] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:bg-[#3a2b15]"
                    >
                      Keep shopping
                    </button>
                    <button
                      type="button"
                      onClick={closeCart}
                      className="inline-flex h-11 items-center justify-center rounded-md border border-[#c4ac84] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#2f2416] transition hover:bg-[#efe1c8]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 overflow-y-auto bg-[#fff8eb] lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-h-0 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-5 md:p-6">
                    {cartBooks.length ? (
                      cartBooks.map((book) => (
                        <div
                          key={book.id}
                          className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-[#dfcaa2] bg-[#fffdf6] p-3 shadow-[0_14px_34px_-30px_rgba(0,0,0,0.7)] sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:gap-4 md:grid-cols-[84px_minmax(0,1fr)_auto] md:p-4"
                        >
                          <img
                            src={book.image}
                            alt={formatTitle(book.title)}
                            onError={(event) => {
                              event.currentTarget.src = booksFallbackImage;
                            }}
                            className="h-20 w-16 rounded-md border border-[#dac7a4] object-cover sm:h-24 sm:w-[72px]"
                          />
                          <div className="min-w-0">
                            <h4 className="whitespace-pre-line text-[13px] font-extrabold uppercase leading-snug text-[#20160d] sm:text-sm">
                              {book.title}
                            </h4>
                            <p className="mt-1 text-sm font-semibold text-[#7a6242] sm:mt-2">
                              {getEbookDisplayPrice(book)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(book.id)}
                            className="col-span-2 inline-flex h-9 items-center justify-center rounded-md border border-[#d6bea0] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#6e2f1d] transition hover:bg-[#fff0e9] sm:col-span-1 sm:h-10"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex min-h-[170px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d0b582] bg-[#fffdf6] p-6 text-center sm:p-8 md:min-h-[220px]">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[#20160d] text-[#f7e9cc]">
                          <CartIcon className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#20160d]">
                          Your cart is empty
                        </p>
                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#62513a]">
                          Add an e-book from the collection to begin.
                        </p>
                      </div>
                    )}
                  </div>

                  <aside className="border-t border-[#e2cfaa] bg-[#f1e4cb] p-3 sm:p-5 md:p-6 lg:border-l lg:border-t-0">
                    <div className="mx-auto max-w-xl lg:max-w-none">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a6242]">
                        Summary
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-1">
                        <div className="min-w-0 rounded-lg border border-[#d6bea0] bg-[#fff8eb] px-3 py-3 sm:px-4">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a6242]">
                            Items
                          </span>
                          <span className="mt-1 block text-lg font-black leading-none text-[#20160d]">
                            {cartBooks.length}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-lg border border-[#d6bea0] bg-[#fff8eb] px-3 py-3 sm:px-4">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a6242]">
                            Total
                          </span>
                          <span className="mt-1 block break-words text-lg font-black leading-none text-[#20160d]">
                            {cartTotalLabel}
                          </span>
                        </div>
                      </div>

                      <label className="mt-4 block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5c4930]">
                          Delivery email
                        </span>
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={(event) => setBuyerEmail(event.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="h-11 w-full rounded-md border border-[#cbb38b] bg-[#fffdf6] px-4 text-sm text-[#20160d] outline-none transition placeholder:text-[#9a8668] focus:border-[#22180f] focus:ring-2 focus:ring-[#d9bf83]/40 sm:h-12"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleStartCheckout}
                        disabled={!cartBooks.length || isPreparingCheckout}
                        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md border border-[#22180f] bg-[#22180f] px-5 text-sm font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:bg-[#3a2b15] disabled:cursor-not-allowed disabled:border-[#8f8578] disabled:bg-[#8f8578] disabled:text-[#efe8dc] sm:h-12"
                      >
                        {isPreparingCheckout ? "Opening checkout..." : "Checkout"}
                      </button>
                    </div>
                  </aside>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
