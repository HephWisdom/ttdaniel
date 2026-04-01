export default function PublishSettings({
  author,
  onAuthorChange,
  publishAt,
  onPublishAtChange,
  tags,
  tagInput,
  onTagInputChange,
  onTagKeyDown,
  onTagBlur,
  onTagRemove,
  excerpt,
  onExcerptChange,
}) {
  return (
    <div className="blog-admin-panel" id="publish-settings">
      <div className="blog-admin-panel-title">Publish Settings</div>

      <div className="blog-admin-form-group">
        <label className="blog-admin-form-label">Author</label>
        <input
          className="blog-admin-form-input"
          type="text"
          value={author}
          onChange={onAuthorChange}
          placeholder="Author name"
        />
      </div>

      <div className="blog-admin-form-group">
        <label className="blog-admin-form-label">Schedule</label>
        <input
          className="blog-admin-form-input"
          type="datetime-local"
          value={publishAt}
          onChange={onPublishAtChange}
        />
      </div>

      <div className="blog-admin-form-group">
        <label className="blog-admin-form-label">Tags</label>
        <div className="blog-admin-tag-input-wrap">
          {tags.map((tag) => (
            <div key={tag} className="blog-admin-tag">
              {tag}
              <button type="button" className="blog-admin-tag-remove" onClick={() => onTagRemove(tag)}>
                ×
              </button>
            </div>
          ))}
          <input
            className="blog-admin-tag-add-input"
            value={tagInput}
            onChange={onTagInputChange}
            onKeyDown={onTagKeyDown}
            onBlur={onTagBlur}
            placeholder="Add tag and press Enter…"
          />
        </div>
      </div>

      <div className="blog-admin-form-group blog-admin-form-group-last">
        <label className="blog-admin-form-label">Excerpt</label>
        <textarea
          className="blog-admin-form-textarea"
          value={excerpt}
          onChange={onExcerptChange}
          placeholder="Short description for search and sharing…"
        />
      </div>
    </div>
  );
}
