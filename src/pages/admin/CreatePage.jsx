import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CoverUpload from "../../components/admin/CoverUpload";
import Editor from "../../components/admin/Editor";
import PublishSettings from "../../components/admin/PublishSettings";
import { PlusCircleIcon } from "../../components/admin/AdminIcons";
import useAdminBlog from "../../components/admin/useAdminBlog";
import { defaultCreateValues, initialCreateOptions } from "../../data/mockData";
import useWordCount from "../../hooks/useWordCount";
import {
  hasHtmlContent,
  hasMeaningfulBlogContent,
  sanitizeBlogHtml,
  toPlainBlogText,
} from "../../lib/blogContent";
import {
  deleteBlogDraft,
  fetchBlogDraft,
  fetchBlogPostById,
  isUsingSupabase,
  saveBlogDraft,
  uploadBlogImage,
} from "../../lib/blogStore";

function toDateTimeInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localMs = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localMs).toISOString().slice(0, 16);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isEditorValueEmpty(value = "") {
  const plainText = String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .trim();

  return !plainText && !/<img[\s>]/i.test(String(value));
}

function plainTextToEditorHtml(content = "") {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let paragraphBuffer = [];
  let listBuffer = [];
  let listType = "ul";

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const paragraphHtml = paragraphBuffer.map((line) => escapeHtml(line)).join("<br />");
    blocks.push(`<p>${paragraphHtml}</p>`);
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    const listItems = listBuffer.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    blocks.push(`<${listType}>${listItems}</${listType}>`);
    listBuffer = [];
    listType = "ul";
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^###\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ""))}</h3>`);
      return;
    }

    if (/^##\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ""))}</h2>`);
      return;
    }

    if (/^#\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ""))}</h1>`);
      return;
    }

    if (/^>\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${escapeHtml(line.replace(/^>\s+/, ""))}</blockquote>`);
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (listBuffer.length && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      if (listBuffer.length && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listBuffer.push(line.replace(/^\d+\.\s+/, ""));
      return;
    }

    flushList();
    paragraphBuffer.push(line);
  });

  flushParagraph();
  flushList();

  return sanitizeBlogHtml(blocks.join(""));
}

function normalizeEditorValue(content = "") {
  const value = String(content || "");
  if (!value.trim()) return "";

  if (hasHtmlContent(value)) {
    const sanitized = sanitizeBlogHtml(value);
    return isEditorValueEmpty(sanitized) ? "" : sanitized;
  }

  return plainTextToEditorHtml(value);
}

function normalizeLinkUrl(input = "") {
  const value = input.trim();
  if (!value) return "";
  return /^(https?:|mailto:|tel:|\/|#)/i.test(value) ? value : `https://${value}`;
}

function normalizeImageUrl(input = "") {
  const value = input.trim();
  if (!value) return "";
  return /^(https?:|data:|\/)/i.test(value) ? value : `https://${value}`;
}

