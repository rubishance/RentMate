from PIL import Image
import os

def clean_checkerboard_dark(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []
    for item in datas:
        r, g, b, a = item
        # If it's the fake checkerboard square colors (roughly grayscale and medium/dark)
        # In the provided image, checkerboard is around (60-80 range)
        # Logo colors: White (255,255,255) and Gold
        is_white = r > 180 and g > 180 and b > 180
        is_gold = r > 150 and g > 120 and b < 100
        if is_white or is_gold:
            new_data.append(item)
        else:
            new_data.append((0, 0, 0, 0))
    img.putdata(new_data)
    img.save(output_path, "PNG")

def clean_white_bg_light(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []
    for item in datas:
        r, g, b, a = item
        # Make very white pixels transparent
        if r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    dark_icon = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only-dark.png"
    light_icon = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    
    if os.path.exists(dark_icon):
        clean_checkerboard_dark(dark_icon, dark_icon)
        print(f"Cleaned Dark: {dark_icon}")
    
    if os.path.exists(light_icon):
        clean_white_bg_light(light_icon, light_icon)
        print(f"Cleaned Light: {light_icon}")
