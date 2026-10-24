import React, { useMemo, useState } from "react";
import JdAnalytics from "./components/JdAnalytics";
import ProfileBuilder from "./components/ProfileBuilder";
import TalentCheckCard from "./components/TalentCheckCard";
import SkillMatchCard from "./components/SkillMatchCard";
import RadixDial from "./components/RadixDial";
import { matchCandidateToJD } from "./utils/api";
import { CATEGORY_CODES, categoryLevels, requirementLevels } from "./utils/radix";
import { useActiveStep, useScrollVars } from "./hooks/useMotion";

const initialAnanyaProfile = {
  name: "Ananya Rao",
  email: "ananya.rao@example.com",
  education: "B.Tech, Computer Science and Engineering, Class of 2026 — CGPA 8.6 / 10",
  skills: [
    { skill_name: "C++", category_code: "COD", evidence: "Technical Skills", confidence: "high" },
    { skill_name: "Python", category_code: "COD", evidence: "Technical Skills", confidence: "high" },
    { skill_name: "Java", category_code: "COD", evidence: "Technical Skills", confidence: "high" },
    { skill_name: "Data Structures & Algorithms", category_code: "DSA", evidence: "Solved 350+ problems", confidence: "high" },
    { skill_name: "Operating Systems", category_code: "OS", evidence: "Coursework and project", confidence: "high" },
    { skill_name: "Computer Networks", category_code: "NETW", evidence: "Technical Skills", confidence: "high" },
    { skill_name: "Object-Oriented Design", category_code: "OOD", evidence: "Java design patterns", confidence: "high" },
    { skill_name: "Git", category_code: "SWE", evidence: "Technical Skills", confidence: "high" },
    { skill_name: "Linux", category_code: "OS", evidence: "Technical Skills", confidence: "high" }
  ],
  projects: [
    "Built a distributed URL-shortening service with a Redis-backed cache and a horizontally-scalable API layer as a capstone systems project",
    "Implemented a multithreaded job scheduler in C++ simulating OS-level process scheduling algorithms (Round Robin, Priority, SJF)",
    "Designed a parking-lot management system in Java using OOP design patterns (Factory, Strategy)"
  ],
  hackathons: ["Finalist, national-level 24-hour hackathon — built a real-time chat backend"],
  internships: ["Summer intern, backend team at a mid-size product startup — shipped a rate-limiter used in production"],
  certifications: [],
  preferred_roles: ["Software Engineer", "Backend Engineer"],
  cv_file: "Ananya Rao.pdf"
};

const sampleGoogleSweJd = {
  source_file: "Google LLC - Software Engineer.pdf",
  company: "Google LLC",
  role: "Software Engineer (SWE)",
  skills: [
    { name: "Data Structures & Algorithms", tier: "ess" },
    { name: "C++", tier: "ess" },
    { name: "Operating Systems", tier: "ess" },
    { name: "Computer Networks", tier: "ess" },
    { name: "Object-Oriented Design", tier: "ess" },
    { name: "System Design", tier: "ess" },
    { name: "Testing Strategy", tier: "ess" },
    { name: "CI/CD Concepts", tier: "ess" },
    { name: "Distributed Systems", tier: "pref" },
    { name: "Large Codebase", tier: "pref" },
    { name: "Open-Source Contributions", tier: "pref" }
  ]
};

const STEP_COPY = {
  profile: { n: 1, title: "Candidate Profile", blurb: "Upload a resume or build candidate credentials manually. Modify skills and evidence anytime." },
  talent: { n: 2, title: "Company Talent Check", blurb: "Benchmark candidate readiness and competency gaps against Tier-1 target hiring bars." },
  jd: { n: 3, title: "Role-Specific Skill Match", blurb: "Compare candidate qualifications directly against specific job description requirements." },
  match: { n: 4, title: "Fit Verdict & Analysis", blurb: "Matched skills and missing capability gaps grouped by RADIX category." },
};

function StepHead({ id }) {
  const c = STEP_COPY[id];
  return (
    <header className="step__head">
      <span className="step__n" aria-hidden="true">{c.n}</span>
      <h2 className="step__title">{c.title}</h2>
      <p className="step__blurb">{c.blurb}</p>
    </header>
  );
}

