from PIL import Image, ImageDraw, ImageFont
import os

def create_horizontal_logo(icon_path, output_path):
    """Create a horizontal logo: Icon on the left, Text on the right."""
    if not os.path.exists(icon_path):
        print(f"Error: {icon_path} not found.")
        return

    # Open the icon-only transparent logo
    icon = Image.open(icon_path).convert("RGBA")
    
    # Target height for the header
    height = 200
    icon.thumbnail((height, height), Image.Resampling.LANCZOS)
    
    # Create canvas
    width = 1000 # Enough for text
    canvas = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    
    # Paste icon
    canvas.paste(icon, (0, 0), icon)
    
    # Add Text
    draw = ImageDraw.Draw(canvas)
    
    # Try to find a bold san-serif font
    font_paths = [
        "C:\\Windows\\Fonts\\arialbd.ttf", # Arial Bold
        "C:\\Windows\\Fonts\\segoeuib.ttf", # Segoe UI Bold
        "C:\\Windows\\Fonts\\verdana.ttf"
    ]
    
    font = None
    for p in font_paths:
        if os.path.exists(p):
            font = ImageFont.truetype(p, 120)
            break
            
    if not font:
        font = ImageFont.load_default()
        print("Warning: Using default font.")

    # Draw text "RentMate" in black
    text = "RentMate"
    text_color = (0, 0, 0, 255)
    
    # Position text to the right of the icon with some padding
    padding = 40
    text_x = icon.width + padding
    
    # Center text vertically
    if hasattr(font, 'getbbox'):
        bbox = draw.textbbox((0, 0), text, font=font)
        text_height = bbox[3] - bbox[1]
    else:
        text_height = 80 # Fallback
        
    text_y = (height - text_height) // 2 - 10 # Slight manual adjustment
    
    draw.text((text_x, text_y), text, fill=text_color, font=font)
    
    # Crop to content
    # Find bounding box of non-transparent pixels
    bbox = canvas.getbbox()
    if bbox:
        canvas = canvas.crop(bbox)
        # Add a tiny bit of padding
        final = Image.new("RGBA", (canvas.width + 20, canvas.height + 20), (255, 255, 255, 0))
        final.paste(canvas, (10, 10), canvas)
        canvas = final

    canvas.save(output_path, "PNG")
    print(f"Success: Horizontal logo saved to {output_path}")

if __name__ == "__main__":
    icon_only = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    horizontal_logo = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-logo-header.png"
    
    print("Creating horizontal header logo...")
    create_horizontal_logo(icon_only, horizontal_logo)
