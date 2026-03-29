"""
Career Orientation — Synthetic Data Generation
================================================
Uses Gemini 2.5 Flash to generate student profiles for career classification.

Usage:
    python generate_data.py --test     # Generate 1 sample, save to data/test.json (dry run)
    python generate_data.py            # Generate all 1200 profiles to data/raw_profiles.json
"""

import os
import sys
import json
import time
import re
import argparse
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

RAW_DATA_PATH = DATA_DIR / "raw_profiles.json"
TEST_DATA_PATH = DATA_DIR / "test.json"

# ── Constants ─────────────────────────────────────────────────────────────────
CATEGORIES = [
    "Software Engineering",
    "Data Science",
    "AI/ML",
    "Web Development",
    "Business Analytics",
    "UX/UI Design",
]
PROFILES_PER_CLASS = 200
BATCH_SIZE_FULL = 15

# ── Required fields for validation ────────────────────────────────────────────
REQUIRED_FIELDS = {"skills", "interests", "academic_performance", "projects", "goals", "label"}
REQUIRED_ACADEMIC = {"math", "sciences", "languages", "arts"}
REQUIRED_GOALS = {"salary_expectation", "remote_preference", "target_field"}


def load_api_key() -> str:
    """Load Gemini API key from .env file."""
    env_path = SCRIPT_DIR / ".env"
    load_dotenv(dotenv_path=env_path)
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        print("ERROR: GEMINI_API_KEY not found.")
        print(f"Create {env_path} with: GEMINI_API_KEY=your_key_here")
        sys.exit(1)
    return key


def strip_markdown(text: str) -> str:
    """Remove ```json ... ``` fences that Gemini sometimes adds."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def validate_profile(profile: dict, category: str) -> list[str]:
    """
    Validate a single profile dict. Returns a list of error messages (empty = valid).
    """
    errors = []

    missing = REQUIRED_FIELDS - set(profile.keys())
    if missing:
        errors.append(f"Missing fields: {missing}")
        return errors  # can't validate further

    if not isinstance(profile["skills"], list) or len(profile["skills"]) == 0:
        errors.append("'skills' must be a non-empty list")

    if not isinstance(profile["interests"], list) or len(profile["interests"]) == 0:
        errors.append("'interests' must be a non-empty list")

    if not isinstance(profile["projects"], list) or len(profile["projects"]) == 0:
        errors.append("'projects' must be a non-empty list")

    acad = profile.get("academic_performance", {})
    if not isinstance(acad, dict):
        errors.append("'academic_performance' must be a dict")
    else:
        missing_acad = REQUIRED_ACADEMIC - set(acad.keys())
        if missing_acad:
            errors.append(f"Missing academic fields: {missing_acad}")
        for subj in REQUIRED_ACADEMIC & set(acad.keys()):
            score = acad[subj]
            if not isinstance(score, (int, float)) or score < 0 or score > 20:
                errors.append(f"academic_performance.{subj} = {score} — must be 0-20")

    goals = profile.get("goals", {})
    if not isinstance(goals, dict):
        errors.append("'goals' must be a dict")
    else:
        missing_goals = REQUIRED_GOALS - set(goals.keys())
        if missing_goals:
            errors.append(f"Missing goals fields: {missing_goals}")

    return errors


def generate_batch(
    model: genai.GenerativeModel, category: str, batch_num: int, count: int = 15
) -> list[dict]:
    """
    Call Gemini to generate `count` synthetic student profiles for `category`.
    Returns a list of validated profile dicts.
    Raises on API or parse errors so the caller can handle retries.
    """
    prompt = f"""
You are generating a DIVERSE synthetic dataset for a career orientation classifier.

Task: Generate exactly {count} student profiles oriented toward the career: **{category}**.
This is batch {batch_num} — profiles MUST be noticeably different from previous batches.

Diversity requirements:
- Vary skill level: beginner / intermediate / advanced
- Vary background: self-taught / university / bootcamp / vocational
- Vary age: between 18 and 28
- Vary geographic region: Europe, Africa, Southeast Asia, Latin America, North America, Middle East
- Vary academic strengths and weaknesses realistically

Return a JSON array of {count} objects. Each object must have EXACTLY these fields:
{{
  "skills": ["skill1", ...],
  "interests": ["interest1", ...],
  "academic_performance": {{
    "math": 0-20,
    "sciences": 0-20,
    "languages": 0-20,
    "arts": 0-20
  }},
  "projects": ["desc1", ...],
  "goals": {{
    "salary_expectation": "<value>",
    "remote_preference": "<value>",
    "target_field": "<value>"
  }},
  "label": "{category}"
}}

