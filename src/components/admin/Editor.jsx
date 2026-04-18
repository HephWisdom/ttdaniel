import { useEffect } from "react";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BulletListIcon,
  ImageIcon,
  LinkIcon,
  OrderedListIcon,
  PreviewIcon,
  PublishIcon,
  QuoteIcon,
  RedoIcon,
  SaveIcon,
  UndoIcon,
} from "./AdminIcons";

const editorBodyHintId = "blog-admin-editor-body-hint";
const editorBodyPlaceholder = "Start writing your story...";

const toolbarButtons = [
  { key: "bold", label: <b>B</b>, title: "Bold", type: "text" },
  { key: "italic", label: <i>I</i>, title: "Italic", type: "text" },
  { key: "underline", label: <u>U</u>, title: "Underline", type: "text" },
  { key: "paragraph", label: "P", title: "Paragraph", type: "text-small" },
  { key: "separator-1", type: "separator" },
  { key: "heading1", label: "H1", title: "Heading 1", type: "text-small" },
  { key: "heading2", label: "H2", title: "Heading 2", type: "text-small" },
  { key: "heading3", label: "H3", title: "Heading 3", type: "text-small" },
  { key: "separator-2", type: "separator" },
  { key: "bullet-list", label: <BulletListIcon />, title: "Bullet list" },
  { key: "ordered-list", label: <OrderedListIcon />, title: "Ordered list" },
  { key: "quote", label: <QuoteIcon />, title: "Quote" },
  { key: "link", label: <LinkIcon />, title: "Link" },
  { key: "image", label: <ImageIcon />, title: "Image" },
  { key: "separator-3", type: "separator" },
  { key: "align-left", label: <AlignLeftIcon />, title: "Align left" },
  { key: "align-center", label: <AlignCenterIcon />, title: "Align center" },
  { key: "align-right", label: <AlignRightIcon />, title: "Align right" },
  { key: "undo", label: <UndoIcon />, title: "Undo" },
  { key: "redo", label: <RedoIcon />, title: "Redo" },
];

export default function Editor({
  titleValue,
  bodyValue,
  onTitleChange,
  onBodyChange,
  onBodyBlur,
  onBodyPaste,
  onBodyKeyDown,
  bodyInputRef,
  activeToolbarKeys,
  onToolbarAction,
  wordCount,
  onSaveDraft,
  onPreviewToggle,
  isPreviewOpen,
  previewTitle,
  previewHtml,
  onPublish,
  isPublishing,
}) {
  useEffect(() => {
    const editor = bodyInputRef.current;
    if (!editor || editor.innerHTML === bodyValue) return;
    editor.innerHTML = bodyValue;
  }, [bodyInputRef, bodyValue, isPreviewOpen]);

  const isEditorEmpty =
    !String(bodyValue || "")
      .replace(/&nbsp;/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .trim() && !/<img[\s>]/i.test(String(bodyValue || ""));

  return (
    <div className="blog-admin-editor-area">
      <div className="blog-admin-editor-toolbar" role="toolbar" aria-label="Article formatting tools">
        {toolbarButtons.map((button) => {
          if (button.type === "separator") {
            return <div key={button.key} className="blog-admin-toolbar-sep" />;
          }

          return (
            <button
              key={button.key}
              type="button"
              title={button.title}
              aria-label={button.title}
              aria-pressed={activeToolbarKeys.includes(button.key)}
              className={`blog-admin-toolbar-btn ${button.type === "text-small" ? "is-small" : ""} ${
                activeToolbarKeys.includes(button.key) ? "active" : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                onToolbarAction(button.key);
              }}
            >
              {button.label}
            </button>
          );
        })}

        <div className="blog-admin-editor-toolbar-spacer" />

        <div className="blog-admin-editor-toolbar-actions">
          <button
            type="button"
            title="Save Draft"
            aria-label="Save Draft"
            className="blog-admin-toolbar-action-btn"
            onClick={onSaveDraft}
          >
            <SaveIcon />
            <span>Save</span>
          </button>
          <button
            type="button"
            title={isPreviewOpen ? "Edit Content" : "Preview"}
            aria-label={isPreviewOpen ? "Edit Content" : "Preview"}
            aria-pressed={isPreviewOpen}
            className={`blog-admin-toolbar-action-btn ${isPreviewOpen ? "active" : ""}`}
            onClick={onPreviewToggle}
          >
            <PreviewIcon />
            <span>{isPreviewOpen ? "Edit" : "Preview"}</span>
          </button>
          <button
            type="button"
            title={isPublishing ? "Publishing..." : "Publish Article"}
            aria-label={isPublishing ? "Publishing..." : "Publish Article"}
            className="blog-admin-toolbar-action-btn is-primary"
            onClick={onPublish}
            disabled={isPublishing}
          >
            <PublishIcon />
            <span>{isPublishing ? "Publishing..." : "Publish"}</span>
          </button>
        </div>
      </div>

      <div className="blog-admin-editor-scroll-region">
        <p id={editorBodyHintId} className="blog-admin-editor-toolbar-hint">
          Highlight text and choose a style. Links and images are added visually, so writers never
          have to touch HTML tags.
        </p>

        {!isPreviewOpen ? (
          <textarea
            className="blog-admin-editor-title-input"
            rows={2}
            value={titleValue}
            onChange={onTitleChange}
            placeholder="Article title goes here…"
          />
        ) : null}

        {isPreviewOpen ? (
          <article className="blog-admin-editor-preview" aria-live="polite">
            <p className="blog-admin-editor-preview-label">Article Preview</p>
            <h1>{previewTitle || "Live preview"}</h1>
            {previewHtml ? (
              <section
                className="blog-admin-editor-preview-body"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p>Start writing your story to preview it here.</p>
            )}
          </article>
        ) : (
          <div className="blog-admin-editor-body-shell">
            {isEditorEmpty ? (
              <span className="blog-admin-editor-placeholder" aria-hidden="true">
                {editorBodyPlaceholder}
              </span>
            ) : null}

            <div
              ref={bodyInputRef}
              className="blog-admin-editor-body-input blog-admin-editor-surface"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Article content"
              aria-placeholder={editorBodyPlaceholder}
              aria-describedby={editorBodyHintId}
              aria-multiline="true"
              spellCheck
              onInput={onBodyChange}
              onBlur={onBodyBlur}
              onPaste={onBodyPaste}
              onKeyDown={onBodyKeyDown}
            />
          </div>
        )}
      </div>

      <div className="blog-admin-editor-footer">
        <span className="blog-admin-word-count">
          {wordCount} word{wordCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