function normalizeTagValue(value = "") {
  return String(value || "").replace(/,+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTagList(tags = []) {
  const seen = new Set();

  return (Array.isArray(tags) ? tags : [])
    .map((tag) => normalizeTagValue(tag))
    .filter((tag) => {
      if (!tag) return false;

      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function appendPendingTag(tags = [], pendingValue = "") {
  const normalizedTags = normalizeTagList(tags);
  const nextTag = normalizeTagValue(pendingValue);

  if (!nextTag) return normalizedTags;
  if (normalizedTags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
    return normalizedTags;
  }

  return [...normalizedTags, nextTag];
}

function areTagListsEqual(listA = [], listB = []) {
  if (listA.length !== listB.length) return false;
  return listA.every((tag, index) => tag === listB[index]);
}

function hasMeaningfulDraftValue(values = {}) {
  return Boolean(
    String(values.title || "").trim() ||
      String(values.excerpt || "").trim() ||
      hasMeaningfulBlogContent(values.content || "") ||
      String(values.image || "").trim() ||
      String(values.author || "").trim() ||
      String(values.publishAt || "").trim() ||
      (Array.isArray(values.tags) && values.tags.some((tag) => String(tag || "").trim()))
  );
}

function getSelectionElement(node) {
  if (!node) return null;
  return node.nodeType === 3 ? node.parentElement : node;
}

function getClosestEditorBlockFromNode(editor, node) {
  const element = getSelectionElement(node);
  if (!element || !editor?.contains(element)) return null;
  return element.closest("p,div,h1,h2,h3,blockquote,pre,li");
}

function getClosestEditorBlock(editor, range) {
  return getClosestEditorBlockFromNode(editor, range?.commonAncestorContainer);
}

function getClosestEditorList(editor, range) {
  const element = getSelectionElement(range?.commonAncestorContainer);
  if (!element || !editor?.contains(element)) return null;
  return element.closest("ul,ol");
}

function getClosestInlineQuote(editor, range) {
  const element = getSelectionElement(range?.commonAncestorContainer);
  if (!element || !editor?.contains(element)) return null;
  return element.closest("q");
}

function getClosestEditorLink(editor, range) {
  const element = getSelectionElement(range?.commonAncestorContainer);
  if (!element || !editor?.contains(element)) return null;
  return element.closest("a");
}

function getClosestInlineFormat(editor, range, selector) {
  const element = getSelectionElement(range?.commonAncestorContainer);
  if (!element || !editor?.contains(element)) return null;
  return element.closest(selector);
}

function normalizeTextAlignment(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "start") return "left";
  if (normalized === "end") return "right";
  if (normalized === "left" || normalized === "center" || normalized === "right") {
    return normalized;
  }
  return "";
}

function getBlockAlignment(block) {
  if (!block) return "left";

  return (
    normalizeTextAlignment(block.getAttribute?.("data-align")) ||
    normalizeTextAlignment(block.getAttribute?.("align")) ||
    normalizeTextAlignment(block.style?.textAlign) ||
    "left"
  );
}

function createListItemsFromText(sourceText = "") {
  const normalizedText = String(sourceText || "").replace(/\r\n/g, "\n");
  const items = normalizedText
    .split(/\n+/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+\.\s+/, "")
    )
    .filter(Boolean);

  return items.length > 0 ? items : ["List item"];
}

function getActiveToolbarKeys(editor) {
  if (!editor || typeof window === "undefined" || typeof document === "undefined") {
    return [];
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return [];
  }

  const anchorNode = selection.anchorNode;
  const anchorElement =
    anchorNode?.nodeType === 3 ? anchorNode.parentElement : anchorNode;

  if (!anchorElement || !editor.contains(anchorElement)) {
    return [];
  }

  const nextKeys = [];

  if (document.queryCommandState?.("bold")) nextKeys.push("bold");
  if (document.queryCommandState?.("italic")) nextKeys.push("italic");
  if (document.queryCommandState?.("underline")) nextKeys.push("underline");
  if (document.queryCommandState?.("insertUnorderedList")) nextKeys.push("bullet-list");
  if (document.queryCommandState?.("insertOrderedList")) nextKeys.push("ordered-list");

  const blockElement = anchorElement.closest("h1, h2, h3, p, div, blockquote, pre, ul, ol, li");
  const listElement = anchorElement.closest("ul, ol");
  const quoteElement = anchorElement.closest("q, blockquote");
  const linkElement = anchorElement.closest("a");
  const blockTag = blockElement?.tagName?.toLowerCase() || "";
  const listTag = listElement?.tagName?.toLowerCase() || "";
  const quoteTag = quoteElement?.tagName?.toLowerCase() || "";
  const linkTag = linkElement?.tagName?.toLowerCase() || "";
  const textAlignment = getBlockAlignment(blockElement);

  if (blockTag === "h1") nextKeys.push("heading1");
  if (blockTag === "h2") nextKeys.push("heading2");
  if (blockTag === "h3") nextKeys.push("heading3");
  if (quoteTag === "q" || blockTag === "blockquote") nextKeys.push("quote");
  if (linkTag === "a") nextKeys.push("link");
  if (blockTag === "p" || blockTag === "div") nextKeys.push("paragraph");
  if (listTag === "ul") nextKeys.push("bullet-list");
  if (listTag === "ol") nextKeys.push("ordered-list");
  if (textAlignment === "center") nextKeys.push("align-center");
  else if (textAlignment === "right") nextKeys.push("align-right");
  else nextKeys.push("align-left");

  return [...new Set(nextKeys)];
}

export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const {
    posts,
    isPublishing,
    savePost,
    setFeedbackNotice,
    clearFeedback,
  } = useAdminBlog();
  const [isVisible, setIsVisible] = useState(false);
  const [titleValue, setTitleValue] = useState(defaultCreateValues.title);
  const [bodyValue, setBodyValue] = useState(() => normalizeEditorValue(defaultCreateValues.content));
  const [excerptValue, setExcerptValue] = useState(defaultCreateValues.excerpt);
  const [authorValue, setAuthorValue] = useState(defaultCreateValues.author);
  const [publishAtValue, setPublishAtValue] = useState(defaultCreateValues.publishAt);
  const [tagValues, setTagValues] = useState(() => normalizeTagList(defaultCreateValues.tags));
  const [tagInput, setTagInput] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(defaultCreateValues.image);
  const [options, setOptions] = useState(initialCreateOptions);
  const [activeToolbarKeys, setActiveToolbarKeys] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [remoteEditPost, setRemoteEditPost] = useState(null);
  const [isLoadingEditPost, setIsLoadingEditPost] = useState(false);
  const bodyInputRef = useRef(null);
  const initializedEditSourceRef = useRef("");
  const normalizedBodyValue = useMemo(() => normalizeEditorValue(bodyValue), [bodyValue]);
  const wordCount = useWordCount(titleValue, toPlainBlogText(normalizedBodyValue));
  const isEditing = Boolean(editId);
  const editingPost = useMemo(() => {
    if (!editId) return null;
    return posts.find((post) => String(post.id) === String(editId)) || remoteEditPost;
  }, [editId, posts, remoteEditPost]);
  const isMissingEditPost = isEditing && !isLoadingEditPost && !editingPost;

  const replaceBodyValue = useCallback((nextValue) => {
    setBodyValue(normalizeEditorValue(nextValue));
  }, []);

  const applyPostToEditor = useCallback(
    (post) => {
      if (!post) return;

      clearFeedback();
      setTitleValue(post.title || "");
      replaceBodyValue(post.content || "");
      setExcerptValue(post.excerpt || "");
      setAuthorValue(post.author || defaultCreateValues.author);
      setPublishAtValue(toDateTimeInputValue(post.createdAt));
      setTagValues(normalizeTagList(post.tags));
      setTagInput("");
      setCoverFile(null);
      setCoverPreview(post.image || "");
      setOptions((prev) => ({
        ...prev,
        allowComments:
          typeof post.allowComments === "boolean" ? post.allowComments : prev.allowComments,
        featuredArticle:
          typeof post.isFeatured === "boolean" ? post.isFeatured : prev.featuredArticle,
        notifySubscribers: false,
        seoOptimized:
          typeof post.seoEnabled === "boolean" ? post.seoEnabled : prev.seoOptimized,
      }));
      setIsPreviewOpen(false);
      setActiveToolbarKeys([]);
    },
    [clearFeedback, replaceBodyValue]
  );

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!coverPreview || !coverPreview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  useEffect(() => {
    if (!editId) {
      setRemoteEditPost(null);
      setIsLoadingEditPost(false);
      initializedEditSourceRef.current = "";
      return;
    }

    const localMatch = posts.find((post) => String(post.id) === String(editId));
    if (localMatch) {
      setRemoteEditPost(localMatch);
      setIsLoadingEditPost(false);
      return;
    }

    let isActive = true;
    setIsLoadingEditPost(true);

    const loadEditPost = async () => {
      try {
        const post = await fetchBlogPostById(editId);
        if (!isActive) return;
        setRemoteEditPost(post);
      } catch (error) {
        if (!isActive) return;
        setRemoteEditPost(null);
        setFeedbackNotice({
          tone: "warning",
          message: error.message || "Unable to load the selected article for editing.",
        });
      } finally {
        if (isActive) {
          setIsLoadingEditPost(false);
        }
      }
    };

    loadEditPost();

    return () => {
      isActive = false;
    };
  }, [editId, posts, setFeedbackNotice]);

  useEffect(() => {
    if (!isEditing || !editingPost) return;

    const sourceKey = `${editId}:${editingPost.createdAt || ""}:${editingPost.title || ""}`;
    if (initializedEditSourceRef.current === sourceKey) return;
    initializedEditSourceRef.current = sourceKey;

    const frameId = window.requestAnimationFrame(() => {
      applyPostToEditor(editingPost);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [applyPostToEditor, editId, editingPost, isEditing]);

  useEffect(() => {
    if (editId) return;

    let isActive = true;

    const loadDraft = async () => {
      try {
        const draft = await fetchBlogDraft();
        if (!isActive) return;

        if (!draft) {
          setTitleValue(defaultCreateValues.title);
          replaceBodyValue(defaultCreateValues.content);
          setExcerptValue(defaultCreateValues.excerpt);
          setAuthorValue(defaultCreateValues.author);
          setPublishAtValue(defaultCreateValues.publishAt);
          setTagValues(normalizeTagList(defaultCreateValues.tags));
          setTagInput("");
          setCoverFile(null);
          setCoverPreview(defaultCreateValues.image);
          setOptions(initialCreateOptions);
          return;
        }

        setTitleValue(draft.title || "");
        replaceBodyValue(draft.content || "");
        setExcerptValue(draft.excerpt || "");
        setAuthorValue(draft.author || defaultCreateValues.author);
        setPublishAtValue(toDateTimeInputValue(draft.publishAt));
        setTagValues(normalizeTagList(draft.tags));
        setTagInput("");
        setCoverFile(null);
        setCoverPreview(draft.image || "");
        setOptions((prev) => ({
          ...prev,
          allowComments:
            typeof draft.allowComments === "boolean" ? draft.allowComments : prev.allowComments,
          featuredArticle:
            typeof draft.isFeatured === "boolean" ? draft.isFeatured : prev.featuredArticle,
          notifySubscribers: false,
          seoOptimized:
            typeof draft.seoEnabled === "boolean" ? draft.seoEnabled : prev.seoOptimized,
        }));
      } catch (error) {
        if (!isActive) return;

        setFeedbackNotice({
          tone: "warning",
          message: error.message || "Unable to load the shared draft.",
        });
      }
    };

    loadDraft();

    return () => {
      isActive = false;
    };
  }, [editId, replaceBodyValue, setFeedbackNotice]);

  const resetEditorState = () => {
    setTitleValue(defaultCreateValues.title);
    replaceBodyValue(defaultCreateValues.content);
    setExcerptValue(defaultCreateValues.excerpt);
    setAuthorValue(defaultCreateValues.author);
    setPublishAtValue(defaultCreateValues.publishAt);
    setTagValues(normalizeTagList(defaultCreateValues.tags));
    setTagInput("");
    setCoverFile(null);
    setCoverPreview(defaultCreateValues.image);
    setOptions(initialCreateOptions);
    setIsPreviewOpen(false);
    setActiveToolbarKeys([]);
  };

  useEffect(() => {
    const editor = bodyInputRef.current;
    if (!editor || typeof document === "undefined") return;

    const syncToolbarState = () => {
      setActiveToolbarKeys(getActiveToolbarKeys(bodyInputRef.current));
    };

    try {
      document.execCommand("styleWithCSS", false, false);
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      // Ignore unsupported rich-text commands.
    }

    document.addEventListener("selectionchange", syncToolbarState);
    editor.addEventListener("keyup", syncToolbarState);
    editor.addEventListener("mouseup", syncToolbarState);
    editor.addEventListener("focus", syncToolbarState);
    editor.addEventListener("blur", syncToolbarState);

    return () => {
      document.removeEventListener("selectionchange", syncToolbarState);
      editor.removeEventListener("keyup", syncToolbarState);
      editor.removeEventListener("mouseup", syncToolbarState);
      editor.removeEventListener("focus", syncToolbarState);
      editor.removeEventListener("blur", syncToolbarState);
    };
  }, [isPreviewOpen]);

  const syncBodyFromEditor = () => {
    const editor = bodyInputRef.current;
    if (!editor) return;
    setBodyValue(isEditorValueEmpty(editor.innerHTML) ? "" : editor.innerHTML);
    setActiveToolbarKeys(getActiveToolbarKeys(editor));
  };

  const runEditorCommand = (command, value = null) => {
    const editor = bodyInputRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus();

    try {
      document.execCommand("styleWithCSS", false, false);
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand(command, false, value);
    } catch {
      // Ignore unsupported rich-text commands.
    }

    syncBodyFromEditor();
  };

  const applyFormatBlock = (tagName) => {
    const editor = bodyInputRef.current;
    if (!editor || typeof document === "undefined") return;

    const selectionRange = getEditorSelectionRange();
    const currentBlock = selectionRange ? getClosestEditorBlock(editor, selectionRange) : null;
    const currentTagName = currentBlock?.tagName?.toLowerCase() || "";
    const nextTagName = currentTagName === tagName ? "p" : tagName;

    editor.focus();

    try {
      document.execCommand("styleWithCSS", false, false);
      document.execCommand("defaultParagraphSeparator", false, "p");
      const applied = document.execCommand("formatBlock", false, nextTagName.toUpperCase());
      if (!applied) {
        document.execCommand("formatBlock", false, `<${nextTagName}>`);
      }
    } catch {
      // Ignore unsupported rich-text commands.
    }

    syncBodyFromEditor();
  };

  const getEditorSelectionRange = () => {
    if (typeof window === "undefined") return null;

    const editor = bodyInputRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    return range.cloneRange();
  };

  const restoreEditorSelection = (range) => {
    if (!range || typeof window === "undefined") return false;

    const selection = window.getSelection();
    if (!selection) return false;

    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const placeCaretAtEnd = (node) => {
    if (!node || typeof window === "undefined" || typeof document === "undefined") return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    if (node.nodeType === 3) {
      range.setStart(node, node.textContent?.length || 0);
      range.collapse(true);
    } else if (node.childNodes.length === 0) {
      range.setStartAfter(node);
      range.collapse(true);
    } else {
      range.selectNodeContents(node);
      range.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const placeCaretAfter = (node) => {
    if (!node || typeof window === "undefined" || typeof document === "undefined") return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const selectNode = (node) => {
    if (!node || typeof window === "undefined" || typeof document === "undefined") return false;

    const selection = window.getSelection();
    if (!selection) return false;

    const range = document.createRange();
    range.selectNode(node);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const createListElement = (tagName, sourceText = "") => {
    const editor = bodyInputRef.current;
    if (!editor) return null;

    const list = editor.ownerDocument.createElement(tagName);
    createListItemsFromText(sourceText).forEach((itemText) => {
      const listItem = editor.ownerDocument.createElement("li");
      listItem.textContent = itemText;
      list.appendChild(listItem);
    });

    return list;
  };

  const replaceElementTag = (element, nextTagName) => {
    if (!element || element.tagName?.toLowerCase() === nextTagName) return element;

    const nextElement = element.ownerDocument.createElement(nextTagName);
    while (element.firstChild) {
      nextElement.appendChild(element.firstChild);
    }
    element.replaceWith(nextElement);
    return nextElement;
  };

  const unwrapListElement = (listElement) => {
    if (!listElement) return null;

    const fragment = listElement.ownerDocument.createDocumentFragment();
    let lastInsertedNode = null;

    Array.from(listElement.children).forEach((child) => {
      if (child.tagName?.toLowerCase() !== "li") return;

      const paragraph = listElement.ownerDocument.createElement("p");

      Array.from(child.childNodes).forEach((node) => {
        if (
          node.nodeType === 1 &&
          (node.tagName?.toLowerCase() === "ul" || node.tagName?.toLowerCase() === "ol")
        ) {
          return;
        }
        paragraph.appendChild(node.cloneNode(true));
      });

      if (!isEditorValueEmpty(paragraph.innerHTML)) {
        fragment.appendChild(paragraph);
        lastInsertedNode = paragraph;
      }

      Array.from(child.children)
        .filter((node) => node.tagName?.toLowerCase() === "ul" || node.tagName?.toLowerCase() === "ol")
        .forEach((nestedList) => {
          const clonedList = nestedList.cloneNode(true);
          fragment.appendChild(clonedList);
          lastInsertedNode = clonedList;
        });
    });

    listElement.replaceWith(fragment);
    return lastInsertedNode;
  };

  const unwrapInlineElement = (element) => {
    if (!element) return null;

    const fragment = element.ownerDocument.createDocumentFragment();
    let lastInsertedNode = null;

    while (element.firstChild) {
      lastInsertedNode = element.firstChild;
      fragment.appendChild(element.firstChild);
    }

    element.replaceWith(fragment);
    return lastInsertedNode;
  };

  const setBlockAlignment = (block, alignment) => {
    if (!block) return;

    block.removeAttribute("align");
    block.style.removeProperty("text-align");

    if (alignment === "center" || alignment === "right") {
      block.setAttribute("data-align", alignment);
      return;
    }

    block.removeAttribute("data-align");
  };

  const normalizeSelectionText = (value = "") =>
    String(value || "").replace(/\u00A0/g, " ").trim();

  const getFragmentHtml = (documentRef, fragment) => {
    if (!documentRef || !fragment) return "";

    const container = documentRef.createElement("div");
    container.appendChild(fragment.cloneNode(true));
    return container.innerHTML;
  };

  const createBlockFromFragment = (documentRef, tagName, fragment) => {
    const html = getFragmentHtml(documentRef, fragment);
    if (isEditorValueEmpty(html)) return null;

    const block = documentRef.createElement(tagName);
    block.appendChild(fragment.cloneNode(true));
    return block;
  };

  const setAnchorAttributes = (anchor, href) => {
    if (!anchor) return;

    anchor.setAttribute("href", href);
    const isExternal = /^https?:/i.test(href);

    if (isExternal) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      return;
    }

    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  };

  const insertNodeAtSelection = (node) => {
    const range = getEditorSelectionRange();
    if (!node || !range) return null;

    range.deleteContents();
    range.insertNode(node);
    return node;
  };

  const toggleListFormat = (tagName) => {
    const editor = bodyInputRef.current;
    if (!editor) return;

    const selectionRange = getEditorSelectionRange();
    if (!selectionRange) return;

    const activeList = getClosestEditorList(editor, selectionRange);
    if (activeList) {
      editor.focus();

      if (activeList.tagName.toLowerCase() === tagName) {
        const lastNode = unwrapListElement(activeList) || editor;
        syncBodyFromEditor();
        placeCaretAtEnd(lastNode);
        return;
      }

      const nextList = replaceElementTag(activeList, tagName);
      syncBodyFromEditor();
      placeCaretAtEnd(nextList.lastElementChild || nextList);
      return;
    }

    const selectedText = selectionRange.toString().replace(/\u00A0/g, " ").trim();
    const currentBlock = getClosestEditorBlock(editor, selectionRange);
    const currentBlockText = currentBlock?.textContent?.replace(/\u00A0/g, " ").trim() || "";
    const sourceText =
      selectedText ||
      currentBlockText ||
      "List item";
    const shouldReplaceCurrentBlock =
      currentBlock &&
      currentBlock !== editor &&
      (!selectedText || currentBlockText === selectedText);

    if (shouldReplaceCurrentBlock) {
      const listNode = createListElement(tagName, sourceText);
      if (!listNode) return;

      currentBlock.replaceWith(listNode);
      syncBodyFromEditor();
      placeCaretAtEnd(listNode.lastElementChild || listNode);
      return;
    }

    if (!selectedText && currentBlock && currentBlock !== editor) {
      selectNode(currentBlock);
    } else {
      restoreEditorSelection(selectionRange);
    }

    const listNode = createListElement(tagName, sourceText);
    if (!listNode) return;

    insertNodeAtSelection(listNode);
    syncBodyFromEditor();
    placeCaretAtEnd(listNode.lastElementChild || listNode);
  };

  const toggleQuoteFormat = () => {
    const editor = bodyInputRef.current;
    if (!editor) return;

    const selectionRange = getEditorSelectionRange();
    if (!selectionRange) return;

    const currentInlineQuote = getClosestInlineQuote(editor, selectionRange);
    if (currentInlineQuote) {
      const lastNode = unwrapInlineElement(currentInlineQuote) || editor;
      syncBodyFromEditor();
      placeCaretAtEnd(lastNode);
      return;
    }

    const selectedText = selectionRange.toString().replace(/\u00A0/g, " ").trim();
    if (!selectedText) return;

    const quoteNode = editor.ownerDocument.createElement("q");
    quoteNode.textContent = selectedText;

    selectionRange.deleteContents();
    selectionRange.insertNode(quoteNode);
    syncBodyFromEditor();
    placeCaretAfter(quoteNode);
  };

  const toggleInlineFormat = (command, selector) => {
    const editor = bodyInputRef.current;
    if (!editor) return;

    const selectionRange = getEditorSelectionRange();
    if (!selectionRange) return;

    if (selectionRange.collapsed) {
      runEditorCommand(command);
      return;
    }

    const currentInline = getClosestInlineFormat(editor, selectionRange, selector);
    const selectedText = normalizeSelectionText(selectionRange.toString());
    const currentInlineText = normalizeSelectionText(currentInline?.textContent || "");
    const isSelectionInsideCurrentInline =
      currentInline &&
      currentInline.contains(selectionRange.startContainer) &&
      currentInline.contains(selectionRange.endContainer);

    if (isSelectionInsideCurrentInline && selectedText && selectedText === currentInlineText) {
      const lastNode = unwrapInlineElement(currentInline) || editor;
      syncBodyFromEditor();
      placeCaretAfter(lastNode);
      return;
    }

    runEditorCommand(command);
  };

  const toggleBlockFormat = (tagName) => {
    const editor = bodyInputRef.current;
    if (!editor) return;

    const selectionRange = getEditorSelectionRange();
    if (!selectionRange) return;

    const selectedText = selectionRange.toString().replace(/\u00A0/g, " ").trim();
    if (!selectedText) {
      applyFormatBlock(tagName);
      return;
    }

    const startBlock = getClosestEditorBlockFromNode(editor, selectionRange.startContainer);
    const endBlock = getClosestEditorBlockFromNode(editor, selectionRange.endContainer);
    const currentBlock = startBlock && startBlock === endBlock ? startBlock : null;
    const currentBlockTag = currentBlock?.tagName?.toLowerCase() || "";
    const currentTagName = currentBlockTag === "div" ? "p" : currentBlockTag;

    if (!currentBlock || currentBlock === editor || currentTagName === "li" || currentTagName === "pre") {
      applyFormatBlock(tagName);
      return;
    }

    if (tagName === "p" && currentTagName === "p") {
      applyFormatBlock("p");
      return;
    }

    const targetTagName = currentTagName === tagName ? "p" : tagName;

    const documentRef = currentBlock.ownerDocument;
    const beforeRange = documentRef.createRange();
    beforeRange.selectNodeContents(currentBlock);
    beforeRange.setEnd(selectionRange.startContainer, selectionRange.startOffset);

    const afterRange = documentRef.createRange();
    afterRange.selectNodeContents(currentBlock);
    afterRange.setStart(selectionRange.endContainer, selectionRange.endOffset);

    const wrapperTag = currentBlockTag === "div" ? "p" : currentTagName;
    const replacement = documentRef.createDocumentFragment();
    const beforeBlock = createBlockFromFragment(documentRef, wrapperTag, beforeRange.cloneContents());
    const formattedBlock = createBlockFromFragment(
      documentRef,
      targetTagName,
      selectionRange.cloneContents()
    );
    const afterBlock = createBlockFromFragment(documentRef, wrapperTag, afterRange.cloneContents());

    if (beforeBlock) replacement.appendChild(beforeBlock);
    if (formattedBlock) replacement.appendChild(formattedBlock);
    if (afterBlock) replacement.appendChild(afterBlock);

    if (!formattedBlock) {
      applyFormatBlock(tagName);
      return;
    }

    currentBlock.replaceWith(replacement);
    syncBodyFromEditor();
    placeCaretAtEnd(formattedBlock);
  };

  const toggleHeadingFormat = (tagName) => {
    toggleBlockFormat(tagName);
  };

  const toggleAlignmentFormat = (alignment) => {
    const editor = bodyInputRef.current;
    if (!editor) return;

    const selectionRange = getEditorSelectionRange();
    if (!selectionRange) return;

    const currentBlock = getClosestEditorBlock(editor, selectionRange);
    if (!currentBlock || currentBlock === editor) {
      const fallbackCommand =
        alignment === "center" ? "justifyCenter" : alignment === "right" ? "justifyRight" : "justifyLeft";
      runEditorCommand(fallbackCommand);
      return;
    }

    const nextAlignment = getBlockAlignment(currentBlock) === alignment ? "left" : alignment;
    setBlockAlignment(currentBlock, nextAlignment);
    restoreEditorSelection(selectionRange);
    syncBodyFromEditor();
  };

  const toggleLinkFormat = () => {
    const editor = bodyInputRef.current;
    if (!editor) return;

    const selectionRange = getEditorSelectionRange();
    if (!selectionRange) return;

    const currentLink = getClosestEditorLink(editor, selectionRange);
    if (currentLink) {
      const nextInput = window.prompt(
        "Update link URL. Leave it empty to remove the link.",
        currentLink.getAttribute("href") || ""
      );

      if (nextInput === null) return;

      const safeUrl = normalizeLinkUrl(nextInput || "");
      if (!safeUrl) {
        const lastNode = unwrapInlineElement(currentLink) || editor;
        syncBodyFromEditor();
        placeCaretAfter(lastNode);
        return;
      }

      setAnchorAttributes(currentLink, safeUrl);
      syncBodyFromEditor();
      placeCaretAfter(currentLink);
      return;
    }

    const nextInput = window.prompt("Paste the link URL");
    const safeUrl = normalizeLinkUrl(nextInput || "");
    if (!safeUrl) return;

    const selectedText = selectionRange.toString().replace(/\u00A0/g, " ").trim();
    const anchor = editor.ownerDocument.createElement("a");
    setAnchorAttributes(anchor, safeUrl);

    const selectedContent = selectionRange.extractContents();
    if (selectedContent.childNodes.length > 0) {
      anchor.appendChild(selectedContent);
    } else {
      anchor.textContent = selectedText || safeUrl;
    }

    selectionRange.insertNode(anchor);
    syncBodyFromEditor();
    placeCaretAfter(anchor);
  };

  const insertStructuredHtml = (html, { placeCaretInsideLastNode = false } = {}) => {
    const editor = bodyInputRef.current;
    const range = getEditorSelectionRange();
    if (!editor || !range) return;

    const template = editor.ownerDocument.createElement("template");
    template.innerHTML = html;
    const fragment = editor.ownerDocument.createDocumentFragment();

    while (template.content.firstChild) {
      fragment.appendChild(template.content.firstChild);
    }

    const lastNode = fragment.lastChild;
    range.deleteContents();
    range.insertNode(fragment);
    syncBodyFromEditor();

    if (placeCaretInsideLastNode && lastNode) {
      placeCaretAtEnd(lastNode);
    }
  };

  const handleEditorKeyDown = (event) => {
    if (event.key !== "Tab") return;

    const selectionRange = getEditorSelectionRange();
    const activeList = selectionRange ? getClosestEditorList(bodyInputRef.current, selectionRange) : null;
    if (!activeList) return;

    event.preventDefault();
    runEditorCommand(event.shiftKey ? "outdent" : "indent");
  };

  const handleToolbarAction = (actionKey) => {
    if (actionKey === "undo") return runEditorCommand("undo");
    if (actionKey === "redo") return runEditorCommand("redo");
    if (actionKey === "bold") return toggleInlineFormat("bold", "strong,b");
    if (actionKey === "italic") return toggleInlineFormat("italic", "em,i");
    if (actionKey === "underline") return toggleInlineFormat("underline", "u");
    if (actionKey === "paragraph") return toggleBlockFormat("p");
    if (actionKey === "heading1") return toggleHeadingFormat("h1");
    if (actionKey === "heading2") return toggleHeadingFormat("h2");
    if (actionKey === "heading3") return toggleHeadingFormat("h3");
    if (actionKey === "quote") return toggleQuoteFormat();
    if (actionKey === "align-left") return toggleAlignmentFormat("left");
    if (actionKey === "align-center") return toggleAlignmentFormat("center");
    if (actionKey === "align-right") return toggleAlignmentFormat("right");
    if (actionKey === "bullet-list") return toggleListFormat("ul");
    if (actionKey === "ordered-list") return toggleListFormat("ol");
    if (actionKey === "link") return toggleLinkFormat();

    if (actionKey === "image") {
      const selection = getEditorSelectionRange();
      const input = window.prompt("Paste the image URL");
      const safeUrl = normalizeImageUrl(input || "");
      if (!safeUrl) return;

      restoreEditorSelection(selection);
      insertStructuredHtml(`<img src="${safeUrl}" alt="Article image" />`, {
        placeCaretInsideLastNode: true,
      });
    }
  };

  const handleTagSubmit = (event) => {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();

    const nextTags = appendPendingTag(tagValues, tagInput);
    if (!areTagListsEqual(nextTags, tagValues)) {
      setTagValues(nextTags);
    }
    setTagInput("");
  };

  const commitPendingTag = () => {
    const nextTags = appendPendingTag(tagValues, tagInput);

    if (!areTagListsEqual(nextTags, tagValues)) {
      setTagValues(nextTags);
    }

    if (tagInput) {
      setTagInput("");
    }

    return nextTags;
  };

  const handleSaveDraft = async () => {
    clearFeedback();
    const nextTags = commitPendingTag();
    const payload = {
      title: titleValue,
      content: normalizedBodyValue,
      excerpt: excerptValue,
      author: authorValue,
      publishAt: publishAtValue,
      tags: nextTags,
      image: coverPreview,
      allowComments: options.allowComments,
      featuredArticle: options.featuredArticle,
      notifySubscribers: options.notifySubscribers,
      seoOptimized: options.seoOptimized,
    };

    if (!hasMeaningfulDraftValue(payload)) {
      setFeedbackNotice({
        tone: "warning",
        message: "Add a title, excerpt, content, image, tag, or schedule before saving a draft.",
      });
      return;
    }

    try {
      let imageToSave = payload.image;
      if (coverFile) {
        imageToSave = await uploadBlogImage(coverFile);
      }

      const savedDraft = await saveBlogDraft({
        ...payload,
        image: imageToSave,
      });

      setCoverFile(null);
      setCoverPreview(savedDraft?.image || imageToSave || "");
      setFeedbackNotice({
        tone: "success",
        message: isUsingSupabase()
          ? "Draft saved to shared admin storage with a local backup on this device."
          : "Draft saved locally on this device.",
      });
    } catch (error) {
      setFeedbackNotice({
        tone: "warning",
        message: error.message || "Unable to save the draft.",
      });
    }
  };

  const handlePublish = async () => {
    const nextTags = commitPendingTag();
    const savedPost = await savePost({
      editingPostId: editId,
      values: {
        title: titleValue,
        content: normalizedBodyValue,
        excerpt: excerptValue,
        author: authorValue,
        tags: nextTags,
        publishAt: publishAtValue,
        allowComments: options.allowComments,
        featuredArticle: options.featuredArticle,
        notifySubscribers: options.notifySubscribers,
        image: coverPreview,
        seoOptimized: options.seoOptimized,
        createdAt: editingPost?.createdAt || "",
      },
      imageFile: coverFile,
    });

    if (!savedPost) return;

    if (!isEditing) {
      try {
        await deleteBlogDraft();
      } catch (error) {
        setFeedbackNotice({
          tone: "warning",
          message: error.message || "Post published, but the shared draft could not be cleared.",
        });
      }
    }

    if (isEditing) {
      navigate("/admin/blog/analytics", { replace: true });
      return;
    }

    resetEditorState();
    setSearchParams({});
    navigate("/admin/blog/create", { replace: true });
  };

  if (isEditing && isLoadingEditPost && !editingPost) {
    return (
      <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
        <div className="blog-admin-overview-header blog-admin-create-header">
          <div>
            <h1>Edit Article</h1>
            <p>Loading the published article for editing.</p>
          </div>

          <button
            type="button"
            className="blog-admin-btn-outline"
            onClick={() => navigate("/admin/blog/analytics")}
          >
            Back to Analytics
          </button>
        </div>

        <div className="blog-admin-panel">
          <p className="blog-admin-empty-state">Loading the selected article...</p>
        </div>
      </section>
    );
  }

  if (isMissingEditPost) {
    return (
      <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
        <div className="blog-admin-overview-header blog-admin-create-header">
          <div>
            <h1>Edit Article</h1>
            <p>The selected published article could not be found.</p>
          </div>

          <button
            type="button"
            className="blog-admin-btn-outline"
            onClick={() => navigate("/admin/blog/analytics")}
          >
            Back to Analytics
          </button>
        </div>

        <div className="blog-admin-panel blog-admin-drafts-empty-panel">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Article not found</h3>
              <p>The post may have been deleted or the edit link is no longer valid.</p>
            </div>
          </div>

          <div className="blog-admin-manage-post-actions">
            <button
              type="button"
              className="blog-admin-btn-primary"
              onClick={() => navigate("/admin/blog/analytics")}
            >
              View Published Posts
            </button>
            <button
              type="button"
              className="blog-admin-btn-outline"
              onClick={() => {
                setSearchParams({});
                navigate("/admin/blog/create", { replace: true });
              }}
            >
              Start New Article
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
      <div className="blog-admin-overview-header blog-admin-create-header">
        <div>
          <h1>{isEditing ? "Edit Article" : "New Article"}</h1>
          <p>
            {isEditing
              ? "Update the published article and save the changes live."
              : "Write, format, and publish your next story"}
          </p>
        </div>

        <button
          type="button"
          className="blog-admin-btn-outline"
          onClick={() => navigate(isEditing ? "/admin/blog/analytics" : "/admin/blog")}
        >
          {isEditing ? "Back to Analytics" : "← Back to Overview"}
        </button>
      </div>

      <div className="blog-admin-create-layout">
        <div className="blog-admin-create-main">
          <Editor
            titleValue={titleValue}
            bodyValue={bodyValue}
            onTitleChange={(event) => setTitleValue(event.target.value)}
            onBodyChange={(event) =>
              setBodyValue(isEditorValueEmpty(event.currentTarget.innerHTML) ? "" : event.currentTarget.innerHTML)
            }
            onBodyBlur={() => {
              const editor = bodyInputRef.current;
              if (!editor) return;
              const nextValue = normalizeEditorValue(editor.innerHTML);
              if (editor.innerHTML !== nextValue) {
                editor.innerHTML = nextValue;
              }
              setBodyValue(nextValue);
              setActiveToolbarKeys([]);
            }}
            onBodyPaste={(event) => {
              event.preventDefault();
              const pastedText = event.clipboardData?.getData("text/plain") || "";
              if (!pastedText) return;
              const hasStructuredPaste =
                pastedText.includes("\n") || /^(\s*[-*]\s+|\s*\d+\.\s+)/m.test(pastedText);

              if (!hasStructuredPaste) {
                runEditorCommand("insertText", pastedText);
                return;
              }

              insertStructuredHtml(plainTextToEditorHtml(pastedText), {
                placeCaretInsideLastNode: true,
              });
            }}
            onBodyKeyDown={handleEditorKeyDown}
            bodyInputRef={bodyInputRef}
            activeToolbarKeys={activeToolbarKeys}
            onToolbarAction={handleToolbarAction}
            wordCount={wordCount}
            onSaveDraft={handleSaveDraft}
            onPreviewToggle={() => setIsPreviewOpen((prev) => !prev)}
            isPreviewOpen={isPreviewOpen}
            previewTitle={titleValue}
            previewHtml={normalizedBodyValue}
            onPublish={handlePublish}
            isPublishing={isPublishing}
            publishLabel={isEditing ? "Update" : "Publish"}
            publishingLabel={isEditing ? "Updating..." : "Publishing..."}
          />
        </div>

        <aside className="blog-admin-create-sidebar">
          <CoverUpload
            previewUrl={coverPreview}
            onFileSelect={(event) => {
              const file = event.target.files?.[0] || null;
              setCoverFile(file);
              if (file) {
                setCoverPreview(URL.createObjectURL(file));
              }
            }}
          />

          <PublishSettings
            author={authorValue}
            onAuthorChange={(event) => setAuthorValue(event.target.value)}
            publishAt={publishAtValue}
            onPublishAtChange={(event) => setPublishAtValue(event.target.value)}
            tags={tagValues}
            tagInput={tagInput}
            onTagInputChange={(event) => setTagInput(event.target.value)}
            onTagKeyDown={handleTagSubmit}
            onTagBlur={commitPendingTag}
            onTagRemove={(tag) => setTagValues((prev) => prev.filter((item) => item !== tag))}
            excerpt={excerptValue}
            onExcerptChange={(event) => setExcerptValue(event.target.value)}
          />

          <div className="blog-admin-panel">
            <div className="blog-admin-panel-title">Options</div>

            <div className="blog-admin-toggle-row">
              <span className="blog-admin-toggle-label">Allow comments</span>
              <label className="blog-admin-toggle">
                <input
                  type="checkbox"
                  checked={options.allowComments}
                  onChange={(event) =>
                    setOptions((prev) => ({ ...prev, allowComments: event.target.checked }))
                  }
                />
                <span className="blog-admin-toggle-track" />
              </label>
            </div>

            <div className="blog-admin-toggle-row">
              <span className="blog-admin-toggle-label">Featured article</span>
              <label className="blog-admin-toggle">
                <input
                  type="checkbox"
                  checked={options.featuredArticle}
                  onChange={(event) =>
                    setOptions((prev) => ({ ...prev, featuredArticle: event.target.checked }))
                  }
                />
                <span className="blog-admin-toggle-track" />
              </label>
            </div>

            <div className="blog-admin-toggle-row">
              <span className="blog-admin-toggle-label">Email subscribers</span>
              <label className="blog-admin-toggle">
                <input
                  type="checkbox"
                  checked={options.notifySubscribers}
                  onChange={(event) =>
                    setOptions((prev) => ({ ...prev, notifySubscribers: event.target.checked }))
                  }
                />
                <span className="blog-admin-toggle-track" />
              </label>
            </div>

            <div className="blog-admin-toggle-row blog-admin-toggle-row-last">
              <span className="blog-admin-toggle-label">SEO optimized</span>
              <label className="blog-admin-toggle">
                <input
                  type="checkbox"
                  checked={options.seoOptimized}
                  onChange={(event) =>
                    setOptions((prev) => ({ ...prev, seoOptimized: event.target.checked }))
                  }
                />
                <span className="blog-admin-toggle-track" />
              </label>
            </div>
          </div>

          <div className="blog-admin-panel">
            <div className="blog-admin-panel-title">Co-authors</div>
            <button type="button" className="blog-admin-form-input blog-admin-coauthor-button">
              <PlusCircleIcon />
              Invite collaborator
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
