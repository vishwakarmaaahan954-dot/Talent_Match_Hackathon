"""
test_skill_matching.py — Pytest suite for Role 5 Skill Matching Engine
"""
import pytest
from skill_matching import match_skills, check_skill_match, resolve_category

# Mock Ananya Rao profile based directly on Ananya Rao.pdf
ANANYA_PROFILE = {
    "name": "Ananya Rao",
    "email": "ananya.rao@example.com",
    "education": "B.Tech, Computer Science and Engineering, Class of 2026 — CGPA 8.6 / 10",
    "skills": [
        {"skill_name": "C++", "category_code": "COD", "evidence": "Technical Skills", "confidence": "high"},
        {"skill_name": "Python", "category_code": "COD", "evidence": "Technical Skills", "confidence": "high"},
        {"skill_name": "Java", "category_code": "COD", "evidence": "Technical Skills", "confidence": "high"},
        {"skill_name": "Data Structures & Algorithms", "category_code": "DSA", "evidence": "Solved 350+ problems", "confidence": "high"},
        {"skill_name": "Operating Systems", "category_code": "OS", "evidence": "Coursework and project", "confidence": "high"},
        {"skill_name": "Computer Networks", "category_code": "NETW", "evidence": "Technical Skills", "confidence": "high"},
        {"skill_name": "Object-Oriented Design", "category_code": "OOD", "evidence": "Java design patterns", "confidence": "high"},
        {"skill_name": "Git", "category_code": "SWE", "evidence": "Technical Skills", "confidence": "high"},
        {"skill_name": "Linux", "category_code": "OS", "evidence": "Technical Skills", "confidence": "high"},
    ],
    "projects": [
        "Built a distributed URL-shortening service with a Redis-backed cache and a horizontally-scalable API layer",
        "Implemented a multithreaded job scheduler in C++ simulating OS-level process scheduling algorithms (Round Robin, Priority, SJF)",
        "Designed a parking-lot management system in Java using OOP design patterns (Factory, Strategy)"
    ],
    "hackathons": ["Finalist, national-level 24-hour hackathon — built a real-time chat backend"],
    "internships": ["Summer intern, backend team at a mid-size product startup — shipped a rate-limiter used in production"],
    "certifications": [],
    "preferred_roles": ["Software Engineer", "Backend Engineer"]
}

# Google SWE JD mock
GOOGLE_SWE_JD = {
    "source_file": "Google LLC - Software Engineer.pdf",
    "company": "Google LLC",
    "role": "Software Engineer (SWE)",
    "skills": [
        {"name": "Data Structures & Algorithms", "tier": "ess"},
        {"name": "C++", "tier": "ess"},
        {"name": "Operating Systems", "tier": "ess"},
        {"name": "Computer Networks", "tier": "ess"},
        {"name": "Object-Oriented Design", "tier": "ess"},
        {"name": "System Design", "tier": "ess"},
        {"name": "Testing Strategy", "tier": "ess"},
        {"name": "CI/CD Concepts", "tier": "ess"},
        {"name": "Distributed Systems", "tier": "pref"},
        {"name": "Large Codebase", "tier": "pref"},
        {"name": "Open-Source Contributions", "tier": "pref"}
    ]
}

# Google Data Scientist JD mock
GOOGLE_DS_JD = {
    "source_file": "Google LLC - Data Scientist.pdf",
    "company": "Google LLC",
    "role": "Data Scientist",
    "skills": [
        {"name": "SQL", "tier": "ess"},
        {"name": "A/B Testing", "tier": "ess"},
        {"name": "Machine Learning", "tier": "ess"},
        {"name": "Statistics", "tier": "ess"},
        {"name": "Communication Skills", "tier": "ess"}
    ]
}


def test_strict_token_boundary_safety():
    """Ensure 'Java' does not accidentally match 'JavaScript'."""
    pool = "experienced with javascript and nodejs development"
    assert check_skill_match("Java", pool, ["JavaScript"]) is False
    assert check_skill_match("JavaScript", pool, ["JavaScript"]) is True


def test_ananya_swe_match():
    """Ananya should have a high score for Google SWE and list missing CI/CD."""
    res = match_skills(GOOGLE_SWE_JD, ANANYA_PROFILE)
    assert res["match_score"] > 55.0
    assert "C++" in res["matched_skills"]
    assert "Data Structures & Algorithms" in res["matched_skills"]
    assert "System Design" in res["matched_skills"]
    assert "CI/CD Concepts" in res["missing_skills"]
    assert "SWE" in res["missing_by_category"]


def test_ananya_data_scientist_match():
    """Ananya has no data science or SQL skills, score should be low."""
    res = match_skills(GOOGLE_DS_JD, ANANYA_PROFILE)
    assert res["match_score"] < 40.0
    assert "SQL" in res["missing_skills"]
    assert "SQL" in res["missing_by_category"]


def test_category_resolution():
    """Verify standard mapping to 12 RADIX categories."""
    assert resolve_category("C++") == "COD"
    assert resolve_category("Algorithms") == "DSA"
    assert resolve_category("Kubernetes") == "CLOUD"
    assert resolve_category("PostgreSQL") == "SQL"
    assert resolve_category("Process Scheduling") == "OS"
