"""
skill_matching.py — RADIX Talent Match: Role 5 Engine
=====================================================
Features:
- 3-tier boundary protection (Whole-word regex, alias lookup, token-set fuzzy matching).
- Scans candidate skills, projects, hackathons, internships, and education.
- Requirement-tiered scoring: 80% Core / 20% Nice-to-Have (auto-scales to 100% Core if Nice-to-Have is empty).
- Produces Flat lists (matched_skills, missing_skills) and Grouped views (missing_by_category).
"""

import re
from typing import Any, Dict, List, Set

# Optional rapidfuzz with graceful difflib fallback
try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    import difflib
    HAS_RAPIDFUZZ = False


# Canonical mapping of skill terms to the 12 RADIX categories
RADIX_TAXONOMY: Dict[str, str] = {
    # COD - Coding
    "python": "COD", "java": "COD", "c++": "COD", "c#": "COD", "c": "COD",
    "go": "COD", "golang": "COD", "rust": "COD", "javascript": "COD",
    "typescript": "COD", "ruby": "COD", "php": "COD", "kotlin": "COD",
    "swift": "COD", "programming": "COD", "coding": "COD", "hands-on programming": "COD",
    # DSA - Data Structures & Algorithms
    "data structures & algorithms": "DSA", "data structures and algorithms": "DSA",
    "data structures": "DSA", "algorithms": "DSA", "dsa": "DSA",
    "trees": "DSA", "graphs": "DSA", "hash maps": "DSA", "complexity analysis": "DSA",
    # OOD - Object Oriented Design
    "object-oriented design": "OOD", "object oriented design": "OOD",
    "oop": "OOD", "design patterns": "OOD", "solid principles": "OOD",
    "object-oriented programming": "OOD",
    # APTI - Aptitude & Analytical Reasoning
    "quantitative reasoning": "APTI", "analytical reasoning": "APTI",
    "statistics": "APTI", "applied statistics": "APTI", "probability": "APTI",
    "a/b testing": "APTI", "experiments": "APTI", "problem solving": "APTI",
    "quantitative aptitude": "APTI",
    # COMM - Communication
    "communication skills": "COMM", "communication": "COMM", "stakeholder management": "COMM",
    "collaboration": "COMM", "written communication": "COMM", "verbal communication": "COMM",
    # AI - AI Native & Machine Learning
    "machine learning": "AI", "ml": "AI", "deep learning": "AI", "nlp": "AI",
    "computer vision": "AI", "generative ai": "AI", "artificial intelligence": "AI",
    "predictive models": "AI", "applied statistics/ml literacy": "AI",
    # CLOUD - Cloud & DevOps
    "cloud": "CLOUD", "aws": "CLOUD", "azure": "CLOUD", "gcp": "CLOUD",
    "docker": "CLOUD", "kubernetes": "CLOUD", "ci/cd": "CLOUD", "cloud infrastructure": "CLOUD",
    # SQL - SQL & Databases
    "sql": "SQL", "postgresql": "SQL", "mysql": "SQL", "nosql": "SQL",
    "relational databases": "SQL", "schema design": "SQL", "query optimization": "SQL",
    "practical sql": "SQL", "basic sql": "SQL",
    # SWE - Software Engineering
    "software engineering": "SWE", "testing strategy": "SWE", "code review": "SWE",
    "git": "SWE", "agile": "SWE", "technical debt": "SWE", "unit testing": "SWE",
    "sdlc": "SWE", "large codebase": "SWE", "open-source contributions": "SWE",
    "ticketing system": "SWE",
    # SYSD - System Design & Architecture
    "system design": "SYSD", "distributed systems": "SYSD", "scalability": "SYSD",
    "microservices": "SYSD", "rest apis": "SYSD", "apis": "SYSD",
    "system design at scale": "SYSD", "url shortener": "SYSD",
    # NETW - Computer Networks
    "computer networks": "NETW", "networking": "NETW", "tcp/ip": "NETW",
    "http": "NETW", "dns": "NETW", "rest": "NETW", "latency": "NETW",
    # OS - Operating Systems
    "operating systems": "OS", "os": "OS", "linux": "OS", "unix": "OS",
    "processes": "OS", "threads": "OS", "multithreading": "OS", "virtual memory": "OS",
    "process scheduling": "OS",
}

