import React, { useState } from "react";
import { CATEGORY_CODES, CATEGORY_NAMES, CATEGORY_SHORT } from "../utils/radix";
import { useTween } from "../hooks/useMotion";

const C = 250;        // centre of the 500 x 500 viewBox
const R = 128;        // radius of level 10
const LABEL_R = 146;
const RINGS = [2.5, 5, 7.5, 10];

const angle = (i) => ((-90 + i * 30) * Math.PI) / 180;
const at = (i, level, r = R) => {
  const d = (r * level) / 10;
  return [C + d * Math.cos(angle(i)), C + d * Math.sin(angle(i))];
};
const outline = (vals) =>
  vals.map((v, i) => at(i, v)).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";

const bezel = Array.from({ length: 72 }, (_, i) => i);

const CAPTION = {
  intro: "Twelve skill areas. Each spoke runs from 0 to 10.",
  jd: "What the role asks for",
  resume: "What the candidate shows",
  profile: "What the candidate shows",
  match: "Where the two meet",
};

export default function RadixDial({ candidate, requirement, gaps, stage, candidateName, roleName }) {
  const [hover, setHover] = useState(null);
  const cand = useTween(candidate, { ms: 900, delay: 1250 });
  const req = useTween(requirement, { ms: 900, delay: 1050 });

  const reqState = stage === "resume" || stage === "profile" ? "dim" : "on";
  const candState = stage === "jd" ? "dim" : "on";
  const showGaps = stage === "match";

  const h = hover;
  const caption = h !== null
    ? `${CATEGORY_NAMES[CATEGORY_CODES[h]]}: candidate ${candidate[h]}, role needs ${requirement[h]}`
    : CAPTION[stage] || CAPTION.intro;

  return (
    <figure className="dial">
      <svg
        className="dial__svg"
        viewBox="0 0 500 500"
        role="img"
        aria-label={`Skill dial for ${candidateName || "candidate"} against ${roleName || "the role"} across 12 RADIX categories`}
      >
        {/* bezel: turns slowly with page scroll */}
        <g className="dial__bezel">
          {bezel.map((i) => {
            const a = (i * 5 * Math.PI) / 180;
            const major = i % 6 === 0;
            const r1 = 249;
            const r2 = major ? 240 : 244;
            return (
              <line key={i} x1={C + r1 * Math.cos(a)} y1={C + r1 * Math.sin(a)} x2={C + r2 * Math.cos(a)} y2={C + r2 * Math.sin(a)} className={major ? "dial__tick dial__tick--major" : "dial__tick"} />
            );
          })}
        </g>

        {RINGS.map((lv, i) => (
          <circle key={lv} cx={C} cy={C} r={(R * lv) / 10} pathLength="1" className={`dial__ring${lv === 10 ? " dial__ring--outer" : ""}`} style={{ animationDelay: `${150 + i * 140}ms` }} />
        ))}
        {[0, 5, 10].map((lv) => lv > 0 && (
          <text key={lv} x={C + 3} y={C - (R * lv) / 10 - 3} className="dial__scale" aria-hidden="true">{lv}</text>
        ))}

        {/* requirement, then candidate */}
        <g className={`dial__layer dial__layer--${reqState}`}>
          <path d={outline(req)} className="dial__req" />
        </g>
        <g className={`dial__layer dial__layer--${candState}`}>
          <path d={outline(cand)} className="dial__cand" />
          {cand.map((v, i) => {
            const [x, y] = at(i, v);
            return <circle key={i} cx={x} cy={y} r={v > 0.3 ? 3.2 : 0} className="dial__dot" />;
          })}
        </g>

        {/* gap markers: candidate level up to what the role needs */}
        {CATEGORY_CODES.map((code, i) => {
          if (!showGaps || !gaps.has(code)) return null;
          const [x1, y1] = at(i, Math.min(candidate[i], requirement[i]));
          const [x2, y2] = at(i, Math.max(requirement[i], candidate[i] + 1));
          return (
            <g key={code} className="dial__gap">
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
              <circle cx={x2} cy={y2} r="5" />
            </g>
          );
        })}

        {/* spokes, labels, and hover/focus targets */}
        {CATEGORY_CODES.map((code, i) => {
          const [x2, y2] = at(i, 10);
          const [lx, ly] = [C + LABEL_R * Math.cos(angle(i)), C + LABEL_R * Math.sin(angle(i))];
          const cos = Math.cos(angle(i));
          const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
          const dy = Math.abs(Math.sin(angle(i))) > 0.9 ? (Math.sin(angle(i)) > 0 ? 12 : -2) : 4;
          const active = h === i;
          return (
            <g
              key={code}
              className={`dial__spoke${active ? " is-active" : ""}${gaps.has(code) && showGaps ? " has-gap" : ""}`}
              tabIndex={0}
              role="group"
              aria-label={`${CATEGORY_NAMES[code]}: candidate ${candidate[i]} of 10, role needs ${requirement[i]} of 10`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <line x1={C} y1={C} x2={x2} y2={y2} className="dial__axis" />
              <line x1={C} y1={C} x2={lx} y2={ly} className="dial__hit" />
              <text x={lx} y={ly + dy} textAnchor={anchor} className="dial__label">{CATEGORY_SHORT[code]}</text>
            </g>
          );
        })}
      </svg>

      <figcaption className="dial__caption" aria-live="polite">{caption}</figcaption>

      <ul className="dial__legend" aria-label="Legend">
        <li><span className="swatch swatch--req" />Role needs</li>
        <li><span className="swatch swatch--cand" />Candidate shows</li>
        {showGaps && <li><span className="swatch swatch--gap" />Gap</li>}
      </ul>
    </figure>
  );
}
