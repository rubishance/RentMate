from PIL import Image, ImageChops

def process_icon(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    
    # Create a background to compare against for trimming
    # We use a dummy background to find the bounding box of non-empty pixels
    bg = Image.new("RGBA", img.size, (0,0,0,0))
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()
    
    if not bbox:
        # Fallback if image is empty or detection fails
        img.resize((512, 512), Image.LANCZOS).save(output_path)
        return

    # Crop to the actual mascot content
    droid = img.crop(bbox)
    d_w, d_h = droid.size
    
    # We want a square result with no borders to maximize size.
    margin = 0
    side = d_h + (margin * 2)
    
    # Create canvas
    final = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    
    # Paste droid centered
    paste_pos = (
        (side - d_w) // 2,
        (side - d_h) // 2
    )
    final.paste(droid, paste_pos, droid)
    
    # Resize to standard icon size
    final.resize((512, 512), Image.LANCZOS).save(output_path)
    
    # Also save the transparent version (just the droid, no extra padding)
    droid.save(output_path.replace("square.png", "transparent.png"))

input_file = r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\2fadc8f8-53ef-4d4c-b622-f5952960d933\uploaded_media_1770021145913.png"
output_file = r"c:\AnitiGravity Projects\RentMate\public\assets\images\renty-mascot-square.png"

process_icon(input_file, output_file)
print("Icons processed successfully")
