"""
Unit tests for ApexATS FastAPI Endpoints and Candidate Classification.
Verifies custom profile management, non-defamatory candidate badging,
calibration endpoint transparency, and counterfactual sensitivity data.
"""

import unittest
import os
import json
from app import app, JD_PRESETS, active_jd, save_custom_preset, delete_preset, get_current_jd, screen_sample_batch, get_calibration_metrics, get_counterfactual_audit
from src.pipeline import ApexPipeline

class TestApexAPI(unittest.TestCase):
    def test_get_current_jd(self):
        res = get_current_jd()
        self.assertIn("active_jd", res)
        self.assertIn("presets", res)
        self.assertIn("data_entry_specialist", res["presets"])
        self.assertIn("it_support_engineer", res["presets"])

    def test_custom_preset_lifecycle(self):
        # Create custom preset model
        from app import CustomPresetModel
        custom_data = CustomPresetModel(
            key="test_qa_engineer",
            title="Senior QA Automation Engineer",
            category="Engineering",
            icon="🧪",
            description="Testing automated test suites with Cypress, Pytest, and Playwright",
            min_experience_years=3.0,
            required_degree="Bachelor's",
            must_have_skills=["python", "pytest", "selenium", "cypress"],
            preferred_skills=["playwright", "docker", "ci/cd", "jira"]
        )
        # Save custom preset
        save_res = save_custom_preset(custom_data)
        self.assertEqual(save_res["status"], "success")
        self.assertEqual(save_res["key"], "test_qa_engineer")
        self.assertIn("test_qa_engineer", JD_PRESETS)

        # Verify persistence file created
        from app import JD_DIR
        test_file = os.path.join(JD_DIR, "test_qa_engineer.json")
        self.assertTrue(os.path.exists(test_file))

        # Clean up via delete
        del_res = delete_preset("test_qa_engineer")
        self.assertEqual(del_res["status"], "success")
        self.assertNotIn("test_qa_engineer", JD_PRESETS)
        self.assertFalse(os.path.exists(test_file))

    def test_candidate_screening_and_threat_isolation(self):
        # Screen sample candidates
        batch_results = screen_sample_batch()
        self.assertIn("ranked_candidates", batch_results)
        candidates = batch_results["ranked_candidates"]
        self.assertGreaterEqual(len(candidates), 6)

        # Check candidate threat level separation
        # Normal low-scoring candidates must NEVER be labeled as security threats
        low_scorers = [c for c in candidates if c["composite_score"] < 50.0]
        self.assertTrue(len(low_scorers) > 0, "Expected at least one low-scoring candidate in test cohort")

        # Check that prompt injection candidates are flagged as threat, while normal candidates are CLEAN
        clean_candidates = [c for c in candidates if c["threat_level"] == "CLEAN"]
        self.assertTrue(len(clean_candidates) >= 5, "Legitimate candidates should have threat_level CLEAN")

        threat_candidates = [c for c in candidates if c["threat_level"] != "CLEAN"]
        for t in threat_candidates:
            self.assertIn(t["threat_level"], ["SUSPICIOUS", "CRITICAL_ATTACK"])
            self.assertTrue(
                "stuffer" in t["file_name"].lower() or "injection" in t["file_name"].lower(),
                f"Candidate {t['file_name']} was flagged as threat but isn't an attack test"
            )

        # Explicitly verify the low-scoring candidates are NOT flagged as security threats
        junior_cand = [c for c in candidates if "david_kim" in c["file_name"].lower()]
        if junior_cand:
            self.assertEqual(junior_cand[0]["threat_level"], "CLEAN")
            self.assertLess(junior_cand[0]["composite_score"], 50.0)

    def test_calibration_and_counterfactual_disclosures(self):
        cal = get_calibration_metrics()
        self.assertIn("empirically_derived_thresholds", cal)
        self.assertIn("held_out_validation_results", cal)
        self.assertIn("interview_precision", cal["held_out_validation_results"])

        cf = get_counterfactual_audit()
        self.assertIn("perturbations", cf)
        self.assertIn("measured_epsilon", cf)
        self.assertEqual(len(cf["perturbations"]), 6)

if __name__ == "__main__":
    unittest.main()
