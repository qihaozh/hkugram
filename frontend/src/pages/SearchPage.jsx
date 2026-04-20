import { useEffect, useState } from "react";
import { compareSearchMethods, getPopularKeywords } from "../api";
import MasonryFeed from "../components/MasonryFeed";

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

function patchComparisonLikeState(comparison, postId, liked, likeCount) {
  if (!comparison) return comparison;

  const patchRows = (rows = []) => rows.map((row) => (
    row.id === postId
      ? { ...row, like_count: likeCount, liked_by_viewer: liked }
      : row
  ));

  return {
    ...comparison,
    full_text: {
      ...comparison.full_text,
      rows: patchRows(comparison.full_text?.rows),
    },
    text_to_sql: {
      ...comparison.text_to_sql,
      rows: patchRows(comparison.text_to_sql?.rows),
    },
  };
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
    <MasonryFeed
      ariaLabel="Search results"
      currentUserId={comparison.currentUserId}
      onLike={comparison.onLike}
      onOpen={comparison.onOpenPost}
      onProfile={comparison.onOpenProfile}
      posts={rows.map((row) => ({ ...row, recent_comments: row.recent_comments ?? [] }))}
    />
  );
}

export default function SearchPage({ currentUser, onLike, onOpenPost, onOpenProfile }) {
  const [query, setQuery] = useState("");
  const [popularKeywords, setPopularKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadPopularKeywords() {
      try {
        setPopularKeywords(await getPopularKeywords());
      } catch {
        setPopularKeywords([]);
      }
    }
    loadPopularKeywords();
  }, []);

  function buildSearchQuery() {
    return [...selectedKeywords, query.trim()].filter(Boolean).join(" ");
  }

  function toggleKeyword(keyword) {
    setSelectedKeywords((current) => {
      if (current.includes(keyword)) return current.filter((item) => item !== keyword);
      return [...current, keyword];
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const searchQuery = buildSearchQuery();
    await runSearch(searchQuery);
  }

  async function runSearch(searchQuery) {
    if (!searchQuery) {
      setStatus("Enter a keyword first.");
      return;
    }

    setIsLoading(true);
    setStatus("Searching...");
    try {
      const nextComparison = await compareSearchMethods(searchQuery);
      setLastSearchQuery(searchQuery);
      setComparison(nextComparison);
      const resultCount = mergeSearchRows(nextComparison).length;
      setStatus(resultCount ? `${resultCount} results found for "${nextComparison.query}".` : `No results found for "${nextComparison.query}".`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearchLike(postId, userId, options = {}) {
    const likeResult = await onLike(postId, userId, options);
    if (!likeResult) return;

    setComparison((current) => patchComparisonLikeState(
      current,
      postId,
      likeResult.liked,
      likeResult.like_count
    ));
  }

  return (
    <section className="search-lab">
      <section className="discovery-header search-lab__hero">
        <div className="search-lab__heading">
          <span className="eyebrow">Discover</span>
          <h2>Search</h2>
        </div>
        <form className="search-lab__form" onSubmit={handleSubmit}>
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Try "${DEFAULT_QUERY}", "travel", or "cafe"...`} />
          </label>
          <button className="ghost-frame-button" disabled={isLoading} type="submit">{isLoading ? "Searching" : "Search"}</button>
        </form>
      </section>

      {popularKeywords.length ? (
        <section className="search-keyword-panel" aria-label="Popular search keywords">
          <div className="search-keyword-panel__head">
            <span className="eyebrow">Popular</span>
            <p className="muted-copy">Choose one or more keywords.</p>
          </div>
          <div className="search-keyword-list">
            {popularKeywords.map((item) => {
              const isSelected = selectedKeywords.includes(item.keyword);
              return (
                <button
                  className={`search-keyword-chip ${isSelected ? "search-keyword-chip--active" : ""}`}
                  key={item.keyword}
                  onClick={() => toggleKeyword(item.keyword)}
                  type="button"
                  aria-pressed={isSelected}
                >
                  {item.keyword}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {status ? <p className="search-status" role="status" aria-live="polite">{status}</p> : null}

      <SearchResults
        comparison={comparison ? {
          ...comparison,
          currentUserId: currentUser?.id,
          onLike: handleSearchLike,
          onOpenPost,
          onOpenProfile,
        } : null}
      />
    </section>
  );
}
