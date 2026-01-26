from PIL import Image
import os

def extract_transparency(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    # Threshold for "background-ish" colors in the fake checkerboard
    # Typically white (255, 255, 255) and light gray (approx 200-240)
    for item in datas:
        r, g, b, a = item
        # If it's very bright and very desaturated (small max diff between RGB)
        # It's likely part of the checkerboard background
        max_diff = max(abs(r-g), abs(g-b), abs(b-r))
        avg = (r + g + b) / 3
        
        if avg > 180 and max_diff < 15:
            # Make it fully transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    
    # Crop to content to remove whitespace if any
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")
    print(f"Successfully processed {input_path} and saved to {output_path}")

if __name__ == "__main__":
    assets_dir = r"c:\AnitiGravity Projects\RentMate\public\assets\images"
    files = [
        "renty-head-clean.png",
        "renty-full-body-white.png",
        "renty-head-white.png"
    ]
    for filename in files:
        target_img = os.path.join(assets_dir, filename)
        if os.path.exists(target_img):
            extract_transparency(target_img, target_img)
