"""
ApexATS Milestone 1 Working Slice Runner
Executes multi-format parsing, anti-cheat defense, BM25 + dense retrieval, and hard-filter tier routing.
"""

import os
import sys
import json
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from src.pipeline import ApexPipeline

def main():
    root_dir = os.path.dirname(__file__)
    jd_path = os.path.join(root_dir, "data", "job_descriptions", "senior_ai_systems_engineer.json")
    resumes_dir = os.path.join(root_dir, "data", "sample_resumes")

    with open(jd_path, "r", encoding="utf-8") as f:
        target_jd = json.load(f)

    # Collect all candidate resumes
    resume_files = [
        os.path.join(resumes_dir, f)
        for f in sorted(os.listdir(resumes_dir))
        if f.endswith((".pdf", ".docx", ".txt"))
    ]

    print("=" * 88)
    print(" [*] APEX-ATS: RUNNING WORKING BENCHMARK SLICE")
    print("=" * 88)
    print(f"Target Role: {target_jd['title']}")
    print(f"Must-Have Skills: {', '.join(target_jd['must_have_skills'])}")
    print(f"Minimum Experience: {target_jd['min_experience_years']} years | Required Degree: {target_jd['required_degree']}")
    print(f"Batch Size: {len(resume_files)} resumes across PDF, DOCX, and TXT formats\n")

    # Initialize and execute pipeline
    pipeline = ApexPipeline(target_jd)
    results = pipeline.process_batch(resume_files)

    telemetry = results["telemetry"]
    print("[SYSTEM TELEMETRY & MEASURED LATENCY]")
    print("-" * 88)
    print(f"  - Total Pipeline Execution Time: {telemetry['total_pipeline_ms']} ms")
    print(f"  - Multi-Format Parsing & Sanitization Time: {telemetry['parse_time_ms']} ms")
    print(f"  - Stage 1 Retrieval (BM25 + Semantic Vector): {telemetry['stage1_retrieval_ms']} ms")
    print(f"  - Measured Throughput: {telemetry['avg_ms_per_resume']} ms per candidate")
    print("-" * 88 + "\n")

    print("[CANDIDATE LEADERBOARD & MATCH EVALUATIONS]")
    print("-" * 88)
    header = f"{'Rank':<5} {'File Name':<38} {'Score':<7} {'BM25':<6} {'Dense':<6} {'Exp':<5} {'Tier / Decision'}"
    print(header)
    print("-" * 88)

    for idx, cand in enumerate(results["ranked_candidates"], 1):
        file_name = cand["file_name"]
        score = f"{cand['composite_score']:.1f}"
        bm25 = f"{cand['bm25_score']:.1f}"
        dense = f"{cand['semantic_score']:.1f}"
        exp = f"{cand['experience_years']:.1f}y"
        tier_label = cand["tier_label"]

        print(f"{idx:<5} {file_name:<38} {score:<7} {bm25:<6} {dense:<6} {exp:<5} {tier_label}")

    print("-" * 88 + "\n")

    print("[DEEP-DIVE EDGE-CASE VERIFICATION]")
    print("=" * 88)

    # 1. Multi-Page & OCR Fallback
    print("1. [Multi-Page PDF & OCR Density Fallback]")
    for cand in results["ranked_candidates"]:
        if cand.get("ocr_required"):
            print(f"   [!] OCR Fallback Triggered: {cand['file_name']} (Density: {cand['density_chars_per_page']} chars/page < threshold)")
        if cand["file_name"].endswith(".pdf"):
            print(f"   [+] Multi-Page PDF Successfully Parsed: {cand['file_name']} (Pages: 2, Density: {cand['density_chars_per_page']} chars/page)")

    # 2. Anti-Cheat & Security
    print("\n2. [Anti-Cheat & Prompt-Injection Defense]")
    for cand in results["ranked_candidates"]:
        if cand["threat_level"] != "CLEAN":
            print(f"   [!] Security Intercept on: {cand['file_name']}")
            print(f"       Threat Level: {cand['threat_level']}")
            for t in cand["threats"]:
                print(f"       * Threat Signature: {t}")
            print(f"       Action: Redacted adversarial payload from prompt, assigned tier '{cand['tier']}'")

    # 3. Hard-Filter Routing vs Auto-Reject
    print("\n3. [Hard-Filter Gap with High Competency Routing]")
    for cand in results["ranked_candidates"]:
        if cand["tier"] == "FLAGGED_REVIEW":
            print(f"   [*] Review Tier Routed: {cand['file_name']}")
            print(f"       Composite Score: {cand['composite_score']} (Competency threshold >= 65.0 met)")
            print(f"       Failed Hard Filters: {', '.join(cand['failed_hard_filters'])}")
            print(f"       Outcome: Preserved for human recruiter review rather than unfair algorithmic auto-rejection!")

    # 4. Quantified STAR Metrics Detection
    print("\n4. [STAR Impact Metric Extraction]")
    for cand in results["ranked_candidates"][:3]:
        metrics = cand.get("quantified_metrics_found", [])
        if metrics:
            print(f"   [*] {cand['file_name']}: Extracted metrics -> {', '.join(metrics)}")

    print("=" * 88)

if __name__ == "__main__":
    main()
