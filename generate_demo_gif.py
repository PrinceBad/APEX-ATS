import os
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1000
HEIGHT = 560

# Fonts
try:
    font_mono = ImageFont.truetype("C:\\Windows\\Fonts\\consola.ttf", 12)
    font_mono_bold = ImageFont.truetype("C:\\Windows\\Fonts\\consolab.ttf", 13)
    font_mono_lg = ImageFont.truetype("C:\\Windows\\Fonts\\consolab.ttf", 17)
    font_ui = ImageFont.truetype("C:\\Windows\\Fonts\\segoeui.ttf", 13)
    font_ui_bold = ImageFont.truetype("C:\\Windows\\Fonts\\segoeuib.ttf", 14)
    font_title = ImageFont.truetype("C:\\Windows\\Fonts\\segoeuib.ttf", 16)
    font_sm = ImageFont.truetype("C:\\Windows\\Fonts\\segoeui.ttf", 11)
except Exception:
    font_mono = font_mono_bold = font_mono_lg = font_ui = font_ui_bold = font_title = font_sm = ImageFont.load_default()

# Color Palette
BG = (8, 12, 22)             # #080c16
PANEL = (15, 23, 42)         # #0f172a
BORDER = (30, 41, 59)        # #1e293b
BORDER_ACTIVE = (56, 189, 248)
TEXT_MAIN = (248, 250, 252)  # #f8fafc
TEXT_MUTED = (148, 163, 184) # #94a3b8
CYAN = (56, 189, 248)        # #38bdf8
GREEN = (16, 185, 129)       # #10b981
AMBER = (245, 158, 11)       # #f59e0b
RED = (239, 68, 68)          # #ef4444
DARK_RED = (69, 10, 10)      # #450a0a
PURPLE = (168, 85, 247)      # #a855f7

def draw_header(d):
    d.rectangle([(0, 0), (WIDTH, 48)], fill=(12, 18, 34))
    d.line([(0, 48), (WIDTH, 48)], fill=BORDER, width=1)
    
    d.text((20, 15), "APEX ATS", fill=CYAN, font=font_mono_lg)
    d.text((120, 17), "// DUAL-LAYER TALENT VERIFICATION ENGINE v4.1", fill=TEXT_MUTED, font=font_mono)
    
    # Status badges right
    badges = [
        ("ENGINE: ACTIVE", GREEN),
        ("LATENCY: 3.8ms", CYAN),
        ("DEFENSE: ACTIVE", GREEN),
        ("LIVE: VERCEL", PURPLE)
    ]
    x = WIDTH - 20
    for label, col in reversed(badges):
        bbox = font_mono.getbbox(label)
        w = bbox[2] - bbox[0] + 20
        x -= w
        d.rounded_rectangle([(x, 11), (x + w - 8, 37)], radius=4, fill=(20, 30, 50), outline=BORDER)
        # Dot indicator
        d.ellipse([(x + 8, 22), (x + 14, 28)], fill=col)
        d.text((x + 20, 17), label, fill=col, font=font_mono)
        x -= 6

