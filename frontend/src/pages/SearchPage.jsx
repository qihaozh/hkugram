import { useState } from "react";
import { compareSearchMethods } from "../api";

const DEFAULT_QUERY = "campus";

function ResultTable({ title, eyebrow, result, sql }) {
  const rows = result?.rows ?? [];
  const columns = result?.columns ?? [];
  const visibleColumns = columns.filter((column) => !["image_url"].includes(column)).slice(0, 7);

  return (
    <section className="sidebar-card search-method-panel">
      <div className="card-header">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="query-code" aria-label={`${title} generated SQL`}>{sql}</div>
      <p className="muted-copy">{result?.row_count ?? 0} matching rows</p>
      {rows.length ? (
        <div className="search-result-table">
          <div className="search-result-table__head" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(120px, 1fr))` }}>
            {visibleColumns.map((column) => <span key={column}>{column.replaceAll("_", " ")}</span>)}
          </div>
          {rows.map((row, index) => (
            <article className="search-result-table__row" key={`${title}-${row.id ?? index}`} style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(120px, 1fr))` }}>
              {visibleColumns.map((column) => <span key={column}>{String(row[column] ?? "")}</span>)}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-copy">No rows matched this search term.</p>
      )}
    </section>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [comparison, setComparison] = useState(null);
  const [status, setStatus] = useState("Search a keyword to compare indexed full-text SQL with Text-to-SQL.");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setStatus("Enter a keyword first.");
      return;
    }

    setIsLoading(true);
    setStatus("Running both SQL search methods...");
    try {
      const nextComparison = await compareSearchMethods(trimmedQuery);
      setComparison(nextComparison);
      setStatus(`Compared search methods for "${nextComparison.query}".`);
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
          <span className="eyebrow">SQL Bonus Lab</span>
          <h2>Search Comparison</h2>
          <p className="muted-copy">Compare MySQL full-text search against a Text-to-SQL generated query using the same keyword.</p>
        </div>
        <form className="search-lab__form" onSubmit={handleSubmit}>
          <label>
            Search keyword
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="campus, travel, cafe..." />
          </label>
          <button className="ghost-frame-button" disabled={isLoading} type="submit">{isLoading ? "Comparing" : "Compare"}</button>
        </form>
      </section>

      <section className="sidebar-card search-lab__notes" role="status" aria-live="polite">
        <div className="card-header">
          <span className="eyebrow">Result</span>
          <h2>What This Demonstrates</h2>
        </div>
        <p className="muted-copy">{status}</p>
        {comparison?.notes?.length ? (
          <ul className="search-notes">
            {comparison.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        ) : null}
      </section>

      {comparison ? (
        <section className="search-comparison-grid">
          <ResultTable
            eyebrow="Full-Text SQL"
            title="MATCH AGAINST"
            result={comparison.full_text}
            sql={comparison.full_text_sql}
          />
          <ResultTable
            eyebrow="Text-to-SQL"
            title={comparison.text_to_sql.title}
            result={comparison.text_to_sql}
            sql={comparison.text_to_sql.sql}
          />
        </section>
      ) : null}
    </section>
  );
}