Return ONLY the raw JSON array. No markdown fences, no explanation.
"""
    response = model.generate_content(prompt)
    raw = strip_markdown(response.text)
    profiles = json.loads(raw)

    if not isinstance(profiles, list):
        raise ValueError(f"Expected a JSON array, got {type(profiles).__name__}")

    if len(profiles) != count:
        raise ValueError(f"Expected {count} profiles, got {len(profiles)}")

    # Validate each profile and force the correct label
    for i, p in enumerate(profiles):
        p["label"] = category
        errs = validate_profile(p, category)
        if errs:
            raise ValueError(f"Profile {i} invalid: {'; '.join(errs)}")

    return profiles


def run_test(model: genai.GenerativeModel) -> bool:
    """
    Generate a single profile for one category, validate it, save to test.json.
    Returns True if the test passed.
    """
    category = CATEGORIES[0]
    print(f"[TEST] Generating 1 profile for '{category}'...")

    try:
        profiles = generate_batch(model, category, batch_num=1, count=1)
    except json.JSONDecodeError as e:
        print(f"[TEST] FAILED — Gemini returned invalid JSON: {e}")
        return False
    except ValueError as e:
        print(f"[TEST] FAILED — Validation error: {e}")
        return False
    except Exception as e:
        print(f"[TEST] FAILED — API error: {type(e).__name__}: {e}")
        return False

    profile = profiles[0]
    with open(TEST_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)

    print(f"[TEST] PASSED — profile saved to {TEST_DATA_PATH}")
    print(json.dumps(profile, indent=2, ensure_ascii=False))
    return True


def run_full_generation(model: genai.GenerativeModel) -> None:
    """
    Generate all 1200 profiles with:
    - Per-batch retries (max 3 attempts)
    - Partial progress saved after each category
    - Skips if raw_profiles.json already exists
    """
    if RAW_DATA_PATH.exists():
        print(f"raw_profiles.json already exists ({RAW_DATA_PATH}).")
        print("Delete it manually to re-generate.")
        return

    # ── Pre-flight test ───────────────────────────────────────────────────
    print("=" * 50)
    print("  PRE-FLIGHT CHECK: generating 1 test profile")
    print("=" * 50)
    if not run_test(model):
        print("\nPre-flight test FAILED. Aborting full generation to avoid wasted API calls.")
        sys.exit(1)
    print("\nPre-flight test passed. Starting full generation...\n")

    all_profiles: list[dict] = []
    partial_path = DATA_DIR / "raw_profiles_partial.json"
    max_retries = 3

    for cat_idx, category in enumerate(CATEGORIES):
        print(f"\n[{cat_idx + 1}/{len(CATEGORIES)}] Generating profiles for: {category}")
        # 13 batches of 15 + 1 batch of 5 = 200
        batches = [(i + 1, BATCH_SIZE_FULL) for i in range(13)] + [(14, 5)]
        cat_profiles: list[dict] = []

        for batch_num, count in batches:
            success = False
            for attempt in range(1, max_retries + 1):
                try:
                    batch = generate_batch(model, category, batch_num, count)
                    cat_profiles.extend(batch)
                    print(
                        f"  batch {batch_num:02d}/14 — {len(batch)} profiles "
                        f"(category total: {len(cat_profiles)})"
                    )
                    success = True
                    break
                except json.JSONDecodeError as e:
                    print(f"  batch {batch_num:02d} attempt {attempt}/{max_retries} — bad JSON: {e}")
                except ValueError as e:
                    print(f"  batch {batch_num:02d} attempt {attempt}/{max_retries} — validation: {e}")
                except Exception as e:
                    print(
                        f"  batch {batch_num:02d} attempt {attempt}/{max_retries} — "
                        f"{type(e).__name__}: {e}"
                    )

                if attempt < max_retries:
                    time.sleep(2)

            if not success:
                print(
                    f"  WARNING: batch {batch_num} failed after {max_retries} attempts — skipping"
                )

            time.sleep(1)  # rate-limit between batches

        all_profiles.extend(cat_profiles)
        print(f"  => {category}: {len(cat_profiles)} profiles generated")

        # Save partial progress after every category
        with open(partial_path, "w", encoding="utf-8") as f:
            json.dump(all_profiles, f, ensure_ascii=False, indent=2)
        print(f"  => Partial progress saved ({len(all_profiles)} total so far)")

    # ── Save final result ─────────────────────────────────────────────────
    with open(RAW_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(all_profiles, f, ensure_ascii=False, indent=2)

    # Clean up partial file
    if partial_path.exists():
        partial_path.unlink()

    expected = PROFILES_PER_CLASS * len(CATEGORIES)
    actual = len(all_profiles)
    print(f"\nDone! Saved {actual} profiles to {RAW_DATA_PATH}")
    if actual < expected:
        print(f"WARNING: Expected {expected} but got {actual} — some batches may have failed.")


def main():
    parser = argparse.ArgumentParser(description="Generate career orientation training data")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Generate 1 sample profile and save to data/test.json (no full generation)",
    )
    args = parser.parse_args()

    api_key = load_api_key()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    if args.test:
        success = run_test(model)
        sys.exit(0 if success else 1)
    else:
        run_full_generation(model)


if __name__ == "__main__":
    main()
