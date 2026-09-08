"""
BM25Okapi Lexical Search Engine with Acronym & Synonym Expansion
Provides precise keyword matching while handling industry abbreviations.
"""

import math
import re
from typing import List, Dict, Set
import numpy as np

# Real-time technical synonym and acronym dictionary
TAXONOMY_MAP = {
    "k8s": ["kubernetes", "container orchestration"],
    "kubernetes": ["k8s"],
    "vllm": ["local llm", "llm inference", "pagedattention"],
    "litert": ["tflite", "tensorflow lite", "on-device ai"],
    "aws": ["amazon web services", "cloud"],
    "gcp": ["google cloud platform", "google cloud"],
    "rag": ["retrieval augmented generation", "vector search"],
    "onnx": ["open neural network exchange", "model quantization"],
    "gguf": ["quantization", "llama.cpp", "local llm"],
    "ci/cd": ["continuous integration", "github actions"],
    "fastapi": ["rest api", "python backend", "microservices"],
    "docker": ["containers", "containerization"]
}

def tokenize(text: str, expand_synonyms: bool = True) -> List[str]:
    """Tokenizes text into lowercase words, optionally expanding acronyms."""
    tokens = re.findall(r"\b[a-zA-Z0-9_\-\+\#\.]+\b", text.lower())
    if not expand_synonyms:
        return tokens

    expanded = list(tokens)
    for t in tokens:
        if t in TAXONOMY_MAP:
            for syn in TAXONOMY_MAP[t]:
                expanded.extend(syn.split())
    return expanded

class BM25Okapi:
    def __init__(self, corpus: List[str], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = len(corpus)
        self.tokenized_corpus = [tokenize(doc) for doc in corpus]
        self.doc_lens = [len(doc) for doc in self.tokenized_corpus]
        self.avg_doc_len = sum(self.doc_lens) / max(1, self.corpus_size)

        # Document frequencies
        self.df: Dict[str, int] = {}
        for doc in self.tokenized_corpus:
            for term in set(doc):
                self.df[term] = self.df.get(term, 0) + 1

        # Inverse document frequencies (IDF)
        self.idf: Dict[str, float] = {}
        for term, freq in self.df.items():
            # Standard Lucene/BM25 IDF formula
            self.idf[term] = math.log((self.corpus_size - freq + 0.5) / (freq + 0.5) + 1.0)

    def get_scores(self, query: str) -> np.ndarray:
        query_tokens = tokenize(query, expand_synonyms=True)
        scores = np.zeros(self.corpus_size)

        for q in query_tokens:
            if q not in self.idf:
                continue
            q_idf = self.idf[q]

            for i, doc in enumerate(self.tokenized_corpus):
                term_count = doc.count(q)
                if term_count == 0:
                    continue
                doc_len = self.doc_lens[i]
                numerator = term_count * (self.k1 + 1)
                denominator = term_count + self.k1 * (1 - self.b + self.b * (doc_len / max(1, self.avg_doc_len)))
                scores[i] += q_idf * (numerator / denominator)

        # Normalize to 0-100 range
        max_score = np.max(scores) if np.max(scores) > 0 else 1.0
        normalized = (scores / max_score) * 100.0
        return normalized
