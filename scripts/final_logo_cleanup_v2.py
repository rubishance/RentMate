from PIL import Image
import os

def clean_and_enhance_logo_v2(input_path, output_path):
    """Surgically remove checkerboard and map to PURE black and PURE gold"""
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    
    # Pure colors
    PURE_BLACK = (0, 0, 0, 255)
    PURE_GOLD = (197, 160, 89, 255) # Rich champagne gold
    TRANSPARENT = (0, 0, 0, 0)

    for item in datas:
        r, g, b, a = item
        
        # Calculate saturation and brightness
        max_c = max(r, g, b)
        min_c = min(r, g, b)
        sat = (max_c - min_c) / max_c if max_c > 0 else 0
        brightness = max_c / 255
        
        # BACKGROUND DETECTION (Checkerboard gray/white)
        # Gray pixels have very low saturation
        is_gray = sat < 0.15
        # Light pixels (white part of checkerboard)
        is_very_light = brightness > 0.9
        
        if (is_gray and brightness > 0.4) or is_very_light:
            new_data.append(TRANSPARENT)
            continue

        # LOGO COLOR DETECTION
        # Gold is warm (R > G > B) and has saturation
        is_gold_hue = (r > g + 10) and (g > b + 10)
        
        if brightness < 0.3 and sat < 0.3:
            # It's part of the black logo
            new_data.append(PURE_BLACK)
        elif is_gold_hue and brightness > 0.4:
            # It's part of the gold logo
            new_data.append(PURE_GOLD)
        else:
            # Fallback for anti-aliasing or noisy pixels
            # If it's dark, make it black. If it's colored, make it gold.
            if brightness < 0.5:
                new_data.append(PURE_BLACK)
            else:
                new_data.append(TRANSPARENT)

    img.putdata(new_data)
    
    # Simple smoothing/cleanup can be done here if needed, but let's try this first
    img.save(output_path, "PNG")
    print(f"Success: Cleaned V2 saved to {output_path}")

if __name__ == "__main__":
    full_logo = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-logo-official.png"
    
    print("V2 Cleaning...")
    clean_and_enhance_logo_v2(full_logo, full_logo)
    
    # Re-crop icon
    print("Re-cropping icon...")
    img = Image.open(full_logo)
    width, height = img.size
    crop_height = int(height * 0.65)
    icon_img = img.crop((0, 0, width, crop_height))
    icon_path = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    icon_img.save(icon_path, "PNG")
    print(f"Success: Icon-only saved to {icon_path}")
