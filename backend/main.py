import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import Role 5 Engine
from skill_matching import match_skills

# Import Role 2 Engine
from parse_resume import parse_resume

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = None
in_memory_profiles: Dict[str, dict] = {}

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[INFO] Connected to Supabase successfully.")
    except Exception as e:
        print(f"[WARN] Supabase init failed ({e}). Running in offline in-memory mode.")
else:
    print("[WARN] Missing SUPABASE_URL or SUPABASE_KEY. Running in offline in-memory mode.")

app = FastAPI(
    title="RADIX Talent Match API (Integrated Roles 2, 3 & 5)",
    description="Unified API for Resume Parsing (Role 2), Profile Builder (Role 3), and Skill Matching Engine (Role 5)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx", ".txt"}

# ----------------- Models ----------------- #

class ProfileCreate(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(default="")
    education: str = ""
    skills: List[Dict[str, Any]] = []
    projects: List[Any] = []
    hackathons: List[Any] = []
    internships: List[Any] = []
    certifications: List[Any] = []
    preferred_roles: List[str] = []
    cv_file: str = ""


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    education: Optional[str] = None
    skills: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Any]] = None
    hackathons: Optional[List[Any]] = None
    internships: Optional[List[Any]] = None
    certifications: Optional[List[Any]] = None
    preferred_roles: Optional[List[str]] = None
    cv_file: Optional[str] = None


class MatchRequest(BaseModel):
    jd_data: Dict[str, Any]
    profile_data: Optional[Dict[str, Any]] = None
    profile_id: Optional[str] = None

# ----------------- General Routes ----------------- #

@app.get("/")
def home():
    return {
        "message": "RADIX Talent Match Integrated API is running",
        "endpoints": {
            "health": "/health",
            "resume_parse": "POST /api/parse-resume",
            "profiles_create": "POST /profiles",
            "profiles_get": "GET /profiles/{id}",
            "match_evaluate": "POST /match"
        }
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "talent-match-integrated",
        "roles": [
            "Role 2 - Resume Parsing",
            "Role 3 - Profile Builder",
            "Role 5 - Skill Matching"
        ],
        "ai_available": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "storage": "supabase" if supabase else "in-memory-offline"
    }

# ----------------- Role 2 Route (Resume Parsing) ----------------- #

@app.post("/api/parse-resume")
async def parse_resume_endpoint(file: UploadFile = File(...), mode: str = Form("auto")):
    """
    Role 2 Endpoint:
    Upload a resume file (PDF, DOCX, or TXT).
    Extracts candidate basics (name, email, education), projects, hackathons,
    internships, certifications, and skills mapped to the 12 RADIX categories.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Please upload a PDF, DOCX or TXT resume.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        use_llm = None if mode == "auto" else (mode == "ai")
        result = parse_resume(tmp_path, use_llm=use_llm, save=False)
        result["source_file"] = file.filename

        # Clean placeholder text from certifications
        if "certifications" in result and isinstance(result["certifications"], list):
            result["certifications"] = [
                c for c in result["certifications"]
                if str(c).strip().lower() not in {"none listed", "none", "n/a", "nil", "none."}
            ]

        # Save copy to output/ for teammate records
        Path("output").mkdir(exist_ok=True)
        out_name = Path(file.filename).stem + ".json"
        with open(Path("output") / out_name, "w", encoding="utf-8") as out_f:
            import json
            json.dump(result, out_f, indent=2, ensure_ascii=False)

        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not parse resume: {e}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

# ----------------- Role 3 Routes (Profile Builder) ----------------- #

@app.post("/profiles", status_code=201)
def create_profile(profile: ProfileCreate):
    data = profile.model_dump()
    if supabase:
        try:
            result = supabase.table("candidate_profiles").insert(data).execute()
            return result.data[0]
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")
    else:
        new_id = str(uuid4())
        data["id"] = new_id
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        in_memory_profiles[new_id] = data
        return data


@app.get("/profiles/{profile_id}")
def get_profile(profile_id: str):
    if supabase:
        try:
            result = supabase.table("candidate_profiles").select("*").eq("id", profile_id).execute()
            if not result.data:
                raise HTTPException(status_code=404, detail="Candidate profile not found")
            return result.data[0]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))
    else:
        if profile_id not in in_memory_profiles:
            raise HTTPException(status_code=404, detail="Candidate profile not found in in-memory store")
        return in_memory_profiles[profile_id]


@app.put("/profiles/{profile_id}")
def update_profile(profile_id: str, profile: ProfileUpdate):
    updates = profile.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Provide at least one field to update")

    if supabase:
        try:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            result = supabase.table("candidate_profiles").update(updates).eq("id", profile_id).execute()
            if not result.data:
                raise HTTPException(status_code=404, detail="Candidate profile not found")
            return result.data[0]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))
    else:
        if profile_id not in in_memory_profiles:
            raise HTTPException(status_code=404, detail="Candidate profile not found in in-memory store")
        in_memory_profiles[profile_id].update(updates)
        in_memory_profiles[profile_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
        return in_memory_profiles[profile_id]

# ----------------- Role 5 Endpoint (Skill Matching) ----------------- #

@app.post("/match")
def match_candidate_to_jd(request: MatchRequest):
    """
    Role 5 Matching Endpoint:
    Receives JD data (from Role 1) and candidate profile data (from Role 3/2).
    Returns match score, matched skills, missing skills, and category breakdowns.
    """
    profile = request.profile_data

    if not profile and request.profile_id:
        profile = get_profile(request.profile_id)

    if not profile:
        raise HTTPException(
            status_code=400,
            detail="Must provide either profile_data object or a valid profile_id"
        )

    return match_skills(request.jd_data, profile)
