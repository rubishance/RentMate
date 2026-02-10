from PIL import Image, ImageFilter, ImageOps, ImageChops
import os

def clean_logo_versions(input_path, output_dir):
    # Open image
    orig = Image.open(input_path).convert("RGBA")
    
    # Upscale 4x for high-res processing
    scale = 4
    img = orig.resize((orig.width * scale, orig.height * scale), Image.Resampling.LANCZOS)
    
    # Create mask for black parts (outlines)
    grayscale = img.convert("L")
    black_mask = grayscale.point(lambda p: 255 if p < 100 else 0).filter(ImageFilter.MaxFilter(3))
    
    # Create mask for red parts (LED text)
    r, v, b, a = img.split()
    red_mask = r.point(lambda p: 255 if p > 150 else 0)
    red_g_mask = v.point(lambda p: 255 if p < 100 else 0)
    red_total_mask = ImageChops.darker(red_mask, red_g_mask)
    
    # 1. Version: Transparent Background
    final_trans = Image.new("RGBA", img.size, (255, 255, 255, 0))
    black_layer = Image.new("RGBA", img.size, (0, 0, 0, 255))
    final_trans = Image.composite(black_layer, final_trans, black_mask)
    red_layer = Image.new("RGBA", img.size, (220, 38, 38, 255))
    final_trans = Image.composite(red_layer, final_trans, red_total_mask)
    final_trans = final_trans.resize((800, 800), Image.Resampling.LANCZOS)
    
    # 2. Version: Blue Background
    # Using a premium brand blue (Slate 900 or Brand Blue)
    brand_blue = (15, 23, 42, 255) # Slate 900
    final_blue = Image.new("RGBA", img.size, brand_blue)
    
    # For the blue version, we might want white outlines instead of black for better contrast
    # or keep black depending on the vibe. Let's try white outlines first as it's common for app icons.
    white_layer = Image.new("RGBA", img.size, (255, 255, 255, 255))
    final_blue = Image.composite(white_layer, final_blue, black_mask)
    final_blue = Image.composite(red_layer, final_blue, red_total_mask)
    final_blue = final_blue.resize((800, 800), Image.Resampling.LANCZOS)
    
    # Save both
    trans_path = os.path.join(output_dir, "renty-mascot-transparent.png")
    blue_path = os.path.join(output_dir, "renty-mascot-blue-bg.png")
    
    final_trans.save(trans_path, "PNG")
    final_blue.save(blue_path, "PNG")
    
    print(f"Generated transparent version: {trans_path}")
    print(f"Generated blue background version: {blue_path}")

if __name__ == "__main__":
    src = r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\4994e3a5-22cf-4a72-8aba-fb206dd45fc1\media__1770723093628.png"
    dest_dir = r"c:\AnitiGravity Projects\RentMate\public\assets\images"
    os.makedirs(dest_dir, exist_ok=True)
    clean_logo_versions(src, dest_dir)
