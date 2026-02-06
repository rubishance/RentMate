from PIL import Image
import os

def remove_background(input_path):
    print(f"Processing: {input_path}")
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Check if pixel is white or very close to white
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))  # Transparent
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(input_path, "PNG")
        print("Successfully removed background.")
    except Exception as e:
        print(f"Error: {e}")

# Target file
target_file = r"public/assets/icons/renty-chat-outline.png"
if os.path.exists(target_file):
    remove_background(target_file)
else:
    print(f"File not found: {target_file}")
