import os
from PIL import Image

TARGET_WIDTH = 1100

def process_screen(filepath):
    img = Image.open(filepath).convert("RGB")
    # Resize preserving aspect ratio
    w, h = img.size
    ratio = TARGET_WIDTH / w
    new_h = int(h * ratio)
    img_resized = img.resize((TARGET_WIDTH, new_h), Image.Resampling.LANCZOS)
    return img_resized

def main():
    screens = [
        ("assets/apex_real_screening.png", 2800),    # Main Candidate Ledger
        ("assets/apex_real_security.png", 2200),     # Security Quarantine Filter
        ("assets/apex_real_dossier.png", 2800),      # Candidate Dossier Audit Modal
        ("assets/apex_real_calibration.png", 2600)   # Threshold Calibration Exhibit
    ]
    
    frames = []
    durations = []
    for path, dur in screens:
        if os.path.exists(path):
            img = process_screen(path)
            # Convert to adaptive 256 colors palette for clean GIF
            pal_img = img.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
            frames.append(pal_img)
            durations.append(dur)
            print(f"Loaded and processed: {path} (size: {img.size})")

    out_gif = "assets/apex_ats_live_demo.gif"
    frames[0].save(
        out_gif,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True
    )
    
    # Also save the main screening as the primary preview PNG
    primary_png = "assets/apex_ats_preview.png"
    main_img = Image.open("assets/apex_real_screening.png").convert("RGB")
    w, h = main_img.size
    ratio = TARGET_WIDTH / w
    main_img.resize((TARGET_WIDTH, int(h * ratio)), Image.Resampling.LANCZOS).save(primary_png, optimize=True)
    
    print(f"Built real demo GIF: {out_gif} ({os.path.getsize(out_gif)} bytes)")
    print(f"Updated preview PNG: {primary_png} ({os.path.getsize(primary_png)} bytes)")

if __name__ == "__main__":
    main()
