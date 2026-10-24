import React, { useState } from "react";
import { saveProfile, uploadAndParseResume } from "../utils/api";
import { UploadIcon } from "./icons";

const categories = [
  "DSA", "COD", "OOD", "APTI", "COMM", "AI",
  "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS", "OTHER",
];

export default function ProfileBuilder({
  profile,
  setProfile,
  onProfileUpdated,
  showUploader = false
}) {
  const [skillName, setSkillName] = useState("");
  const [category, setCategory] = useState("COD");
  const [evidence, setEvidence] = useState("");
  const [projectText, setProjectText] = useState("");
  const [hackathonText, setHackathonText] = useState("");
  const [internshipText, setInternshipText] = useState("");
  const [parsingResume, setParsingResume] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setParsingResume(true);
    setStatusMsg(`Parsing resume "${file.name}" with Role 2 engine...`);

    try {
      const parsed = await uploadAndParseResume(file);

      const updated = {
        name: parsed.name ? String(parsed.name).trim() : "",
        email: parsed.email ? String(parsed.email).trim() : "",
        education: parsed.education ? String(parsed.education).trim() : "",
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        internships: Array.isArray(parsed.internships) ? parsed.internships : [],
        hackathons: Array.isArray(parsed.hackathons) ? parsed.hackathons : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        preferred_roles: Array.isArray(parsed.preferred_roles) ? parsed.preferred_roles : [],
        cv_file: file.name || "",
      };

      setProfile(updated);
      if (onProfileUpdated) onProfileUpdated(updated);

      setStatusMsg(
        `✓ Previous data cleared. Loaded new profile for ${parsed.name || "candidate"} (${parsed.skills?.length || 0} skills, ${parsed.projects?.length || 0} projects).`
      );
    } catch (err) {
      setStatusMsg(`Error parsing resume: ${err.message}`);
    } finally {
      setParsingResume(false);
      e.target.value = "";
    }
  }

  function addSkill() {
    if (!skillName.trim()) return;
    setProfile((prev) => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          skill_name: skillName.trim(),
          category_code: category,
          evidence: evidence.trim(),
          confidence: "high",
        },
      ],
    }));
    setSkillName("");
    setEvidence("");
  }

  function addProject() {
    if (!projectText.trim()) return;
    setProfile((prev) => ({
      ...prev,
      projects: [...prev.projects, projectText.trim()],
    }));
    setProjectText("");
  }

  function addHackathon() {
    if (!hackathonText.trim()) return;
    setProfile((prev) => ({
      ...prev,
      hackathons: [...prev.hackathons, hackathonText.trim()],
    }));
    setHackathonText("");
  }

  function addInternship() {
    if (!internshipText.trim()) return;
    setProfile((prev) => ({
      ...prev,
      internships: [...prev.internships, internshipText.trim()],
    }));
    setInternshipText("");
  }

  async function handleSave() {
    try {
      setStatusMsg("Saving profile to backend...");
      const res = await saveProfile(profile);
      setStatusMsg(`Saved successfully! Profile ID: ${res.id}`);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  }

  const isError = statusMsg.startsWith("Error");
  const isOk = statusMsg.startsWith("\u2713") || statusMsg.startsWith("Saved");

  return (
    <div>
      {/* Upload Option (Hidden completely when user is building profile manually) */}
      {showUploader && (
        <div className="fill" style={{ marginBottom: "1.25rem" }}>
          <div>
            <h4>Upload Candidate Resume</h4>
            <p>
              Upload a resume (PDF/DOCX) to automatically populate candidate info and map skills to the 12 RADIX areas.
            </p>
          </div>
          <label
            className="btn btn--line"
            aria-disabled={parsingResume}
            style={parsingResume ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
          >
            <UploadIcon />
            {parsingResume ? "Reading resume\u2026" : "Upload resume"}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              disabled={parsingResume}
              onChange={handleResumeUpload}
            />
          </label>
        </div>
      )}

      {statusMsg && (
        <div
          className={`notice ${isError ? "notice--error" : isOk ? "notice--ok" : "notice--info"}`}
          role={isError ? "alert" : "status"}
          style={{ marginBottom: "1rem" }}
        >
          {statusMsg}
        </div>
      )}

      <div className="grid-2">
        <div className="panel" style={{ margin: 0 }}>
          <h3 className="panel__title">Candidate Information</h3>
          <div className="stack">
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                placeholder="e.g. Ananya Rao"
                value={profile.name || ""}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="candidate@example.edu"
                value={profile.email || ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Education and degree</span>
              <textarea
                rows={2}
                placeholder="Degree, major, university, graduation year..."
                value={profile.education || ""}
                onChange={(e) => setProfile({ ...profile, education: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Target roles</span>
              <input
                type="text"
                placeholder="e.g. Software Engineer, Backend Engineer"
                value={profile.preferred_roles?.join(", ") || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    preferred_roles: e.target.value.split(",").map((s) => s.trim()),
                  })
                }
              />
            </label>
          </div>

          <hr className="divider" />
          <label className="field">
            <span>Capstone or systems project</span>
            <textarea
              rows={2}
              placeholder="e.g. Built a distributed URL shortener with a Redis cache"
              value={projectText}
              onChange={(e) => setProjectText(e.target.value)}
            />
          </label>
          <div className="actions">
            <button className="btn btn--line btn--small" onClick={addProject}>
              Add project
            </button>
          </div>

          <hr className="divider" />
          <div className="stack">
            <div className="field">
              <span className="field__label">Hackathon</span>
              <div className="inline-add">
                <input
                  type="text"
                  placeholder="Achievement or project title"
                  value={hackathonText}
                  onChange={(e) => setHackathonText(e.target.value)}
                />
                <button className="btn btn--line btn--small" onClick={addHackathon}>
                  Add
                </button>
              </div>
            </div>
            <div className="field">
              <span className="field__label">Internship</span>
              <div className="inline-add">
                <input
                  type="text"
                  placeholder="Internship experience"
                  value={internshipText}
                  onChange={(e) => setInternshipText(e.target.value)}
                />
                <button className="btn btn--line btn--small" onClick={addInternship}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <h3 className="panel__title">Skills & Inventory</h3>
          <div className="two">
            <input
              type="text"
              placeholder="Skill, e.g. C++ or Git"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Evidence or usage context..."
            style={{ marginTop: "0.5rem" }}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
          <button
            className="btn btn--line btn--block"
            style={{ marginTop: "0.5rem" }}
            onClick={addSkill}
          >
            Add skill
          </button>

          <h4 className="h4" style={{ marginTop: "1.25rem" }}>
            Recorded skills ({profile.skills?.length || 0})
          </h4>
          <ul className="chips skills-scroll">
            {profile.skills?.map((s, idx) => (
              <li key={idx} className="chip chip--skill">
                <span className="tag">{s.category_code || "SKILL"}</span> {s.skill_name || s}
              </li>
            ))}
          </ul>

          <h4 className="h4">
            Recorded projects ({profile.projects?.length || 0})
          </h4>
          <ul className="plain-list">
            {profile.projects?.map((p, idx) => (
              <li key={idx}>{typeof p === "string" ? p : p.title}</li>
            ))}
          </ul>

          <hr className="divider" />
          <div className="actions" style={{ marginTop: 0 }}>
            <button
              className="btn btn--line btn--block"
              onClick={handleSave}
            >
              Save profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}