// Shared RADIX taxonomy helpers used by the UI (dial, resume scorecards, match card).
// resolveCategory mirrors backend/skill_matching.py's RADIX_TAXONOMY. It only drives the
// requirement chart; scoring and gap lists still come from the backend.

export const CATEGORY_NAMES = {
  COD: "Coding",
  DSA: "Data Structures & Algorithms",
  OOD: "Object-Oriented Design",
  APTI: "Aptitude and Problem Solving",
  COMM: "Communication Skills",
  AI: "Artificial Intelligence",
  CLOUD: "Cloud Computing",
  SQL: "SQL & Databases",
  SWE: "Software Engineering",
  SYSD: "System Design",
  NETW: "Networking",
  OS: "Operating Systems",
};

export const CATEGORY_SHORT = {
  COD: "Coding", DSA: "Algorithms", OOD: "OO design", APTI: "Aptitude",
  COMM: "Communication", AI: "AI", CLOUD: "Cloud", SQL: "SQL",
  SWE: "Engineering", SYSD: "System design", NETW: "Networks", OS: "OS",
};

export const CATEGORY_CODES = Object.keys(CATEGORY_NAMES);

const WEIGHT = { high: 1.5, medium: 1, low: 0.5 };
const TIER_WEIGHT = { ess: 1.5, core: 1.5, essential: 1.5, pref: 1, opt: 0.5 };

const TAXONOMY = {
  COD: ["python", "java", "c++", "c#", "c", "go", "golang", "rust", "javascript", "typescript", "ruby", "php", "kotlin", "swift", "programming", "coding", "hands-on programming"],
  DSA: ["data structures & algorithms", "data structures and algorithms", "data structures", "algorithms", "dsa", "trees", "graphs", "hash maps", "complexity analysis"],
  OOD: ["object-oriented design", "object oriented design", "oop", "design patterns", "solid principles", "object-oriented programming"],
  APTI: ["quantitative reasoning", "analytical reasoning", "statistics", "applied statistics", "probability", "a/b testing", "experiments", "problem solving", "quantitative aptitude"],
  COMM: ["communication skills", "communication", "stakeholder management", "collaboration", "written communication", "verbal communication"],
  AI: ["machine learning", "ml", "deep learning", "nlp", "computer vision", "generative ai", "artificial intelligence", "predictive models", "applied statistics/ml literacy"],
  CLOUD: ["cloud", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "cloud infrastructure"],
  SQL: ["sql", "postgresql", "mysql", "nosql", "relational databases", "schema design", "query optimization", "practical sql", "basic sql"],
  SWE: ["software engineering", "testing strategy", "code review", "git", "agile", "technical debt", "unit testing", "sdlc", "large codebase", "open-source contributions", "ticketing system"],
  SYSD: ["system design", "distributed systems", "scalability", "microservices", "rest apis", "apis", "system design at scale", "url shortener"],
  NETW: ["computer networks", "networking", "tcp/ip", "http", "dns", "rest", "latency"],
  OS: ["operating systems", "os", "linux", "unix", "processes", "threads", "multithreading", "virtual memory", "process scheduling"],
};

const LOOKUP = new Map();
Object.entries(TAXONOMY).forEach(([code, keys]) => keys.forEach((k) => LOOKUP.set(k, code)));

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s+#/.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveCategory(skillName) {
  const cleaned = normalize(skillName);
  if (LOOKUP.has(cleaned)) return LOOKUP.get(cleaned);
  for (const [key, code] of LOOKUP) if (key.length > 1 && cleaned.includes(key)) return code;
  return "OTHER";
}

export function band(level) {
  if (level >= 7) return { label: "Strong", tone: "strong" };
  if (level >= 5) return { label: "Moderate", tone: "moderate" };
  if (level >= 1) return { label: "Basic", tone: "basic" };
  return { label: "Not shown", tone: "none" };
}

// Candidate skills -> level (0-10) per category. Same formula the resume scorecard used.
export function categoryLevels(skills = []) {
  return CATEGORY_CODES.map((code) => {
    const mine = skills.filter((s) => s && s.category_code === code);
    const points = mine.reduce((sum, s) => sum + (WEIGHT[s.confidence] ?? 1), 0);
    return { code, level: Math.min(10, Math.round(points * 2)), skills: mine };
  });
}

// JD skills -> the level the role asks for per category, on the same scale as the candidate.
export function requirementLevels(jd) {
  const points = Object.fromEntries(CATEGORY_CODES.map((c) => [c, 0]));
  (jd?.skills || []).forEach((s) => {
    const name = typeof s === "string" ? s : s.name || s.skill_name || "";
    const code = resolveCategory(name);
    if (points[code] !== undefined) points[code] += TIER_WEIGHT[s.tier] ?? 1.5;
  });
  return CATEGORY_CODES.map((c) => Math.min(10, Math.round(points[c] * 2)));
}
