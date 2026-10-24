import React from "react";
import { CATEGORY_NAMES } from "../utils/radix";
import { useTween } from "../hooks/useMotion";
import { CheckIcon, CrossIcon } from "./icons";

export default function SkillMatchCard({ matchResult }) {
  const shown = useTween([matchResult ? matchResult.match_score : 0], { ms: 1100, delay: 200 });
  if (!matchResult) return null;

  const {
    jd_source_file,
    match_score,
    core_match_ratio,
    nice_match_ratio,
    matched_skills = [],
    missing_skills = [],
    missing_by_category = {},
  } = matchResult;

  const tone = match_score >= 70 ? "high" : match_score >= 45 ? "mid" : "low";
  const verdict = { high: "Strong fit", mid: "Partial fit", low: "Weak fit" }[tone];

  return (
    <article className="panel result">
      <div className="result__top">
        <div>
          <p className="result__src">Compared against</p>
          <h3 className="result__title">{jd_source_file}</h3>
        </div>
        <div className={`score score--${tone}`}>
          <div className="score__num" aria-label={`${Math.round(match_score)} percent. ${verdict}`}>
            {Math.round(shown[0])}<small>%</small>
          </div>
          <p className="score__sub">{verdict}. Core {core_match_ratio}, nice-to-have {nice_match_ratio}</p>
        </div>
      </div>

      <section className="result__sec">
        <h4 className="result__h result__h--ok"><CheckIcon /> Matched skills ({matched_skills.length})</h4>
        {matched_skills.length > 0 ? (
          <ul className="chips">
            {matched_skills.map((s, idx) => (
              <li key={idx} className="chip chip--match"><CheckIcon /> {s}</li>
            ))}
          </ul>
        ) : (
          <p className="empty">No direct matches found.</p>
        )}
      </section>

      <section className="result__sec">
        <h4 className="result__h result__h--gap"><CrossIcon /> Gaps by skill area ({missing_skills.length})</h4>
        {Object.keys(missing_by_category).length > 0 ? (
          <div className="gaps">
            {Object.entries(missing_by_category).map(([catCode, skills]) => (
              <div key={catCode} className="gap">
                <h4>{CATEGORY_NAMES[catCode] || (catCode === "OTHER" ? "Other skills" : catCode)}</h4>
                <p>{skills.length} requirement{skills.length > 1 ? "s" : ""} missing</p>
                <ul>
                  {skills.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="notice notice--ok">The candidate meets every requirement for this role.</p>
        )}
      </section>
    </article>
  );
}
