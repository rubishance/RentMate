from PIL import Image

def is_grayscale(c, tolerance=10):
    return abs(c[0] - c[1]) < tolerance and abs(c[1] - c[2]) < tolerance

def analyze():
    img = Image.open(r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\99ac1980-6de9-43da-ab2f-6a2109df3e4a\uploaded_image_1768420762604.png").convert("RGBA")
    colors = img.getcolors(maxcolors=1000000)
    
    # Filter out grayscale
    candidates = []
    for count, color in colors:
        if not is_grayscale(color[:3], tolerance=20):
            candidates.append((count, color))
            
    # Sort by count desc
    candidates.sort(key=lambda x: x[0], reverse=True)
    
    print("Top 5 non-grayscale colors:")
    for count, color in candidates[:5]:
        print(f"Count: {count}, Color: {color}")

if __name__ == "__main__":
    analyze()
