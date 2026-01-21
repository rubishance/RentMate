from PIL import Image
import os

def clean_and_enhance_logo(input_path, output_path):
    """Remove ALL background and enhance to pure black and gold only"""
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        r, g, b, a = item
        
        # Detect gold pixels (yellowish/tan colors)
        is_gold = (r > 140 and g > 100 and r > g and g > b)
        
        # Detect black pixels (very dark)
        is_black = (r < 50 and g < 50 and b < 50)
        
        # Detect gray/white background (checkerboard or any light color)
        is_background = (r > 100 and g > 100 and b > 100) and not is_gold
        
        if is_background:
            # Make completely transparent
            new_data.append((0, 0, 0, 0))
        elif is_gold:
            # Pure rich gold (#C5A059)
            new_data.append((197, 160, 89, 255))
        elif is_black:
            # Pure black
            new_data.append((0, 0, 0, 255))
        else:
            # For any edge pixels, decide based on brightness
            brightness = (r + g + b) / 3
            if brightness > 100:
                # Likely background or anti-aliasing of background
                new_data.append((0, 0, 0, 0))
            else:
                # Likely part of black logo
                new_data.append((0, 0, 0, 255))

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Success: Clean logo saved to {output_path}")

if __name__ == "__main__":
    # Process the full logo
    full_logo = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-logo-official.png"
    
    print("Cleaning and enhancing logo...")
    clean_and_enhance_logo(full_logo, full_logo)
    
    # Now create icon-only version by cropping
    print("Creating icon-only version...")
    img = Image.open(full_logo)
    width, height = img.size
    
    # Crop to top 65% to remove text
    crop_height = int(height * 0.65)
    icon_img = img.crop((0, 0, width, crop_height))
    
    icon_path = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    icon_img.save(icon_path, "PNG")
    print(f"Success: Icon-only saved to {icon_path}")
