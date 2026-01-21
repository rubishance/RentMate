from PIL import Image
import os

def analyze_pixels(input_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    width, height = img.size
    
    print(f"Analyzing: {input_path} ({width}x{height})")
    
    # Check corners and some points
    points = [
        (0,0), (width-1, 0), (0, height-1), (width-1, height-1),
        (10, 10), (20, 20), (30, 30)
    ]
    
    for x, y in points:
        p = img.getpixel((x, y))
        print(f"Pixel at ({x}, {y}): {p}")

if __name__ == "__main__":
    dark_icon = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only-dark.png"
    if os.path.exists(dark_icon):
        analyze_pixels(dark_icon)
