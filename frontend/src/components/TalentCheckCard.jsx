import React, { useState, useMemo } from "react";
import { CATEGORY_NAMES } from "../utils/radix";
import { CheckIcon, CrossIcon } from "./icons";

export const BENCHMARK_COMPANIES = {
  "Google LLC": {
    name: "Google LLC",
    description: "Tier 1 Big Tech. High bar for DSA, OS, Networking, and Software Engineering rigor.",
    skills: {
      COD: { required_level: 8, bloom: "CR" },
      DSA: { required_level: 9, bloom: "CR" },
      OOD: { required_level: 8, bloom: "CR" },
      APTI: { required_level: 9, bloom: "CR" },
      COMM: { required_level: 7, bloom: "EV" },
      AI: { required_level: 7, bloom: "EV" },
      CLOUD: { required_level: 9, bloom: "EV" },
      SQL: { required_level: 8, bloom: "EV" },
      SWE: { required_level: 9, bloom: "EV" },
      SYSD: { required_level: 8, bloom: "AS" },
      NETW: { required_level: 9, bloom: "CR" },
      OS: { required_level: 9, bloom: "CR" }
    }
  },
  "Microsoft Corporation": {
    name: "Microsoft Corporation",
    description: "Tier 1 Big Tech. Focus on DSA, Software Engineering, System Design, and Cloud/AI services.",
    skills: {
      COD: { required_level: 6, bloom: "AS" },
      DSA: { required_level: 9, bloom: "EV" },
      OOD: { required_level: 8, bloom: "CR" },
      APTI: { required_level: 8, bloom: "EV" },
      COMM: { required_level: 7, bloom: "EV" },
      AI: { required_level: 8, bloom: "EV" },
      CLOUD: { required_level: 7, bloom: "EV" },
      SQL: { required_level: 8, bloom: "AS" },
      SWE: { required_level: 9, bloom: "EV" },
      SYSD: { required_level: 8, bloom: "CR" },
      NETW: { required_level: 8, bloom: "EV" },
      OS: { required_level: 8, bloom: "EV" }
    }
  },
  "Oracle Financial Services Software": {
    name: "Oracle Financial Services Software",
    description: "Enterprise software bar. Emphasis on SQL/Databases, Java/SWE fundamentals, and support.",
    skills: {
      COD: { required_level: 5, bloom: "AP" },
      DSA: { required_level: 6, bloom: "AP" },
      OOD: { required_level: 6, bloom: "EV" },
      APTI: { required_level: 6, bloom: "AP" },
      COMM: { required_level: 6, bloom: "AS" },
      AI: { required_level: 6, bloom: "AS" },
      CLOUD: { required_level: 5, bloom: "AP" },
      SQL: { required_level: 6, bloom: "AP" },
      SWE: { required_level: 7, bloom: "AS" },
      SYSD: { required_level: 5, bloom: "CR" },
      NETW: { required_level: 5, bloom: "AP" },
      OS: { required_level: 5, bloom: "AP" }
    }
  }
};

const WEIGHTS = {
  COD: 1.2, DSA: 1.3, SWE: 1.1, OOD: 1.0, APTI: 1.0, COMM: 0.9,
  AI: 0.9, CLOUD: 0.9, SQL: 1.0, SYSD: 1.0, NETW: 0.8, OS: 0.9
};

