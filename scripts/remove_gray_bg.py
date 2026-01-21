from PIL import Image
import os

def remove_gray_background(input_path, output_path):
    """Remove the gray/checkerboard background from the logo"""
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        r, g, b, a = item
        
        # If pixel is very light (white-ish or light gray from checkerboard)
        # OR if it's medium gray (dark squares of checkerboard)
        # Make it fully transparent
        is_light = r > 200 and g > 200 and b > 200
        is_gray = abs(r - g) < 20 and abs(r - b) < 20 and abs(g - b) < 20
        
        if is_light or (is_gray and r > 150):
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Success: Transparent logo saved to {output_path}")

if __name__ == "__main__":
    # Process both the full logo and icon-only
    full_logo = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-logo-official.png"
    icon_only = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    
    print("Processing full logo...")
    remove_gray_background(full_logo, full_logo)
    
    print("Processing icon-only...")
    remove_gray_background(icon_only, icon_only)
