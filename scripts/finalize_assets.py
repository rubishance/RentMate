from PIL import Image
import os

def crop_to_icon(input_path, output_path):
    """Crop the full official logo to extract only the icon (remove text)"""
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # The icon is at the top. Let's crop it.
    # We'll detect the vertical bounding box to be precise.
    datas = img.getdata()
    top = height
    bottom = 0
    left = width
    right = 0
    
    for y in range(height):
        for x in range(width):
            if datas[y * width + x][3] > 0: # If pixel is not transparent
                # But we want to exclude the bottom part which is the text
                # We know the text starts roughly 65% down
                if y < height * 0.65:
                    top = min(top, y)
                    bottom = max(bottom, y)
                    left = min(left, x)
                    right = max(right, x)
    
    if bottom > top:
        # Add a tiny bit of padding
        padding = 5
        icon_img = img.crop((max(0, left-padding), max(0, top-padding), min(width, right+padding), min(height, bottom+padding)))
        icon_img.save(output_path, "PNG")
        print(f"Success: Final icon-only cropped to {output_path}")

if __name__ == "__main__":
    input_file = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-logo-official.png"
    output_file = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    crop_to_icon(input_file, output_file)
