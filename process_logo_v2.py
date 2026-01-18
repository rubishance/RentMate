from PIL import Image
import math

def distance(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])))

def process():
    try:
        # Load original image
        img = Image.open(r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\99ac1980-6de9-43da-ab2f-6a2109df3e4a\uploaded_image_1768420762604.png").convert("RGBA")
        data = img.getdata()
        
        new_data = []
        target_color = (255, 255, 255) # White
        threshold = 60 # Tolerance for off-white/gray shadows
        
        for item in data:
            # Check distance from white
            if distance(item, target_color) < threshold:
                new_data.append((255, 255, 255, 0)) # Make transparent
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        
        # Crop to content (trim empty space)
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            
        output_path = r"c:\Users\ראובן שאנס\Desktop\RentMate\src\assets\logo-final-clean.png"
        img.save(output_path)
        print(f"Success! Saved to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    process()
