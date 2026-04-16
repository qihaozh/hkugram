import { useState } from "react";
import { compareSearchMethods } from "../api";

const DEFAULT_QUERY = "campus";

function mergeSearchRows(comparison) {
  const rows = [
    ...(comparison?.full_text?.rows ?? []),
    ...(comparison?.text_to_sql?.rows ?? []),
  ];
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.id ?? `${row.username}-${row.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function SearchResults({ comparison }) {
  const rows = mergeSearchRows(comparison);

  if (!comparison) return null;

  if (!rows.length) {
    return (
      <section className="sidebar-card">
        <p className="muted-copy">No results found. Try another keyword.</p>
      </section>
    );
  }

  return (
    <section className="search-results-grid" aria-label="Search results">
      {rows.map((row, index) => (
        <article className="search-result-card" key={row.id ?? index}>
          {row.image_url ? (
            <div className="search-result-card__image">
              <img src={row.image_url} alt="" />
            </div>
          ) : null}
          <div className="search-result-card__body">
            <div className="search-result-card__meta">
              <span>{row.category ?? "Post"}</span>
              <span>@{row.username}</span>
            </div>
            <h3>{row.display_name ?? row.username}</h3>
            <p>{row.description}</p>
            <div className="search-result-card__stats">
              <span>{row.like_count ?? 0} likes</span>
              <span>{row.comment_count ?? 0} comments</span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [comparison, setComparison] = useState(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setStatus("Enter a keyword first.");
      return;
    }

    setIsLoading(true);
    setStatus("Searching...");
    try {
      const nextComparison = await compareSearchMethods(trimmedQuery);
      setComparison(nextComparison);
      const resultCount = mergeSearchRows(nextComparison).length;
      setStatus(resultCount ? `${resultCount} results found for "${nextComparison.query}".` : `No results found for "${nextComparison.query}".`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="search-lab">
      <section className="discovery-header search-lab__hero">
        <div>
          <span className="eyebrow">Discover</span>
          <h2>Search</h2>
        </div>
        <form className="search-lab__form" onSubmit={handleSubmit}>
          <label>
            Search
            <textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Try "${DEFAULT_QUERY}", "travel", "cafe", or describe what you want to find...`} />
          </label>
          <button className="ghost-frame-button" disabled={isLoading} type="submit">{isLoading ? "Searching" : "Search"}</button>
        </form>
      </section>

      {status ? <p className="search-status" role="status" aria-live="polite">{status}</p> : null}

      <SearchResults comparison={comparison} />
    </section>
  );
}
