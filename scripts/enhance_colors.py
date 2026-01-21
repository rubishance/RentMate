from PIL import Image
import os

def enhance_logo_colors(input_path, output_path):
    """Enhance logo colors to pure black and rich gold"""
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        r, g, b, a = item
        
        # Skip transparent pixels
        if a == 0:
            new_data.append(item)
            continue
        
        # Detect if pixel is "black-ish" (dark colors)
        is_dark = r < 100 and g < 100 and b < 100
        
        # Detect if pixel is "gold-ish" (yellowish colors)
        is_gold = r > 150 and g > 100 and b < 150
        
        if is_dark:
            # Make it pure black
            new_data.append((0, 0, 0, a))
        elif is_gold:
            # Make it rich champagne gold (#C5A059)
            new_data.append((197, 160, 89, a))
        else:
            # Keep as is (shouldn't happen much)
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Success: Enhanced logo saved to {output_path}")

if __name__ == "__main__":
    # Process both logos
    full_logo = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-logo-official.png"
    icon_only = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    
    print("Enhancing full logo colors...")
    enhance_logo_colors(full_logo, full_logo)
    
    print("Enhancing icon-only colors...")
    enhance_logo_colors(icon_only, icon_only)
