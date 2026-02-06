from PIL import Image
import os

def enforce_transparency(input_path):
    print(f"Processing: {input_path}")
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        # We want to keep dark pixels (the outline) and make everything else transparent.
        # Threshold for "darkness". If brightness < 150, keep it. 
        # (Assuming the outline is black/dark grey and the background/body is light grey/white checkerboard)
        for item in datas:
            # item is (R, G, B, A)
            # Calculate brightness (simple average)
            brightness = (item[0] + item[1] + item[2]) / 3
            
            if brightness < 180: # Dark pixel (the outline)
                # Keep the pixel as black (or its original color) but with full opacity
                # Actually, let's force it to black for maximum clarity as an icon
                newData.append((0, 0, 0, 255))
            else:
                # Transparent
                newData.append((255, 255, 255, 0))

        img.putdata(newData)
        
        # Save as PNG
        img.save(input_path, "PNG")
        print("Successfully enforced transparency.")
    except Exception as e:
        print(f"Error: {e}")

# Target file
target_file = r"public/assets/icons/renty-chat-outline.png"
if os.path.exists(target_file):
    enforce_transparency(target_file)
else:
    print(f"File not found: {target_file}")
