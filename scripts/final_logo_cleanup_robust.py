from PIL import Image, ImageFilter
import os

def clean_logo_final(input_path, output_path):
    """Keep only black and gold, make everything else transparent."""
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    # Open original user uploaded image
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    
    # Target Colors
    BLACK = (0, 0, 0, 255)
    GOLD = (197, 160, 89, 255)
    TRANSPARENT = (0, 0, 0, 0)

    for item in datas:
        r, g, b, a = item
        
        # Black detection: Very low values across the board
        is_black = r < 60 and g < 60 and b < 60
        
        # Gold detection: R > G > B, with specific range
        # User gold is roughly 197, 160, 89
        is_gold = (r > 130) and (g > 90) and (r > g + 15) and (g > b + 15)
        
        if is_black:
            new_data.append(BLACK)
        elif is_gold:
            new_data.append(GOLD)
        else:
            new_data.append(TRANSPARENT)

    img.putdata(new_data)
    
    # Save result
    img.save(output_path, "PNG")
    print(f"Success: Clean logo saved to {output_path}")

if __name__ == "__main__":
    # Use the ORIGINAL user upload to avoid cumulative errors
    original_upload = r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\3f5985be-7d1a-4d99-a0fc-b6344ea0fe2f\uploaded_image_1768941127992.jpg"
    full_logo = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-logo-official.png"
    icon_only = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    
    print("Final Cleaning...")
    clean_logo_final(original_upload, full_logo)
    
    # Re-crop icon
    print("Re-cropping icon...")
    img = Image.open(full_logo)
    width, height = img.size
    crop_height = int(height * 0.65)
    icon_img = img.crop((0, 0, width, crop_height))
    icon_img.save(icon_only, "PNG")
    print("Done.")
