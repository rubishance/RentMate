from PIL import Image

def is_grayscale(c, tolerance=25):
    # Check if R, G, B are all close to each other
    return max(c[:3]) - min(c[:3]) < tolerance

def process():
    try:
        img = Image.open(r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\99ac1980-6de9-43da-ab2f-6a2109df3e4a\uploaded_image_1768420762604.png").convert("RGBA")
        data = img.getdata()
        
        new_data = []
        for item in data:
            # If it looks like gray/white/black -> Transparent
            if is_grayscale(item):
                new_data.append((255, 255, 255, 0))
            else:
                # Keep original color
                new_data.append(item)
                
        img.putdata(new_data)
        
        # Crop
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            
        output_path = r"c:\Users\ראובן שאנס\Desktop\RentMate\src\assets\logo-final-clean-v2.png"
        img.save(output_path)
        print(f"Success! Saved to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    process()
