from PIL import Image
import os

def analyze_pixels(input_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    width, height = img.size
    
    print(f"Analyzing: {input_path} ({width}x{height})")
    
    # Sample a grid
    for y in range(0, height, 100):
        for x in range(0, width, 100):
            p = img.getpixel((x, y))
            if p[3] > 0: # If not fully transparent
                print(f"Non-transparent at ({x}, {y}): {p}")

if __name__ == "__main__":
    dark_icon = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only-dark.png"
    if os.path.exists(dark_icon):
        analyze_pixels(dark_icon)
