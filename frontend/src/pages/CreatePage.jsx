import { CATEGORIES } from "../lib/constants";

export default function CreatePage({ currentUser, postForm, setPostForm, onSubmit }) {
  const publishCategories = CATEGORIES.filter((item) => item !== "All");

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
          <label>Upload Image
            <input type="file" accept="image/*" onChange={(event) => setPostForm((current) => ({ ...current, imageFile: event.target.files?.[0] ?? null }))} required disabled={!currentUser} />
          </label>
          {postForm.imageFile ? <p className="muted-copy">Selected: {postForm.imageFile.name}</p> : null}
          <button className="primary-pill-button" type="submit" disabled={!currentUser}>Publish Now</button>
        </form>
      </section>
    </section>
  );
}
