"""
run_demo.py — 1-Click Verification Demo for Role 5 (Skill Matching)
==================================================================
Runs Ananya Rao's candidate profile against all 6 Job Descriptions
(Google, Microsoft, Oracle) and prints the match score, matched skills,
and missing gaps grouped by the 12 RADIX categories.

Run with:
    python run_demo.py
"""

import json
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from skill_matching import match_skills

def main():
    data_dir = os.path.join(os.path.dirname(__file__), "sample_data")
    profile_path = os.path.join(data_dir, "ananya_rao_profile.json")

    with open(profile_path, "r", encoding="utf-8") as f:
        profile = json.load(f)

    print("=" * 70)
    print(f"  RADIX TALENT MATCH — ROLE 5 SKILL MATCHING DEMO")
    print(f"  Candidate: {profile['name']} ({profile['preferred_roles'][0]})")
    print("=" * 70)

    jd_files = [
        "google_swe.json",
        "microsoft_swe.json",
        "oracle_ase.json",
        "google_ds.json",
        "microsoft_da.json",
        "oracle_support.json"
    ]

    for jdf in jd_files:
        with open(os.path.join(data_dir, jdf), "r", encoding="utf-8") as f:
            jd = json.load(f)

        res = match_skills(jd, profile)

        score = res["match_score"]
        status = "HIGH FIT" if score >= 60 else ("MODERATE FIT" if score >= 40 else "WEAK FIT")

        print(f"\n[{status}] {res['jd_source_file']} — {jd['company']}")
        print(f"   Match Score: {score}% (Core: {res['core_match_ratio']} | Nice-to-Have: {res['nice_match_ratio']})")
        print(f"   Matched Skills ({len(res['matched_skills'])}): {', '.join(res['matched_skills'])}")
        
        if res["missing_skills"]:
            print(f"   Missing Skills ({len(res['missing_skills'])}):")
            for cat, skills in res["missing_by_category"].items():
                print(f"     • [{cat}]: {', '.join(skills)}")
        else:
            print("   Missing Skills: None (100% Match!)")

    print("\n" + "=" * 70)
    print("DEMO COMPLETE: Notice how Ananya Rao scores strongly on SWE roles")
    print("and has transparent gaps on Data Scientist / Support roles!")
    print("=" * 70)

if __name__ == "__main__":
    main()