export function evaluateTalentCheck(profile, companyName) {
  const comp = BENCHMARK_COMPANIES[companyName] || BENCHMARK_COMPANIES["Google LLC"];
  const edu = (profile.education || "").toLowerCase();
  const baseDegree = (edu.includes("computer") || edu.includes("information") || edu.includes("b.tech")) ? 2.0 : 1.0;
  
  const levels = {
    COD: baseDegree, DSA: baseDegree, OOD: baseDegree, APTI: baseDegree,
    COMM: baseDegree, AI: baseDegree, CLOUD: baseDegree, SQL: baseDegree,
    SWE: baseDegree, SYSD: baseDegree, NETW: baseDegree, OS: baseDegree
  };

  const countPerCat = {};
  (profile.skills || []).forEach(skill => {
    const cat = (skill.category_code || "").toUpperCase();
    if (!levels[cat]) return;
    countPerCat[cat] = (countPerCat[cat] || 0) + 1;
    const conf = (skill.confidence || "medium").toLowerCase();
    const confW = conf === "high" ? 3.5 : conf === "medium" ? 2.0 : 1.0;
    const ev = (skill.evidence || "").toLowerCase();
    let evBoost = 0;
    if (["500+", "production", "distributed", "open-source", "winner", "350+"].some(k => ev.includes(k))) {
      evBoost = 2.5;
    } else if (["built", "designed", "implemented", "internship", "capstone", "multithreaded"].some(k => ev.includes(k))) {
      evBoost = 1.5;
    } else if (ev.length > 15) {
      evBoost = 0.8;
    }
    let add = confW + evBoost;
    if (countPerCat[cat] > 1) add *= 0.6;
    levels[cat] += add;
  });

  const texts = [
    ...(profile.hackathons || []),
    ...(profile.internships || []),
    ...(profile.projects || []),
    ...(profile.certifications || [])
  ].join(" ").toLowerCase();

  const kwMap = {
    COD: ["c++", "python", "java", "coding", "programming"],
    DSA: ["algorithm", "data structure", "leetcode", "dsa", "complexity", "350+"],
    OOD: ["oop", "object-oriented", "design pattern", "factory", "strategy"],
    APTI: ["aptitude", "problem solving", "analytical", "logic"],
    COMM: ["communication", "mentorship", "presentation"],
    AI: ["machine learning", "ml", "ai", "model"],
    CLOUD: ["cloud", "docker", "ci/cd", "kubernetes", "aws", "azure", "devops"],
    SQL: ["sql", "mysql", "database", "query", "postgres"],
    SWE: ["software engineering", "git", "linux", "testing", "rate-limiter"],
    SYSD: ["system design", "distributed", "redis", "architecture"],
    NETW: ["network", "socket", "http", "tcp"],
    OS: ["operating system", "linux", "process", "multithread", "round robin"]
  };

  Object.entries(kwMap).forEach(([cat, kws]) => {
    const matches = kws.filter(k => texts.includes(k)).length;
    if (matches > 0) levels[cat] += Math.min(2.5, matches * 0.75);
  });

  let totalNeeded = 0;
  let totalAchieved = 0;
  let severePenalties = 0;
  const skillset_gap = [];

  Object.keys(CATEGORY_NAMES).filter(c => c !== "OTHER").forEach(cat => {
    const req = comp.skills[cat]?.required_level || 6;
    const cand = Math.max(1, Math.min(10, Math.round(levels[cat] || 1)));
    const hasGap = cand < req;
    const delta = cand - req;
    const w = WEIGHTS[cat] || 1.0;

    if (hasGap && Math.abs(delta) >= 3 && w >= 1.0) severePenalties++;

    totalNeeded += (req * w);
    totalAchieved += (Math.min(cand, req) * w);

    skillset_gap.push({
      category_code: cat,
      category_name: CATEGORY_NAMES[cat],
      required_level: req,
      candidate_level: cand,
      gap: hasGap,
      gap_delta: delta,
      required_bloom: comp.skills[cat]?.bloom || "AP"
    });
  });

  const baseScore = totalNeeded > 0 ? (totalAchieved / totalNeeded) * 100 : 0;
  const penalty = Math.min(15, severePenalties * 3.5);
  const readiness_score = Math.max(0, Math.min(100, Math.round(baseScore - penalty)));

  return {
    company: comp.name,
    description: comp.description,
    readiness_score,
    skillset_gap,
    met_count: skillset_gap.filter(g => !g.gap).length,
    gaps_count: skillset_gap.filter(g => g.gap).length
  };
}

export default function TalentCheckCard({ profile, company, setCompany, onContinueToJd }) {
  const result = useMemo(() => evaluateTalentCheck(profile, company), [profile, company]);

  const tone = result.readiness_score >= 75 ? "high" : result.readiness_score >= 50 ? "mid" : "low";
  const verdict = result.readiness_score >= 75 ? "Competitive / Ready" : result.readiness_score >= 50 ? "Moderate Fit" : "Significant Gaps";

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <div>
          <h3 className="panel__title" style={{ margin: 0 }}>Company Benchmark & Readiness</h3>
          <p style={{ color: "var(--ink-2)", fontSize: "0.92rem", marginTop: "0.25rem" }}>
            Evaluating across all 12 RADIX competencies for <strong>{result.company}</strong>
          </p>
        </div>
        <div style={{ minWidth: "240px" }}>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            aria-label="Select Target Company"
            style={{ fontWeight: 600 }}
          >
            {Object.keys(BENCHMARK_COMPANIES).map((comp) => (
              <option key={comp} value={comp}>{comp}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="result__top" style={{ marginBottom: "1.25rem", padding: "1.25rem", background: "var(--paper-2)", borderRadius: "8px" }}>
        <div>
          <p className="result__src">Hiring Bar Expectations</p>
          <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--ink)" }}>{result.description}</h4>
          <p style={{ fontSize: "0.88rem", color: "var(--ink-2)", marginTop: "0.35rem" }}>
            Candidate meets <strong>{result.met_count} of 12</strong> benchmark requirement dimensions.
          </p>
        </div>
        <div className={`score score--${tone}`}>
          <div className="score__num">{result.readiness_score}<small>%</small></div>
          <p className="score__sub">{verdict}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.6rem", marginBottom: "1.5rem" }}>
        {result.skillset_gap.map((item) => (
          <div
            key={item.category_code}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.55rem 0.85rem",
              borderRadius: "6px",
              background: "var(--paper)",
              border: `1px solid ${item.gap ? "var(--brick-bg)" : "var(--line-2)"}`
            }}
          >
            <div>
              <span className="tag" style={{ marginRight: "0.5rem" }}>{item.category_code}</span>
              <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{item.category_name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-2)", fontFamily: "monospace" }}>
                {item.candidate_level}/{item.required_level}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  background: item.gap ? "var(--brick-bg)" : "var(--moss-bg)",
                  color: item.gap ? "var(--brick)" : "var(--moss)"
                }}
              >
                {item.gap ? <><CrossIcon /> -{Math.abs(item.gap_delta)}</> : <><CheckIcon /> OK</>}
              </span>
            </div>
          </div>
        ))}
      </div>

      <hr className="divider" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-2)", margin: 0 }}>
          Check candidate suitability against a specific Job Description?
        </p>
        <button
          className="btn btn--saffron"
          onClick={onContinueToJd}
        >
          Compare with specific Job Description ➔
        </button>
      </div>
    </div>
  );
}