def draw_left_panel(d):
    d.rounded_rectangle([(16, 60), (320, 540)], radius=8, fill=PANEL, outline=BORDER)
    d.text((32, 74), "TARGET ROLE PROFILE", fill=CYAN, font=font_ui_bold)
    d.line([(32, 98), (304, 98)], fill=BORDER, width=1)
    
    d.text((32, 110), "Position Title:", fill=TEXT_MUTED, font=font_sm)
    d.text((32, 126), "Senior AI Systems & Edge", fill=TEXT_MAIN, font=font_ui_bold)
    d.text((32, 144), "Runtime Engineer", fill=TEXT_MAIN, font=font_ui_bold)
    
    d.text((32, 174), "Min Exp: 4.0 Years  |  Degree: BS/MS", fill=TEXT_MUTED, font=font_sm)
    
    # Must have skills tags
    d.text((32, 204), "MUST-HAVE PREREQUISITES", fill=TEXT_MUTED, font=font_sm)
    skills = ["python", "kubernetes", "litert", "vllm"]
    sx, sy = 32, 224
    for s in skills:
        bbox = font_mono.getbbox(s)
        sw = bbox[2] - bbox[0] + 14
        d.rounded_rectangle([(sx, sy), (sx + sw, sy + 22)], radius=3, fill=(18, 38, 64), outline=CYAN)
        d.text((sx + 7, sy + 4), s, fill=CYAN, font=font_mono)
        sx += sw + 6
        
    # Weights configuration
    d.text((32, 264), "HYBRID RETRIEVAL WEIGHTS", fill=TEXT_MUTED, font=font_sm)
    weights = [
        ("Dense Semantic (MiniLM)", "40%", CYAN, 0.40),
        ("Lexical BM25 (Okapi)", "35%", (125, 211, 252), 0.35),
        ("Experience Calibration", "15%", GREEN, 0.15),
        ("STAR Impact Metrics", "10%", AMBER, 0.10)
    ]
    wy = 286
    for name, pct, col, ratio in weights:
        d.text((32, wy), name, fill=TEXT_MAIN, font=font_sm)
        d.text((264, wy), pct, fill=col, font=font_mono)
        wy += 16
        # bar
        d.rounded_rectangle([(32, wy), (298, wy + 5)], radius=2, fill=(25, 35, 52))
        d.rounded_rectangle([(32, wy), (32 + int(266 * ratio), wy + 5)], radius=2, fill=col)
        wy += 18
        
    # Pipeline stats footer
    d.rounded_rectangle([(28, 450), (308, 525)], radius=6, fill=(11, 17, 30), outline=BORDER)
    d.text((38, 460), "PIPELINE TELEMETRY", fill=TEXT_MUTED, font=font_sm)
    d.text((38, 480), "Batch Speed: 280 docs/sec (CPU)", fill=TEXT_MAIN, font=font_mono)
    d.text((38, 498), "Anti-Cheat Guard: ACTIVE (100%)", fill=GREEN, font=font_mono)