# Synonyms and alias normalization
SKILL_ALIASES: Dict[str, List[str]] = {
    "dsa": ["data structures and algorithms", "algorithms", "data structures"],
    "algo": ["algorithms"],
    "algorithms": ["data structures and algorithms"],
    "data structures": ["data structures and algorithms"],
    "oop": ["object oriented design", "object oriented programming"],
    "object-oriented design": ["object oriented design", "oop", "object oriented programming", "design patterns"],
    "object-oriented programming": ["object oriented design", "oop", "design patterns"],
    "programming": ["c++", "java", "python", "javascript", "coding"],
    "os": ["operating systems", "linux", "unix"],
    "operating systems": ["os", "linux", "process scheduling", "multithreaded"],
    "networking": ["computer networks", "tcp ip", "http"],
    "computer networks": ["networking", "network"],
    "system design": ["distributed", "scalable api", "url shortening", "systems project", "distributed systems"],
    "distributed systems": ["distributed url shortening", "scalable api", "distributed"],
    "problem solving": ["competitive programming", "problems", "problem solving"],
    "communication skills": ["mentors juniors", "mentoring", "presentation", "communicate"],
    "large codebase": ["product startup", "mid-size product startup", "shipped"],
    "basic sql": ["sql"],
    "ml": ["machine learning"],
    "k8s": ["kubernetes"],
    "ci/cd": ["ci cd", "continuous integration", "git"],
    "ci/cd concepts": ["ci cd", "continuous integration"]
}

# Single-token languages that require strict word-boundary matching
STRICT_EXACT_TOKENS: Set[str] = {"c", "c++", "c#", "r", "go", "java", "sql", "git"}


def normalize_text(text: str) -> str:
    """Lowercases, normalizes ampersands and removes surplus whitespace."""
    if not text:
        return ""
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^\w\s\+\#\/\.\-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def calculate_similarity(req: str, target: str) -> float:
    """Calculates token similarity using RapidFuzz with difflib fallback."""
    if HAS_RAPIDFUZZ:
        return float(fuzz.token_set_ratio(req, target))
    return difflib.SequenceMatcher(None, req, target).ratio() * 100.0


def resolve_category(skill_name: str) -> str:
    """Maps skill string to one of the 12 RADIX categories."""
    cleaned = normalize_text(skill_name)
    if cleaned in RADIX_TAXONOMY:
        return RADIX_TAXONOMY[cleaned]
    for key, cat in RADIX_TAXONOMY.items():
        if key in cleaned:
            return cat
    return "OTHER"


def build_candidate_evidence_pool(profile: Dict[str, Any]) -> str:
    """Aggregates all candidate profile text into a normalized search pool."""
    pool_chunks: List[str] = []

    # 1. Explicit Skills
    for skill in profile.get("skills", []):
        if isinstance(skill, dict):
            pool_chunks.append(skill.get("skill_name", ""))
            pool_chunks.append(skill.get("evidence", ""))
        elif isinstance(skill, str):
            pool_chunks.append(skill)

    # 2. Projects (Handles both string lists and dict lists)
    for project in profile.get("projects", []):
        if isinstance(project, dict):
            pool_chunks.append(project.get("title", ""))
            pool_chunks.append(project.get("description", ""))
        elif isinstance(project, str):
            pool_chunks.append(project)

    # 3. Hackathons, Internships, Certifications, Achievements, Education
    for field in ["hackathons", "internships", "certifications", "achievements"]:
        for item in profile.get(field, []):
            pool_chunks.append(str(item))

    if profile.get("education"):
        pool_chunks.append(str(profile.get("education")))

    return normalize_text(" ".join(pool_chunks))


