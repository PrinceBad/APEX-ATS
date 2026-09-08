"""
Layout-Aware Multi-Page Parser & OCR Fallback Sensor
Extracts structured text from multi-page PDFs and DOCX files, monitors text density,
and flags flattened/scanned documents for OCR routing.
"""

import os
import re
from typing import Dict, Any, List, Optional
import pypdf
from docx import Document
from .anti_cheat import AntiCheatEngine

class ResumeParser:
    def __init__(self, min_density_threshold: int = 150):
        """
        min_density_threshold: minimum characters per page to consider a document
        text-native. Below this threshold, document is flagged for OCR fallback.
        """
        self.min_density_threshold = min_density_threshold
        self.anti_cheat = AntiCheatEngine()

    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Parses a PDF, DOCX, or text file into a normalized candidate data record.
        """
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return self._parse_pdf(file_path)
        elif ext in [".docx", ".doc"]:
            return self._parse_docx(file_path)
        elif ext == ".txt":
            return self._parse_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def _parse_pdf(self, file_path: str) -> Dict[str, Any]:
        reader = pypdf.PdfReader(file_path)
        page_count = len(reader.pages)
        pages_text = []

        total_chars = 0
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_text.append(text)
            total_chars += len(text.strip())

        avg_density = total_chars / max(1, page_count)
        ocr_required = avg_density < self.min_density_threshold

        full_raw_text = "\n--- [PAGE BREAK] ---\n".join(pages_text)

        # Anti-cheat scan
        compromised, threat_level, threats, clean_text = self.anti_cheat.scan(full_raw_text)

        # Heuristic metadata extraction
        exp_years = self._extract_experience_years(clean_text)
        education = self._extract_education(clean_text)

        return {
            "file_name": os.path.basename(file_path),
            "file_path": file_path,
            "page_count": page_count,
            "char_count": total_chars,
            "density_chars_per_page": round(avg_density, 1),
            "ocr_fallback_triggered": ocr_required,
            "threat_level": threat_level,
            "threats_detected": threats,
            "clean_text": clean_text,
            "experience_years": exp_years,
            "education": education
        }

    def _parse_docx(self, file_path: str) -> Dict[str, Any]:
        doc = Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        full_raw_text = "\n".join(paragraphs)

        compromised, threat_level, threats, clean_text = self.anti_cheat.scan(full_raw_text)
        exp_years = self._extract_experience_years(clean_text)
        education = self._extract_education(clean_text)

        return {
            "file_name": os.path.basename(file_path),
            "file_path": file_path,
            "page_count": 1,
            "char_count": len(full_raw_text),
            "density_chars_per_page": len(full_raw_text),
            "ocr_fallback_triggered": len(full_raw_text) < 50,
            "threat_level": threat_level,
            "threats_detected": threats,
            "clean_text": clean_text,
            "experience_years": exp_years,
            "education": education
        }

    def _parse_txt(self, file_path: str) -> Dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            full_raw_text = f.read()

        compromised, threat_level, threats, clean_text = self.anti_cheat.scan(full_raw_text)
        exp_years = self._extract_experience_years(clean_text)
        education = self._extract_education(clean_text)

        return {
            "file_name": os.path.basename(file_path),
            "file_path": file_path,
            "page_count": 1,
            "char_count": len(full_raw_text),
            "density_chars_per_page": len(full_raw_text),
            "ocr_fallback_triggered": len(full_raw_text) < 50,
            "threat_level": threat_level,
            "threats_detected": threats,
            "clean_text": clean_text,
            "experience_years": exp_years,
            "education": education
        }

    def _extract_experience_years(self, text: str) -> float:
        """Heuristic extractor for total years of engineering experience."""
        # Matches "5.0 years of production experience", "6.5 years of experience", "4 yrs experience"
        matches = re.findall(
            r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[\w\-]+){0,2}\s+(?:experience|exp)\b",
            text,
            re.IGNORECASE
        )
        if matches:
            return max(float(m) for m in matches)

        # Fallback: inspect date ranges like 2018 - 2024
        years = re.findall(r"\b(20\d\d|19\d\d)\b", text)
        if len(years) >= 2:
            int_years = [int(y) for y in years if 1990 <= int(y) <= 2026]
            if int_years:
                span = max(int_years) - min(int_years)
                if 1 <= span <= 35:
                    return float(span)
        return 0.0

    def _extract_education(self, text: str) -> str:
        """Identifies degree level resiliently."""
        lower = text.lower()
        if re.search(r"\b(ph\.?d|doctorate)\b", lower):
            return "PhD"
        if re.search(r"\b(master(?:'?s)?|m\.?s\.?|m\.?tech|m\.?sc)\b", lower):
            return "Master's"
        if re.search(r"\b(bachelor(?:'?s)?|b\.?s\.?|b\.?tech|b\.?e\.?|b\.?sc)\b", lower):
            return "Bachelor's"
        return "None Detected"
