import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Container from "./ui/Container";
import MotionReveal from "./ui/MotionReveal";
import "./Books.css";
import BookRatingPreview, { BookRatingSummary } from "./BookRatings";
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
const BOOKS_REGION_STORAGE_KEY = "tt_daniel_books_region";
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

function readBooksRegion(fallbackMode) {
  try {
    const storedMode = window.localStorage.getItem(BOOKS_REGION_STORAGE_KEY);
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

function BookArrow({ direction = "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
      style={direction === "left" ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function displayBookTitle(title) {
  return formatTitle(title).toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
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
  const canSelectBooksRegion =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const checkoutContainerRef = useRef(null);
  const embeddedCheckoutRef = useRef(null);
  const booksTrackRef = useRef(null);
  const bookDetailsRef = useRef(null);
  const [booksRegion, setBooksRegion] = useState(() => {
    const detectedRegion = detectAfricaTimezone() ? "africa" : "world";
    return canSelectBooksRegion ? readBooksRegion(detectedRegion) : detectedRegion;
  });
  const isAfricaUser = booksRegion === "africa";
  const [activeBook, setActiveBook] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
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
    if (!canSelectBooksRegion) return;

    try {
      window.localStorage.setItem(BOOKS_REGION_STORAGE_KEY, booksRegion);
    } catch {
      // Keep the selected region for this visit when storage is unavailable.
    }
  }, [booksRegion, canSelectBooksRegion]);

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
    if (!activeBook) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = bookDetailsRef.current;
    if (showReviewForm) {
      dialog.querySelector('.book-reviews')?.scrollIntoView({ block: 'start' });
      dialog.querySelector('.book-star-picker input')?.focus({ preventScroll: true });
    } else {
      dialog.querySelector("button")?.focus();
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setActiveBook(null);
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [activeBook, showReviewForm]);

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

    const cards = [...track.children];
    const firstOffset = cards[0].offsetLeft;
    let nearest = 0;
    cards.forEach((card, index) => {
      if (Math.abs(card.offsetLeft - firstOffset - track.scrollLeft) <
          Math.abs(cards[nearest].offsetLeft - firstOffset - track.scrollLeft)) nearest = index;
    });
    const target = cards[Math.max(0, Math.min(nearest + direction, cards.length - 1))];
    track.scrollTo({
      left: target.offsetLeft - firstOffset,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  const renderBookCard = (book, index) => {
    const inCart = isDirectEbookAvailable(book) && cartBookIds.includes(book.id);
    const available = isAfricaUser ? Boolean(book.paystackLink) : isDirectEbookAvailable(book);
    const title = displayBookTitle(book.title);

    return (
      <article key={book.id} className="book-card">
        <button type="button" className="book-cover" onClick={() => { setShowReviewForm(false); setActiveBook(book); }}
          aria-label={`Read about ${title}`}>
          {index === 0 && <span className="book-release">New release</span>}
          <img src={book.image} alt={title} loading="lazy" decoding="async"
            onError={(event) => {
              if (!event.currentTarget.src.endsWith(booksFallbackImage)) {
                event.currentTarget.src = booksFallbackImage;
              }
            }} />
        </button>
        <div className="book-card-content">
          <p className="book-author">By TT Daniel</p>
          <h3><button type="button" onClick={() => { setShowReviewForm(false); setActiveBook(book); }}>{title}</button></h3>
          <BookRatingSummary title={title} onOpen={() => { setShowReviewForm(true); setActiveBook(book); }} />
          <p className="book-description">{book.blurb || "A practical guide for your personal library."}</p>
          <button type="button" className="book-details-link" onClick={() => { setShowReviewForm(false); setActiveBook(book); }}
            aria-label={`Read more about ${title}`}>Read more <BookArrow /></button>
          <div className="book-purchase">
            <p className="book-price"><span>E-book</span>{getDisplayPrice(book, isAfricaUser)}</p>
            {isAfricaUser && available ? (
              <a href={book.paystackLink} target="_blank" rel="noopener noreferrer"
                className="books-button books-button-primary" aria-label={`Buy ${title} e-book`}>Get e-book <BookArrow /></a>
            ) : (
              <button type="button" className="books-button books-button-primary"
                disabled={!available} onClick={() => addToCart(book)}
                aria-label={available ? `${inCart ? "View cart for" : "Add to cart:"} ${title}` : `${title} e-book coming soon`}>
                {available ? (inCart ? "View cart" : "Get e-book") : "Coming soon"}
                {available && <CartIcon className="h-[18px] w-[18px]" />}
              </button>
            )}
            {book.amazon ? (
              <a className="book-amazon" href={book.amazon} target="_blank" rel="noopener noreferrer"
                aria-label={`Shop ${title} on Amazon`}>Also on Amazon <span aria-hidden="true">↗</span></a>
            ) : <span className="book-direct-note">Available here</span>}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section id="books" className="books-section" aria-labelledby="books-heading">
      <Container className="books-container">
        <MotionReveal distance={18}>
          <div className="books-header">
            <div>
              <p className="books-label">The book collection</p>
              <h2 id="books-heading">A deeper faith.<br /><span>A richer everyday life.</span></h2>
              <p className="books-intro">Explore books by TT Daniel on faith, prayer, relationships, and living with purpose.</p>
            </div>
            {!isAfricaUser && (
              <button type="button" className="books-button books-cart-button"
                onClick={() => { setCheckoutStep("cart"); setIsCartOpen(true); }}>
                <CartIcon className="h-5 w-5" /> Your cart <span>{cartBooks.length}</span>
              </button>
            )}
          </div>
        </MotionReveal>

        {canSelectBooksRegion && (
          <div className="books-region-selector">
            <span id="books-region-label">Shopping region</span>
            <div className="books-region-options" role="group" aria-labelledby="books-region-label">
              {[{ label: "Africa", value: "africa" }, { label: "Rest of the world", value: "world" }].map((option) => (
                <button key={option.value} type="button" aria-pressed={booksRegion === option.value}
                  onClick={() => { setBooksRegion(option.value); setActiveBook(null); }}>{option.label}</button>
              ))}
            </div>
            <p aria-live="polite">{isAfricaUser ? "Prices in GHS" : "Prices in USD"}</p>
          </div>
        )}

        <div className="books-toolbar">
          <p>{books.length} books <span>· Find your next read</span></p>
          <button type="button" className="books-view-toggle" aria-controls="books-track"
            aria-expanded={showAllBooks} onClick={() => setShowAllBooks((value) => !value)}>
            {showAllBooks ? "Back to browsing" : "View all books"} <BookArrow />
          </button>
        </div>
        <div id="books-track" ref={booksTrackRef}
          className={showAllBooks ? "books-grid" : "books-track"}
          role="region" aria-label="Book collection" tabIndex={showAllBooks ? undefined : 0}
          onKeyDown={(event) => {
            if (showAllBooks || event.target !== event.currentTarget) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              scrollBooks(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}>
          {books.map(renderBookCard)}
        </div>
        <div className="books-navigation">
          {showAllBooks && <p>Find a book that speaks to your season.</p>}
          {!showAllBooks && (
            <div className="books-arrows">
              <button type="button" disabled={!canScrollBooksLeft} onClick={() => scrollBooks(-1)}
                aria-label="Previous books" aria-controls="books-track"><BookArrow direction="left" /></button>
              <button type="button" disabled={!canScrollBooksRight} onClick={() => scrollBooks(1)}
                aria-label="Next books" aria-controls="books-track"><BookArrow /></button>
            </div>
          )}
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
        <div className="book-dialog-backdrop" onClick={() => setActiveBook(null)}>
          <div ref={bookDetailsRef} className="book-dialog" role="dialog" aria-modal="true"
            aria-labelledby="book-details-title" onClick={(event) => event.stopPropagation()}>
            <div className="book-dialog-header">
              <p>Inside the book</p>
              <button type="button" className="book-dialog-close" onClick={() => setActiveBook(null)} aria-label="Close book details">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="book-dialog-body">
              <div className="book-dialog-cover">
                <img src={modalDetails.book.image} alt={displayBookTitle(modalDetails.book.title)} />
              </div>
              <div>
                <p className="book-author">By TT Daniel</p>
                <h3 id="book-details-title">{displayBookTitle(modalDetails.book.title)}</h3>
                <p className="book-dialog-description">{modalDetails.description}</p>
              </div>
              <BookRatingPreview key={modalDetails.book.id} />
            </div>
            <div className="book-dialog-purchase">
              <p className="book-price"><span>E-book</span>{modalDetails.priceTag}</p>
              <div className="book-dialog-actions">
                {modalDetails.book.amazon && (
                  <a href={modalDetails.book.amazon} target="_blank" rel="noopener noreferrer"
                    className="books-button books-button-secondary">Amazon <span aria-hidden="true">↗</span></a>
                )}
                {isAfricaUser && modalDetails.ebookAvailable ? (
                  <a href={modalDetails.book.paystackLink} target="_blank" rel="noopener noreferrer"
                    className="books-button books-button-primary">Get e-book <BookArrow /></a>
                ) : (
                  <button type="button" className="books-button books-button-primary"
                    onClick={() => addToCart(modalDetails.book)} disabled={!modalDetails.ebookAvailable}>
                    {!modalDetails.ebookAvailable ? "Coming soon" : modalDetails.inCart ? "View cart" : "Get e-book"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCartOpen && !isAfricaUser ? (
        <div
          className="fixed inset-0 z-[130] bg-[#191919]/75 p-2 backdrop-blur-[3px] sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="E-book cart"
          onClick={closeCart}
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#deded7] bg-[#ffffff] shadow-[0_32px_90px_-34px_rgba(0,0,0,0.9)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-3rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#383833] bg-[#20201e] px-4 py-4 text-[#ffffff] sm:px-6 sm:py-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#d4d4cd]">
                    E-book cart
                  </p>
                  <h3 className="mt-2 text-lg font-medium leading-tight tracking-tight sm:text-2xl">
                    {checkoutStep === "success" ? "Order received" : "Complete your order"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#56564f] text-[#ffffff] transition hover:border-[#d4d4cd] hover:bg-[#41413b]"
                  aria-label="Close cart"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {cartNotice ? (
                <div className="border-b border-[#e5e5de] bg-[#f4f4f0] px-4 py-3 text-xs font-medium leading-relaxed text-[#565650] sm:px-6 sm:text-sm">
                  {cartNotice}
                </div>
              ) : null}

              {cartError ? (
                <div className="border-b border-[#edcabd] bg-[#fff5f1] px-4 py-3 text-xs font-medium leading-relaxed text-[#8b3c26] sm:px-6 sm:text-sm">
                  {cartError}
                </div>
              ) : null}

              {checkoutStep === "checkout" ? (
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#ffffff] p-4 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#20201e]">{cartTotalLabel}</p>
                      <p className="break-all text-xs text-[#71716a]">{buyerEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        destroyEmbeddedCheckout();
                        setCheckoutStep("cart");
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-[#deded7] px-4 text-xs font-semibold text-[#20201e] transition hover:bg-[#f3f3ef]"
                    >
                      Back to cart
                    </button>
                  </div>
                  <div
                    ref={checkoutContainerRef}
                    className="min-h-[540px] overflow-hidden rounded-lg border border-[#e5e5de] bg-white"
                  />
                </div>
              ) : checkoutStep === "success" ? (
                <div className="overflow-y-auto bg-[#ffffff] px-5 py-8 text-center sm:px-8 sm:py-10">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f5df] text-[#28611f]">
                    <CartIcon className="h-7 w-7" />
                  </div>
                  <h4 className="mt-5 text-2xl font-medium tracking-tight text-[#20201e]">
                    Check your email
                  </h4>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#666660]">
                    {sessionStatus?.emailSent || sessionStatus?.fulfilled
                      ? "Your e-book delivery email has been sent. Keep the download links private."
                      : "Your payment was received. Delivery is being prepared and the order email remains your proof of purchase."}
                  </p>
                  {sessionStatus?.customerEmail ? (
                    <p className="mt-4 text-sm font-semibold text-[#20201e]">
                      {sessionStatus.customerEmail}
                    </p>
                  ) : null}
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={keepShopping}
                      className="inline-flex h-11 items-center justify-center rounded-md bg-[#20201e] px-6 text-sm font-semibold text-[#ffffff] transition hover:bg-[#41413b]"
                    >
                      Keep shopping
                    </button>
                    <button
                      type="button"
                      onClick={closeCart}
                      className="inline-flex h-11 items-center justify-center rounded-md border border-[#deded7] px-6 text-sm font-semibold text-[#20201e] transition hover:bg-[#f3f3ef]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 overflow-y-auto bg-[#ffffff] lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-h-0 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-5 md:p-6">
                    {cartBooks.length ? (
                      cartBooks.map((book) => (
                        <div
                          key={book.id}
                          className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-[#e5e5de] bg-[#ffffff] p-3 shadow-[0_14px_34px_-30px_rgba(0,0,0,0.7)] sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:gap-4 md:grid-cols-[84px_minmax(0,1fr)_auto] md:p-4"
                        >
                          <img
                            src={book.image}
                            alt={formatTitle(book.title)}
                            onError={(event) => {
                              event.currentTarget.src = booksFallbackImage;
                            }}
                            className="h-20 w-16 rounded-md border border-[#e5e5de] object-contain sm:h-24 sm:w-[72px]"
                          />
                          <div className="min-w-0">
                            <h4 className="whitespace-pre-line text-[13px] font-medium leading-snug text-[#20201e] sm:text-sm">
                              {displayBookTitle(book.title)}
                            </h4>
                            <p className="mt-1 text-sm font-semibold text-[#71716a] sm:mt-2">
                              {getEbookDisplayPrice(book)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(book.id)}
                            className="col-span-2 inline-flex h-11 items-center justify-center rounded-md border border-[#deded7] px-4 text-xs font-semibold text-[#6e2f1d] transition hover:bg-[#fff0e9] sm:col-span-1 sm:h-10"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex min-h-[170px] flex-col items-center justify-center rounded-lg border border-dashed border-[#deded7] bg-[#ffffff] p-6 text-center sm:p-8 md:min-h-[220px]">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[#20201e] text-[#ffffff]">
                          <CartIcon className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-[#20201e]">
                          Your cart is empty
                        </p>
                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#666660]">
                          Add an e-book from the collection to begin.
                        </p>
                      </div>
                    )}
                  </div>

                  <aside className="border-t border-[#e5e5de] bg-[#f6f6f3] p-3 sm:p-5 md:p-6 lg:border-l lg:border-t-0">
                    <div className="mx-auto max-w-xl lg:max-w-none">
                      <p className="text-[11px] font-semibold text-[#71716a]">
                        Summary
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-1">
                        <div className="min-w-0 rounded-lg border border-[#deded7] bg-[#ffffff] px-3 py-3 sm:px-4">
                          <span className="block text-[11px] font-semibold text-[#71716a]">
                            Items
                          </span>
                          <span className="mt-1 block text-lg font-medium leading-none text-[#20201e]">
                            {cartBooks.length}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-lg border border-[#deded7] bg-[#ffffff] px-3 py-3 sm:px-4">
                          <span className="block text-[11px] font-semibold text-[#71716a]">
                            Total
                          </span>
                          <span className="mt-1 block break-words text-lg font-medium leading-none text-[#20201e]">
                            {cartTotalLabel}
                          </span>
                        </div>
                      </div>

                      <label className="mt-4 block">
                        <span className="mb-2 block text-xs font-semibold text-[#666660]">
                          Delivery email
                        </span>
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={(event) => setBuyerEmail(event.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="h-11 w-full rounded-md border border-[#deded7] bg-[#ffffff] px-4 text-sm text-[#20201e] outline-none transition placeholder:text-[#898982] focus:border-[#20201e] focus:ring-2 focus:ring-[#b6b6ac]/40 sm:h-12"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleStartCheckout}
                        disabled={!cartBooks.length || isPreparingCheckout}
                        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md border border-[#20201e] bg-[#20201e] px-5 text-sm font-semibold text-[#ffffff] transition hover:bg-[#41413b] disabled:cursor-not-allowed disabled:border-[#85857d] disabled:bg-[#85857d] disabled:text-[#ffffff] sm:h-12"
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
