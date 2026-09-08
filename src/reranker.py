"""
Stage 2 Precision Reranker & Decision Engine
Evaluates STAR impact metrics, verifies hard prerequisites, and assigns candidate tiers.
"""

import re
from typing import Dict, Any, List, Tuple

# STAR metric pattern: looks for measurable impact (% improvement, $ saved, latency reduction, user count)
# STAR metric pattern: looks for measurable impact (% improvement, $ saved, latency reduction, user count)
STAR_METRIC_REGEX = re.compile(
    r"(\b\d+(?:\.\d+)?%|\b\d+x\b|\$\s*\d+[\d,]*(?:\.\d+)?(?:k|m|b)?\b|\b\d+\s*ms\b|\b\d+[\d,]*\s*(?:users|qps|requests|downloads|stars)\b)",
    re.IGNORECASE
)

class Stage2Reranker:
    def __init__(self, target_jd: Dict[str, Any]):
        self.target_jd = target_jd
        self.min_exp = target_jd.get("min_experience_years", 3.0)
        self.required_degree = target_jd.get("required_degree", "Bachelor's")
        self.must_have_skills = [s.lower() for s in target_jd.get("must_have_skills", [])]

    def evaluate_candidate(
        self,
        candidate_meta: Dict[str, Any],
        bm25_score: float,
        semantic_score: float
    ) -> Dict[str, Any]:
        """
        Evaluates a candidate across depth, hard filters, and STAR impact metrics.
        """
        text = candidate_meta["clean_text"]
        exp_years = candidate_meta.get("experience_years", 0.0)
        education = candidate_meta.get("education", "None Detected")

        # 1. STAR Impact Metric Ratio
        # Normalize wrapped lines in paragraphs before splitting
        normalized_text = re.sub(r"(?<!\n)\n(?!\n|•|\-|\d+\.|\x7f)", " ", text)
        sentences = [s.strip() for s in re.split(r"[\n•\-\x7f]+", normalized_text) if len(s.strip()) > 10]
        metric_hits = 0
        extracted_metrics = []
        for s in sentences:
            found = STAR_METRIC_REGEX.findall(s)
            if found:
                metric_hits += 1
                extracted_metrics.extend(found)

        impact_ratio = min(1.0, metric_hits / max(1, min(len(sentences), 15)))
        star_score = round(impact_ratio * 100.0, 1)

        # 2. Experience Depth Score
        if exp_years >= self.min_exp:
            exp_score = min(100.0, 80.0 + (exp_years - self.min_exp) * 5.0)
        else:
            exp_score = max(20.0, (exp_years / max(1.0, self.min_exp)) * 80.0)

        # 3. Hard-Filter Checks
        failed_hard_filters = []
        if exp_years < (self.min_exp * 0.7):
            failed_hard_filters.append(f"Tenure Gap ({exp_years:.1f} yrs vs {self.min_exp} yrs required)")

        degree_hierarchy = {"None Detected": 0, "Bachelor's": 1, "Master's": 2, "PhD": 3}
        cand_deg_val = degree_hierarchy.get(education, 0)
        req_deg_val = degree_hierarchy.get(self.required_degree, 1)
        if cand_deg_val < req_deg_val:
            failed_hard_filters.append(f"Missing Required Degree ({education} vs {self.required_degree})")

        # Check must-have skills
        text_lower = text.lower()
        missing_must_haves = [s for s in self.must_have_skills if s not in text_lower]
        if missing_must_haves:
            failed_hard_filters.append(f"Missing Core Tech: {', '.join(missing_must_haves)}")

        # 4. Composite Competency Score
        competency_score = round(
            (0.35 * bm25_score) + (0.35 * semantic_score) + (0.20 * exp_score) + (0.10 * star_score),
            1
        )

        # 5. Tier Assignment Logic
        # If candidate fails a hard filter, DO NOT auto-reject if competency is high!
        # Route to Review Tier for human consideration.
        if failed_hard_filters:
            if competency_score >= 65.0:
                tier = "FLAGGED_REVIEW"
                tier_label = "[REVIEW] Prerequisite Gap but High Competency"
            else:
                tier = "REJECT"
                tier_label = "[REJECT] Missing Core Criteria"
        else:
            if competency_score >= 82.0:
                tier = "TOP_TIER"
                tier_label = "[TOP TIER] Strong Contender Shortlist"
            elif competency_score >= 65.0:
                tier = "STRONG_FIT"
                tier_label = "[SOLID MATCH] Interview Queue"
            else:
                tier = "REJECT"
                tier_label = "[REJECT] Low Match"

        # Check for Security/Adversarial Flags
        if candidate_meta.get("threat_level") == "CRITICAL_ATTACK":
            tier = "SECURITY_FLAG"
            tier_label = "[BLOCKED] Prompt Injection Detected"

        return {
            "file_name": candidate_meta["file_name"],
            "composite_score": competency_score,
            "bm25_score": round(bm25_score, 1),
            "semantic_score": round(semantic_score, 1),
            "experience_score": round(exp_score, 1),
            "star_impact_score": star_score,
            "experience_years": exp_years,
            "education": education,
            "density_chars_per_page": candidate_meta.get("density_chars_per_page", 0),
            "ocr_required": candidate_meta.get("ocr_fallback_triggered", False),
            "threat_level": candidate_meta.get("threat_level", "CLEAN"),
            "threats": candidate_meta.get("threats_detected", []),
            "failed_hard_filters": failed_hard_filters,
            "tier": tier,
            "tier_label": tier_label,
            "quantified_metrics_found": list(set(extracted_metrics))[:5]
        }
