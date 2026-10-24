const API_BASE = "http://127.0.0.1:8000";

// Role 2: Upload and Parse Resume
export async function uploadAndParseResume(file, mode = "auto") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  const response = await fetch(`${API_BASE}/api/parse-resume`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to parse resume file");
  }

  return response.json();
}

// Role 5: Match Candidate Profile against JD
export async function matchCandidateToJD(jdData, profileData, profileId = null) {
  const payload = {
    jd_data: jdData,
    profile_data: profileData,
    profile_id: profileId,
  };

  const response = await fetch(`${API_BASE}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to calculate skill match");
  }

  return response.json();
}

// Role 3: Save Candidate Profile
export async function saveProfile(profile) {
  const response = await fetch(`${API_BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error("Failed to save profile to backend");
  return response.json();
}

// Role 3: Load Candidate Profile by ID
export async function fetchProfile(profileId) {
  const response = await fetch(`${API_BASE}/profiles/${profileId}`);
  if (!response.ok) throw new Error("Failed to load profile");
  return response.json();
}
