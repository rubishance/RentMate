from PIL import Image
import os

def normalize_icon(input_path, output_path, target_size=(1024, 1024)):
    img = Image.open(input_path).convert("RGBA")
    
    # Get bounding box of non-transparent content
    bbox = img.getbbox()
    if not bbox:
        print(f"Empty image: {input_path}")
        return
        
    content = img.crop(bbox)
    
    # Create new transparent canvas
    new_img = Image.new("RGBA", target_size, (0, 0, 0, 0))
    
    # Calculate scale to fit content in target_size (with some margin, e.g. 90% of size)
    # Actually, the user says "exact same place and size". 
    # Let's use a fixed padding or fixed scale.
    
    # Let's aim for a fixed height of the logo itself, say 800px
    max_dim = 900
    w, h = content.size
    ratio = min(max_dim / w, max_dim / h)
    new_w = int(w * ratio)
    new_h = int(h * ratio)
    
    content_resized = content.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center centered
    offset_x = (target_size[0] - new_w) // 2
    offset_y = (target_size[1] - new_h) // 2
    
    new_img.paste(content_resized, (offset_x, offset_y), content_resized)
    new_img.save(output_path, "PNG")
    print(f"Normalized {input_path} to {output_path}")

if __name__ == "__main__":
    dark_icon = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only-dark.png"
    light_icon = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    
    normalize_icon(dark_icon, dark_icon)
    normalize_icon(light_icon, light_icon)
