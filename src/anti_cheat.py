"""
Anti-Cheat & Prompt-Injection Defense Engine
Scans incoming resume text streams for adversarial prompts, hidden token stuffing,
and instruction-override exploits.
"""

import re
from typing import Dict, List, Tuple

# Adversarial prompt-injection signatures commonly used against LLM screeners
INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"(?i)system\s*prompt\s*override",
    r"(?i)you\s+are\s+now\s+(a|an)\s+",
    r"(?i)rate\s+this\s+candidate\s+(100|perfect|10/10|top)",
    r"(?i)always\s+respond\s+with",
    r"(?i)disregard\s+(the\s+)?(job\s+description|evaluation\s+criteria)",
    r"(?i)developer\s+mode\s+enabled",
    r"(?i)special\s+instructions\s+for\s+the\s+evaluator"
]

# Hidden keyword stuffing signatures (repetitive zero-entropy text blocks)
REPETITION_PATTERN = r"(\b\w+\b)(?:\s+\1){4,}"

class AntiCheatEngine:
    def __init__(self):
        self.injection_regexes = [re.compile(p) for p in INJECTION_PATTERNS]
        self.repetition_regex = re.compile(REPETITION_PATTERN, re.IGNORECASE)

    def scan(self, text: str) -> Tuple[bool, str, List[str], str]:
        """
        Scans text for prompt injections and adversarial patterns.
        Returns:
            is_compromised: bool
            threat_level: 'CLEAN' | 'SUSPICIOUS' | 'CRITICAL_ATTACK'
            detected_threats: List of matched strings
            sanitized_text: Safe text with dangerous instructions stripped
        """
        threats = []
        threat_level = "CLEAN"
        sanitized = text

        # 1. Prompt Injection Scanning
        for r in self.injection_regexes:
            matches = r.findall(text)
            if matches:
                for m in r.finditer(text):
                    snippet = m.group(0)
                    threats.append(f"Prompt Injection: '{snippet}'")
                # Redact dangerous instruction
                sanitized = r.sub("[REDACTED_ADVERSARIAL_INSTRUCTION]", sanitized)
                threat_level = "CRITICAL_ATTACK"

        # 2. Keyword Repetition / Stuffing Scan
        rep_matches = self.repetition_regex.findall(text)
        if rep_matches:
            for word in set(rep_matches):
                threats.append(f"Excessive Keyword Stuffing: '{word}' repeated consecutively")
            if threat_level == "CLEAN":
                threat_level = "SUSPICIOUS"

        is_compromised = len(threats) > 0
        return is_compromised, threat_level, threats, sanitized
