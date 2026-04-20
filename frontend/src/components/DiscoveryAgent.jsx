import { useState } from "react";
import { draftAgentQuery, executeAgentQuery } from "../api";

const EXAMPLE_PROMPT = "Show the most popular campus posts";

function RecommendationCard({ item, onOpenPostById }) {
  return (
    <article className="discovery-agent__recommendation">
      <div className="discovery-agent__recommendation-copy">
        <span className="eyebrow">Curated Pick</span>
        <h3>{item.headline}</h3>
        <p>{item.summary}</p>
        <p className="discovery-agent__recommendation-reason">{item.reason}</p>
      </div>
      <button className="ghost-frame-button" onClick={() => onOpenPostById(item.post_id)} type="button">
        {item.label || `Open post ${item.post_id}`}
      </button>
    </article>
  );
}

export default function DiscoveryAgent({ onOpenPostById }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleDraft(event) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setStatus("Ask a question first.");
      return;
    }

    setIsLoading(true);
    setDraft(null);
    setResult(null);
    setStatus("Preparing a read-only query...");
    try {
      const nextDraft = await draftAgentQuery(trimmedPrompt);
      setDraft(nextDraft);
      setStatus("Review the query before running it.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExecute() {
    if (!draft?.sql) return;
    setIsLoading(true);
    setStatus("Running approved query and reviewing the matches...");
    try {
      const nextResult = await executeAgentQuery({ sql: draft.sql, prompt: draft.prompt || prompt.trim() });
      setResult(nextResult);
      setStatus("Query complete. The agent highlighted the strongest matches.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside className={`discovery-agent ${isOpen ? "discovery-agent--open" : ""}`}>
      {isOpen ? (
        <section className="discovery-agent__panel" aria-label="Discovery assistant">
          <div className="discovery-agent__header">
            <div>
              <span className="eyebrow">AI Agent</span>
              <h2>Ask The Feed</h2>
            </div>
            <button className="ghost-text-button" onClick={() => setIsOpen(false)} type="button">Close</button>
          </div>

          <form className="discovery-agent__form" onSubmit={handleDraft}>
            <label>
              Question
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={EXAMPLE_PROMPT}
              />
            </label>
            <button className="ghost-frame-button" disabled={isLoading} type="submit">
              {isLoading ? "Thinking..." : "Prepare Query"}
            </button>
          </form>

          {status ? <p className="discovery-agent__status" role="status" aria-live="polite">{status}</p> : null}

          {draft ? (
            <section className="discovery-agent__approval">
              <p>{draft.explanation}</p>
              <pre>{draft.sql}</pre>
              <button className="primary-pill-button" disabled={isLoading} onClick={handleExecute} type="button">
                Approve And Run
              </button>
            </section>
          ) : null}

          {result ? (
            <section className="discovery-agent__result">
              <p>{result.answer}</p>
              {result.recommendations?.length ? (
                <div className="discovery-agent__recommendations">
                  {result.recommendations.map((item) => (
                    <RecommendationCard item={item} key={item.post_id} onOpenPostById={onOpenPostById} />
                  ))}
                </div>
              ) : null}
              {!result.recommendations?.length && result.post_links.length ? (
                <div className="discovery-agent__links">
                  {result.post_links.map((link) => (
                    <button className="ghost-frame-button" key={link.post_id} onClick={() => onOpenPostById(link.post_id)} type="button">
                      Open Post {link.post_id}
                    </button>
                  ))}
                </div>
              ) : null}
              <span>
                {result.row_count} rows returned
                {result.analysis_source === "ai" ? " · AI curated" : " · fallback ranking"}
              </span>
            </section>
          ) : null}
        </section>
      ) : (
        <button className="discovery-agent__bubble" onClick={() => setIsOpen(true)} type="button" aria-label="Open AI agent">
          AI
        </button>
      )}
    </aside>
  );
}
