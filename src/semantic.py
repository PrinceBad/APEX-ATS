"""
Dense Semantic Vector Matcher
Computes cosine similarity between Job Descriptions and Candidate profiles using
sub-linear n-gram feature vectors for high-recall conceptual alignment.
"""

import math
import re
from typing import List, Dict
import numpy as np

class SemanticVectorMatcher:
    def __init__(self, corpus: List[str]):
        self.corpus = corpus
        self.vocab = self._build_vocab(corpus)
        self.doc_vectors = [self._vectorize(doc) for doc in corpus]

    def _build_vocab(self, corpus: List[str]) -> Dict[str, int]:
        vocab = {}
        for doc in corpus:
            tokens = self._extract_ngrams(doc)
            for t in tokens:
                if t not in vocab:
                    vocab[t] = len(vocab)
        return vocab

    def _extract_ngrams(self, text: str) -> List[str]:
        words = re.findall(r"\b[a-zA-Z0-9_\-\+\#\.]+\b", text.lower())
        unigrams = [w for w in words if len(w) > 2]
        # Bigrams for compound technical terms like "distributed systems", "edge ai"
        bigrams = [f"{words[i]}_{words[i+1]}" for i in range(len(words)-1)]
        return unigrams + bigrams

    def _vectorize(self, text: str) -> np.ndarray:
        vec = np.zeros(len(self.vocab), dtype=np.float32)
        tokens = self._extract_ngrams(text)
        for t in tokens:
            if t in self.vocab:
                vec[self.vocab[t]] += 1.0

        # Sub-linear term frequency scaling: 1 + log(tf)
        non_zero = vec > 0
        vec[non_zero] = 1.0 + np.log(vec[non_zero])

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

    def score_query(self, query: str) -> np.ndarray:
        q_vec = self._vectorize(query)
        scores = np.zeros(len(self.corpus))

        for i, d_vec in enumerate(self.doc_vectors):
            dot = np.dot(q_vec, d_vec)
            scores[i] = max(0.0, float(dot))

        # Scale to 0-100
        max_s = np.max(scores) if np.max(scores) > 0 else 1.0
        return (scores / max_s) * 100.0
