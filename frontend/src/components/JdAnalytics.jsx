import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import { analyzeJD } from "../utils/jd_engine";
import { UploadIcon, CheckIcon } from "./icons";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function JdAnalytics({ onJdExtracted, currentJd }) {
  const [jdText, setJdText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [fileError, setFileError] = useState("");

  // Parse Uploaded PDF or Word DOCX
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setAnalyzing(true);
    setFileError("");
    try {
      let extracted = "";
      if (file.name.endsWith(".pdf")) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let textContent = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map(it => it.str).join(" ") + "\n";
        }
        extracted = textContent;
      } else if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extracted = result.value;
      } else {
        extracted = await file.text();
      }

      setJdText(extracted);
      runEngineAnalysis(extracted, file.name);
    } catch (err) {
      setFileError("Could not read that file: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function runEngineAnalysis(text, filename = "Job Posting") {
    if (!text.trim()) return;
    const result = analyzeJD(text);
    const structuredJd = {
      source_file: filename,
      company: result.summary.company || "Target Company",
      role: result.summary.title || "Target Role",
      skills: result.skills.map(s => ({
        name: s.name,
        tier: s.tier, // 'ess', 'pref', 'opt'
        category: s.cat
      })),
      summary: result.summary
    };
    setExtractedInfo(structuredJd);
    onJdExtracted(structuredJd);
  }

  const TIER_LABEL = { ess: "essential", pref: "preferred", opt: "optional" };

  return (
    <div className="panel">
      <div className="panel__row">
        <h3 className="panel__title" style={{ margin: 0 }}>Job description text</h3>
        <label className="btn btn--line btn--small">
          <UploadIcon /> Upload PDF, DOCX or TXT
          <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="field" style={{ marginTop: "0.85rem" }}>
        <span className="sr-only">Job description</span>
        <textarea
          rows={7}
          placeholder="Paste the full job description here, or upload a file above."
          value={jdText}
          onChange={e => setJdText(e.target.value)}
        />
      </div>

      <div className="actions">
        <button className="btn btn--ink" onClick={() => runEngineAnalysis(jdText, "Pasted Job Description")} disabled={analyzing}>
          {analyzing ? "Extracting skills\u2026" : "Extract skills"}
        </button>
        {extractedInfo && (
          <span className="sub" role="status" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--moss)", fontWeight: 600 }}>
            <CheckIcon width={16} height={16} /> {extractedInfo.skills.length} skills found for {extractedInfo.role} at {extractedInfo.company}
          </span>
        )}
      </div>

      {fileError && <div className="notice notice--error" role="alert" style={{ marginTop: "0.85rem" }}>{fileError}</div>}

      {extractedInfo && (
        <>
          <hr className="divider" />
          <h4 className="panel__title" style={{ fontSize: "0.98rem" }}>Skills the role asks for</h4>
          <div className="keyline" aria-hidden="true">
            <span><i className="k-ess" /> Essential</span>
            <span><i /> Preferred</span>
            <span><i className="k-opt" /> Optional</span>
          </div>
          <ul className="chips">
            {extractedInfo.skills.map((s, idx) => (
              <li key={idx} className={`chip chip--${s.tier}`} title={TIER_LABEL[s.tier] || s.tier}>
                {s.name}<span className="sr-only"> ({TIER_LABEL[s.tier] || s.tier})</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
