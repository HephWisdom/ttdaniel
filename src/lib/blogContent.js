const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h2",
  "h3",
  "h4",
]);

const BLOCKED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "svg",
  "math",
  "meta",
  "link",
]);

const SAFE_HREF_PATTERN = /^(https?:|mailto:|tel:|\/|#)/i;

function isSafeHref(href = "") {
  return SAFE_HREF_PATTERN.test(href.trim());
}

function normalizeTagName(tagName) {
  const lowerTag = String(tagName || "").toLowerCase();
  if (lowerTag === "b") return "strong";
  if (lowerTag === "i") return "em";
  return lowerTag;
}

function sanitizeElementNode(node, documentRef) {
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.nodeValue || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const normalizedTag = normalizeTagName(node.tagName);
  if (BLOCKED_TAGS.has(normalizedTag)) {
    return null;
  }

  if (!ALLOWED_TAGS.has(normalizedTag)) {
    const fragment = documentRef.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeElementNode(child, documentRef);
      if (sanitizedChild) fragment.appendChild(sanitizedChild);
    });
    return fragment;
  }

  const nextEl = documentRef.createElement(normalizedTag);

  if (normalizedTag === "a") {
    const href = (node.getAttribute("href") || "").trim();
    if (isSafeHref(href)) {
      nextEl.setAttribute("href", href);
      const isExternal = /^https?:/i.test(href);
      if (isExternal) {
        nextEl.setAttribute("target", "_blank");
        nextEl.setAttribute("rel", "noopener noreferrer");
      }
    } else {
      nextEl.setAttribute("href", "#");
    }
  }

  Array.from(node.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeElementNode(child, documentRef);
    if (sanitizedChild) nextEl.appendChild(sanitizedChild);
  });

  return nextEl;
}

export function hasHtmlContent(content = "") {
  return /<\/?[a-z][\s\S]*>/i.test(String(content || ""));
}

export function sanitizeBlogHtml(content = "") {
  const value = String(content || "");
  if (!value.trim()) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(value, "text/html");
  const sanitizedDoc = document.implementation.createHTMLDocument("");
  const container = sanitizedDoc.createElement("div");

  Array.from(parsed.body.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeElementNode(child, sanitizedDoc);
    if (sanitizedChild) container.appendChild(sanitizedChild);
  });

  return container.innerHTML.trim();
}

export function toPlainBlogText(content = "") {
  const noHtml = String(content || "").replace(/<[^>]*>/g, " ");
  return noHtml
    .replace(/[#*_`>[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