function BrandMark() {
  const lens = [11, 8, 12, 6, 9, 12, 7, 10, 12, 8, 11, 6];
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
      {lens.map((l, i) => {
        const a = ((-90 + i * 30) * Math.PI) / 180;
        return (
          <line
            key={i}
            x1="16"
            y1="16"
            x2={16 + l * 1.3 * Math.cos(a)}
            y2={16 + l * 1.3 * Math.sin(a)}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="16" cy="16" r="2.4" fill="#e8a532" />
    </svg>
  );
}

export default function App() {
  const [profile, setProfile] = useState(initialAnanyaProfile);
  const [entryMode, setEntryMode] = useState("upload"); // 'upload' | 'manual'
  const [company, setCompany] = useState("Google LLC");
  const [showJdMatchSection, setShowJdMatchSection] = useState(false);

  const [currentJd, setCurrentJd] = useState(sampleGoogleSweJd);
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");

  useScrollVars();
  const stage = useActiveStep([entryMode, showJdMatchSection, !!matchResult, matching]);

  const candidateLevels = useMemo(() => categoryLevels(profile.skills).map((l) => l.level), [profile.skills]);
  const requirement = useMemo(() => requirementLevels(currentJd), [currentJd]);
  const gaps = useMemo(
    () => new Set(Object.keys(matchResult?.missing_by_category || {}).filter((c) => CATEGORY_CODES.includes(c))),
    [matchResult]
  );

  async function triggerMatch() {
    setMatchError("");
    if (!currentJd || !currentJd.skills || currentJd.skills.length === 0) {
      setMatchError("Please extract skills from a Job Description first.");
      return;
    }
    setMatching(true);
    try {
      const res = await matchCandidateToJD(currentJd, profile);
      setMatchResult(res);
      setTimeout(() => document.getElementById("step-match")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (err) {
      setMatchError(`Match error: ${err.message}. Verify that the backend is active.`);
    } finally {
      setMatching(false);
    }
  }

  function handleOpenJdSection() {
    setShowJdMatchSection(true);
    setTimeout(() => {
      document.getElementById("step-jd")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  const jump = (id) => document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const steps = [
    { id: "profile", label: "1. Profile Builder", sub: entryMode === "upload" ? "Resume Auto-fill" : "Manual Input" },
    { id: "talent", label: "2. Talent Check", sub: company },
    showJdMatchSection && { id: "jd", label: "3. Job Description", sub: currentJd?.role || "Select / Upload" },
    (matchResult || matching || matchError) && { id: "match", label: "4. Match Score", sub: matching ? "Calculating..." : `${Math.round(matchResult?.match_score || 0)}% fit` },
  ].filter(Boolean);

  const order = steps.map((s) => s.id);

  return (
    <>
      <header className="appbar">
        <div className="appbar__in">
          <span className="brand"><BrandMark />RADIX <small>Talent Match</small></span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--ink-2)", fontWeight: 500 }}>Profile Source:</span>
            <select
              value={entryMode}
              onChange={(e) => setEntryMode(e.target.value)}
              style={{ width: "auto", minWidth: "210px", padding: "0.35rem 0.65rem", fontSize: "0.88rem", fontWeight: 600 }}
              aria-label="Select Profile Source Mode"
            >
              <option value="upload">Upload Resume (Auto-fill & Edit)</option>
              <option value="manual">Build Profile Manually</option>
            </select>
          </div>
        </div>
      </header>

      <div className="shell">
        <aside className="rail" aria-label="Skill dial and progress">
          <div className="rail__sticky">
            <RadixDial
              candidate={candidateLevels}
              requirement={requirement}
              gaps={gaps}
              stage={stage}
              candidateName={profile.name}
              roleName={currentJd?.role}
            />
            <ol className="steps" aria-label="Workflow Steps">
              {steps.map((s) => {
                const ai = order.indexOf(stage);
                const si = order.indexOf(s.id);
                const cls = stage === s.id ? "is-active" : ai > si && ai !== -1 ? "is-past" : "";
                return (
                  <li key={s.id} className={cls}>
                    <button onClick={() => jump(s.id)}>
                      <span className="steps__n">{s.label.charAt(0)}</span>
                      <span>
                        <span className="steps__t">{s.label}</span>
                        <span className="steps__s">{s.sub}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        <main className="main">
          {/* STEP 1: Upload Resume / Profile Builder */}
          <section id="step-profile" data-step="profile" className="step">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <StepHead id="profile" />
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--ink-2)" }}>Mode:</span>
                <select
                  value={entryMode}
                  onChange={(e) => setEntryMode(e.target.value)}
                  style={{ width: "auto", padding: "0.35rem 0.6rem", fontSize: "0.85rem", fontWeight: 600 }}
                >
                  <option value="upload">Upload Resume (Auto-fill & Edit)</option>
                  <option value="manual">Build Profile Manually</option>
                </select>
              </div>
            </div>

            <ProfileBuilder
              profile={profile}
              setProfile={setProfile}
              onProfileUpdated={() => setMatchResult(null)}
              showUploader={entryMode === "upload"}
            />
          </section>

          {/* STEP 2: Talent Check Result */}
          <section id="step-talent" data-step="talent" className="step">
            <StepHead id="talent" />
            <TalentCheckCard
              profile={profile}
              company={company}
              setCompany={setCompany}
              onContinueToJd={handleOpenJdSection}
            />
          </section>

          {/* STEP 3: Job Description & Skill Match (Revealed via dedicated button) */}
          {showJdMatchSection && (
            <>
              <section id="step-jd" data-step="jd" className="step">
                <StepHead id="jd" />
                <JdAnalytics
                  onJdExtracted={(jd) => {
                    setCurrentJd(jd);
                    setMatchResult(null);
                  }}
                  currentJd={currentJd}
                />
                <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn--saffron" onClick={triggerMatch} disabled={matching}>
                    {matching ? "Comparing Candidate with Role..." : "Run Skill Match Fit ➔"}
                  </button>
                </div>
              </section>

              {(matching || matchError || matchResult) && (
                <section id="step-match" data-step="match" className="step">
                  <StepHead id="match" />
                  {matching && (
                    <div className="notice notice--busy" role="status">Comparing candidate against role requirements...</div>
                  )}
                  {matchError && <div className="notice notice--error" role="alert">{matchError}</div>}
                  {matchResult && !matching && <SkillMatchCard matchResult={matchResult} />}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}