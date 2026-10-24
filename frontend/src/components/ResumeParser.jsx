import React, { useState, useRef } from "react";
import { uploadAndParseResume } from "../utils/api";
import { CATEGORY_NAMES, band, categoryLevels } from "../utils/radix";
import { UploadIcon, FileIcon } from "./icons";

export default function ResumeParser({ onProfileExtracted, onGoToProfile }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(f) {
    if (!f) return;
    setFile(f);
    setLoading(true);
    setError("");

    try {
      const data = await uploadAndParseResume(f);
      setResult(data);
      if (onProfileExtracted) {
        onProfileExtracted(data);
      }
    } catch (e) {
      setResult(null);
      setError(e.message || "Could not parse resume");
    } finally {
      setLoading(false);
    }
  }

  const levels = result ? categoryLevels(result.skills) : [];
  const covered = levels.filter((l) => l.level > 0).length;
  const name = result?.name || "Candidate";

  return (
    <div className="panel">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <button
        type="button"
        className={`drop${dragging ? " is-over" : ""}`}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
      >
        {file ? <FileIcon /> : <UploadIcon />}
        <span className="drop__title">{file ? file.name : "Drop a resume here, or choose a file"}</span>
        <span className="drop__hint">PDF, DOCX or TXT</span>
      </button>

      {loading && (
        <div className="notice notice--busy" role="status" style={{ marginTop: "1rem" }}>
          Reading the resume and placing each skill in the 12 RADIX areas&hellip;
        </div>
      )}

      {error && <div className="notice notice--error" role="alert" style={{ marginTop: "1rem" }}>{error}</div>}

      {result && !loading && (
        <div style={{ marginTop: "1.75rem" }}>
          <div className="panel__row">
            <div className="person">
              <div className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
              <div>
                <h3>{name}</h3>
                <p className="sub">
                  {result.email ? `${result.email}. ` : ""}
                  {result.skills.length} skills found across {covered} of 12 areas.
                </p>
              </div>
            </div>
            {onGoToProfile && (
              <button className="btn btn--ink" onClick={onGoToProfile}>Review in profile</button>
            )}
          </div>

          <h4 className="h4">Level in each skill area, 0 to 10</h4>
          <ul className="levels">
            {levels.map(({ code, level, skills }) => {
              const { label, tone } = band(level);
              return (
                <li key={code} className={`level tone-${tone}`}>
                  <div className="level__top">
                    <span className="level__name">{CATEGORY_NAMES[code]}</span>
                    <span className="level__val">{level}/10<small>{label}</small></span>
                  </div>
                  <div className="meter" role="img" aria-label={`${level} out of 10`}>
                    <div className="meter__fill" style={{ width: `${level * 10}%` }} />
                  </div>
                  <div className="level__skills">
                    {skills.length > 0 ? skills.map((s) => s.skill_name).join(", ") : "No evidence found"}
                  </div>
                </li>
              );
            })}
          </ul>

          <h4 className="h4">What the resume says</h4>
          <div className="facts">
            <div className="fact">
              <h5>Education</h5>
              <p>{result.education || "Not specified"}</p>
              <h5>Projects ({result.projects?.length || 0})</h5>
              <ul>
                {result.projects?.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div className="fact">
              <h5>Internships and experience</h5>
              <ul>
                {result.internships?.concat(result.experience || []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
                {(!result.internships?.length && !result.experience?.length) && <li>None listed</li>}
              </ul>
              <h5>Hackathons and achievements</h5>
              <ul>
                {result.hackathons?.concat(result.achievements || []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
                {(!result.hackathons?.length && !result.achievements?.length) && <li>None listed</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