def check_skill_match(jd_skill: str, candidate_pool: str, candidate_skill_names: List[str]) -> bool:
    """
    Evaluates whether a JD skill is present in the candidate evidence pool
    using exact boundary protection, aliases, and high-threshold fuzzy matching.
    """
    clean_req = normalize_text(jd_skill)

    # 1. Strict Boundary Match (Protects C vs C++, Java vs JavaScript)
    if clean_req in STRICT_EXACT_TOKENS:
        escaped = re.escape(clean_req)
        pattern = rf"(?<!\w){escaped}(?!\w)"
        return bool(re.search(pattern, candidate_pool))

    # 2. Direct Substring Check on Pool
    if clean_req in candidate_pool:
        return True

    # 3. Alias / Conceptual Synonyms Check
    aliases = SKILL_ALIASES.get(clean_req, [])
    for alias in aliases:
        if alias in candidate_pool:
            return True
        if re.search(rf"\b{re.escape(alias)}\b", candidate_pool):
            return True

    # 4. Fuzzy Check Against Individual Candidate Skill Tokens
    for c_skill in candidate_skill_names:
        clean_cand = normalize_text(c_skill)
        score = calculate_similarity(clean_req, clean_cand)
        if score >= 85.0:
            return True

    # 5. Fuzzy Check Against Candidate Pool (Multi-word concept)
    if len(clean_req.split()) > 1:
        score = calculate_similarity(clean_req, candidate_pool)
        if score >= 88.0:
            return True

    return False


def match_skills(jd_data: Dict[str, Any], profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Core Entry Point for Role 5:
    Matches a structured JD skill set against a candidate profile.
    """
    evidence_pool = build_candidate_evidence_pool(profile_data)

    cand_skill_names = [
        s.get("skill_name", "") if isinstance(s, dict) else str(s)
        for s in profile_data.get("skills", [])
    ]

    core_requirements: List[str] = []
    nice_requirements: List[str] = []

    raw_skills = jd_data.get("skills", [])
    if isinstance(raw_skills, list):
        for item in raw_skills:
            if isinstance(item, dict):
                name = item.get("name") or item.get("skill_name") or ""
                tier = item.get("tier", "ess")
                if tier in ["ess", "core", "essential"]:
                    core_requirements.append(name)
                else:
                    nice_requirements.append(name)
            elif isinstance(item, str):
                core_requirements.append(item)

    core_requirements = list(dict.fromkeys([s for s in core_requirements if s.strip()]))
    nice_requirements = list(dict.fromkeys([s for s in nice_requirements if s.strip()]))

    if not core_requirements and nice_requirements:
        core_requirements = nice_requirements
        nice_requirements = []

    matched_skills: List[str] = []
    missing_skills: List[str] = []
    missing_by_category: Dict[str, List[str]] = {}

    core_matched_count = 0
    nice_matched_count = 0

    for skill in core_requirements:
        if check_skill_match(skill, evidence_pool, cand_skill_names):
            matched_skills.append(skill)
            core_matched_count += 1
        else:
            missing_skills.append(skill)
            cat = resolve_category(skill)
            missing_by_category.setdefault(cat, []).append(skill)

    for skill in nice_requirements:
        if check_skill_match(skill, evidence_pool, cand_skill_names):
            matched_skills.append(skill)
            nice_matched_count += 1
        else:
            missing_skills.append(skill)
            cat = resolve_category(skill)
            missing_by_category.setdefault(cat, []).append(skill)

    total_core = len(core_requirements)
    total_nice = len(nice_requirements)

    core_ratio = (core_matched_count / total_core) if total_core > 0 else 0.0
    nice_ratio = (nice_matched_count / total_nice) if total_nice > 0 else 0.0

    if total_nice == 0:
        final_score = core_ratio * 100.0
    else:
        final_score = (core_ratio * 80.0) + (nice_ratio * 20.0)

    jd_filename = (
        jd_data.get("source_file")
        or jd_data.get("summary", {}).get("title")
        or jd_data.get("role")
        or "Job Description"
    )

    return {
        "jd_source_file": jd_filename,
        "match_score": round(final_score, 1),
        "core_match_ratio": f"{core_matched_count}/{total_core}",
        "nice_match_ratio": f"{nice_matched_count}/{total_nice}" if total_nice > 0 else "N/A",
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "missing_by_category": missing_by_category,
    }
