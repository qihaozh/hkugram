import { CATEGORIES } from "../lib/constants";

export default function CreatePage({ currentUser, postForm, setPostForm, onSubmit }) {
  const publishCategories = CATEGORIES.filter((item) => item !== "All");
  const isUploadMode = postForm.imageSource !== "url";

  return (
    <section className="center-panel">
      <section className="sidebar-card sidebar-card--wide">
        <div className="card-header"><span className="eyebrow">Create</span><h2>Publish a New Post</h2></div>
        <form className="stack-form" onSubmit={onSubmit}>
          <fieldset className="stack-form__fieldset">
            <legend>Category</legend>
            <div className="category-tabs" role="tablist" aria-label="Post categories">
              {publishCategories.map((item) => (
                <button
                  key={item}
                  className={`category-tab ${postForm.category === item ? "category-tab--active" : ""}`}
                  onClick={() => setPostForm((current) => ({ ...current, category: item }))}
                  type="button"
                  disabled={!currentUser}
                  role="tab"
                  aria-selected={postForm.category === item}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <label>Caption
            <textarea value={postForm.description} onChange={(event) => setPostForm((current) => ({ ...current, description: event.target.value }))} placeholder="Tell the feed what this moment means..." required disabled={!currentUser} />
          </label>
          <fieldset className="stack-form__fieldset">
            <legend>Image Source</legend>
            <div className="category-tabs" role="tablist" aria-label="Image source mode">
              <button
                className={`category-tab ${isUploadMode ? "category-tab--active" : ""}`}
                onClick={() => setPostForm((current) => ({ ...current, imageSource: "upload", imageUrl: "" }))}
                type="button"
                disabled={!currentUser}
                role="tab"
                aria-selected={isUploadMode}
              >
                Upload File
              </button>
              <button
                className={`category-tab ${!isUploadMode ? "category-tab--active" : ""}`}
                onClick={() => setPostForm((current) => ({ ...current, imageSource: "url", imageFile: null }))}
                type="button"
                disabled={!currentUser}
                role="tab"
                aria-selected={!isUploadMode}
              >
                Paste URL
              </button>
            </div>
          </fieldset>
          {isUploadMode ? (
            <>
              <label>Upload Image
                <input type="file" accept="image/*" onChange={(event) => setPostForm((current) => ({ ...current, imageFile: event.target.files?.[0] ?? null }))} required={isUploadMode} disabled={!currentUser} />
              </label>
              {postForm.imageFile ? <p className="muted-copy">Selected: {postForm.imageFile.name}</p> : <p className="muted-copy">Choose a local image file to publish.</p>}
            </>
          ) : (
            <>
              <label>Image URL
                <input
                  type="url"
                  value={postForm.imageUrl}
                  onChange={(event) => setPostForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="https://example.com/photo.jpg"
                  required={!isUploadMode}
                  disabled={!currentUser}
                />
              </label>
              <p className="muted-copy">Paste a direct image link that the browser can render in the feed.</p>
            </>
          )}
          <button className="primary-pill-button" type="submit" disabled={!currentUser}>Publish Now</button>
        </form>
      </section>
    </section>
  );
}
