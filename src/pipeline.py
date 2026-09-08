"""
ApexATS Core Pipeline Orchestrator
Executes the adaptive cascade retrieval and scoring funnel over batches of resumes.
"""

import time
from typing import List, Dict, Any
from .parser import ResumeParser
from .bm25 import BM25Okapi
from .semantic import SemanticVectorMatcher
from .reranker import Stage2Reranker

class ApexPipeline:
    def __init__(self, target_jd: Dict[str, Any]):
        self.target_jd = target_jd
        self.parser = ResumeParser()
        self.reranker = Stage2Reranker(target_jd)

    def process_batch(self, file_paths: List[str]) -> Dict[str, Any]:
        start_time = time.perf_counter()
        n = len(file_paths)
        if n == 0:
            return {"candidates": [], "total_time_ms": 0, "batch_size": 0}

        # 1. Parsing & Anti-Cheat Extraction Layer
        parse_start = time.perf_counter()
        parsed_records = []
        for p in file_paths:
            rec = self.parser.parse(p)
            parsed_records.append(rec)
        parse_elapsed_ms = (time.perf_counter() - parse_start) * 1000

        # Build corpus of clean texts
        corpus = [r["clean_text"] for r in parsed_records]
        jd_text = (
            f"{self.target_jd.get('title', '')} {self.target_jd.get('description', '')} "
            f"{' '.join(self.target_jd.get('must_have_skills', []))} "
            f"{' '.join(self.target_jd.get('preferred_skills', []))}"
        )

        # 2. Stage 1: Fast BM25 + Dense Semantic Scoring (All N candidates)
        s1_start = time.perf_counter()
        bm25 = BM25Okapi(corpus)
        bm25_scores = bm25.get_scores(jd_text)

        semantic_matcher = SemanticVectorMatcher(corpus)
        semantic_scores = semantic_matcher.score_query(jd_text)
        s1_elapsed_ms = (time.perf_counter() - s1_start) * 1000

        # Initial combined score for funnel filtering
        initial_scores = [(0.5 * bm25_scores[i] + 0.5 * semantic_scores[i]) for i in range(n)]

        # Adaptive Cascade: determine K
        k = min(n, max(5, int(n * 0.5)))  # For test slice, evaluate top K
        sorted_indices = sorted(range(n), key=lambda idx: initial_scores[idx], reverse=True)

        # 3. Stage 2: Precision Reranking & Decisioning
        s2_start = time.perf_counter()
        final_evaluations = []
        for rank_idx, idx in enumerate(sorted_indices):
            evaluated = self.reranker.evaluate_candidate(
                candidate_meta=parsed_records[idx],
                bm25_score=float(bm25_scores[idx]),
                semantic_score=float(semantic_scores[idx])
            )
            evaluated["stage1_rank"] = rank_idx + 1
            final_evaluations.append(evaluated)

        # Sort by final composite score
        final_evaluations.sort(key=lambda c: (c["tier"] != "SECURITY_FLAG", c["composite_score"]), reverse=True)

        total_elapsed_ms = (time.perf_counter() - start_time) * 1000

        return {
            "job_title": self.target_jd.get("title"),
            "batch_size": n,
            "funnel": {
                "stage1_evaluated": n,
                "stage2_evaluated": len(final_evaluations),
            },
            "telemetry": {
                "parse_time_ms": round(parse_elapsed_ms, 2),
                "stage1_retrieval_ms": round(s1_elapsed_ms, 2),
                "total_pipeline_ms": round(total_elapsed_ms, 2),
                "avg_ms_per_resume": round(total_elapsed_ms / max(1, n), 2)
            },
            "ranked_candidates": final_evaluations
        }