def create_frame(step_idx):
    img = Image.new('RGB', (WIDTH, HEIGHT), BG)
    d = ImageDraw.Draw(img)
    
    draw_header(d)
    draw_left_panel(d)
    
    # Right Main Area: (336, 60) to (984, 540)
    d.rounded_rectangle([(336, 60), (984, 540)], radius=8, fill=PANEL, outline=BORDER)
    
    # Header inside right area
    d.text((356, 76), "CANDIDATE AUDIT LEDGER", fill=TEXT_MAIN, font=font_ui_bold)
    d.text((580, 78), "[ Live Evaluation Stream ]", fill=CYAN, font=font_mono)
    d.line([(356, 100), (964, 100)], fill=BORDER, width=1)
    
    # Candidates list
    candidates = [
        {
            "name": "Marcus Vance",
            "title": "Principal AI Platform Lead",
            "exp": "6.5 yrs",
            "score": "94.2%",
            "tier": "SHORTLIST",
            "bm25": "91.5",
            "dense": "96.8",
            "status_color": GREEN,
            "highlight": (step_idx in [0, 1]),
            "star": "STAR Evidence: $1.8M infra savings, 120k QPS serving pipeline",
            "sub": "Sub-Scores: BM25: 91.5 | Dense: 96.8 | Prereqs: 4/4 Matched",
            "threat": None
        },
        {
            "name": "Elena Rostova",
            "title": "Staff MLSys Engineer",
            "exp": "5.0 yrs",
            "score": "88.7%",
            "tier": "SHORTLIST",
            "bm25": "84.2",
            "dense": "92.0",
            "status_color": GREEN,
            "highlight": (step_idx in [2, 3]),
            "star": "STAR Evidence: vLLM continuous batching, 3.2x throughput increase",
            "sub": "Sub-Scores: BM25: 84.2 | Dense: 92.0 | Prereqs: 4/4 Matched",
            "threat": None
        },
        {
            "name": "INJECTION_PAYLOAD_TEST",
            "title": "Anonymous Applicant (Untrusted Ingestion)",
            "exp": "99.0 yrs",
            "score": "0.00%",
            "tier": "SECURITY_FLAG",
            "bm25": "0.0",
            "dense": "0.0",
            "status_color": RED,
            "highlight": (step_idx in [4, 5, 6]),
            "star": None,
            "threat": "PROMPT INJECTION INTERCEPTED: 'SYSTEM OVERRIDE...'",
            "sub": "Action: Quarantined to Compliance Log | Execution Blocked"
        },
        {
            "name": "Jordan Hayes",
            "title": "Junior MLSys Researcher",
            "exp": "2.5 yrs",
            "score": "71.4%",
            "tier": "REVIEW QUEUE",
            "bm25": "70.1",
            "dense": "78.4",
            "status_color": AMBER,
            "highlight": (step_idx in [7, 8]),
            "star": "STAR Evidence: Quantized Gemma 2B for edge mobile deployment",
            "sub": "Sub-Scores: BM25: 70.1 | Dense: 78.4 | Gap: 2.5y vs 4.0y required",
            "threat": None
        }
    ]
    
    cy = 114
    for i, c in enumerate(candidates):
        is_active = c["highlight"]
        box_bg = (20, 30, 52) if is_active else (12, 19, 34)
        border_col = CYAN if (is_active and c["tier"] != "SECURITY_FLAG") else (RED if (is_active and c["tier"] == "SECURITY_FLAG") else BORDER)
        
        d.rounded_rectangle([(352, cy), (968, cy + 94)], radius=6, fill=box_bg, outline=border_col, width=2 if is_active else 1)
        
        # Name and title
        d.text((368, cy + 10), c["name"], fill=TEXT_MAIN, font=font_ui_bold)
        d.text((368, cy + 30), f"{c['title']}  •  Experience: {c['exp']}", fill=TEXT_MUTED, font=font_sm)
        
        # Threat or STAR line
        if c["threat"]:
            d.text((368, cy + 50), c["threat"], fill=RED, font=font_mono_bold)
            d.text((368, cy + 70), c["sub"], fill=(252, 165, 165), font=font_sm)
        else:
            d.text((368, cy + 50), c["star"], fill=(186, 230, 253), font=font_sm)
            d.text((368, cy + 70), c["sub"], fill=TEXT_MUTED, font=font_mono)
            
        # Score & Tier Badge right
        badge_w = 116
        badge_x = 968 - badge_w - 14
        d.rounded_rectangle([(badge_x, cy + 14), (badge_x + badge_w, cy + 42)], radius=4, fill=(10, 16, 28), outline=c["status_color"])
        
        # Center badge text
        bbox = font_mono_bold.getbbox(c["tier"])
        tw = bbox[2] - bbox[0]
        d.text((badge_x + (badge_w - tw)//2, cy + 21), c["tier"], fill=c["status_color"], font=font_mono_bold)
        
        score_val = c["score"]
        score_txt = f"MATCH {score_val}"
        s_bbox = font_mono_bold.getbbox(score_txt)
        sw = s_bbox[2] - s_bbox[0]
        d.text((badge_x + (badge_w - sw)//2, cy + 52), score_txt, fill=TEXT_MAIN if c["tier"] != "SECURITY_FLAG" else RED, font=font_mono_bold)
        
        cy += 102

    return img

def main():
    frames = []
    for step in range(9):
        frame = create_frame(step)
        frames.append(frame)
        
    out_path = "assets/apex_ats_demo.gif"
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=800,
        loop=0,
        optimize=True
    )
    # Also save the crisp static preview
    preview_path = "assets/apex_ats_preview.png"
    frames[5].save(preview_path, optimize=True)
    print(f"Generated demo GIF: {out_path} ({os.path.getsize(out_path)} bytes)")
    print(f"Generated preview PNG: {preview_path} ({os.path.getsize(preview_path)} bytes)")

if __name__ == "__main__":
    main()
