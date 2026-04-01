export default function CoverUpload({ previewUrl, onFileSelect }) {
  return (
    <div className="blog-admin-panel">
      <div className="blog-admin-panel-title">Cover Image</div>

      {previewUrl ? (
        <img className="blog-admin-cover-preview" src={previewUrl} alt="Cover preview" />
      ) : (
        <label className="blog-admin-cover-upload">
          <div className="blog-admin-cover-upload-icon">🖼️</div>
          <div className="blog-admin-cover-upload-text">
            <span>Click to upload</span> or drag & drop
            <br />
            <small>PNG, JPG up to 5MB</small>
          </div>
          <input type="file" accept="image/*" onChange={onFileSelect} />
        </label>
      )}

      {previewUrl ? (
        <label className="blog-admin-btn-outline blog-admin-cover-replace">
          Replace cover
          <input type="file" accept="image/*" onChange={onFileSelect} />
        </label>
      ) : null}
    </div>
  );
}
