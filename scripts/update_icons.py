import os
from PIL import Image

# Path to the new image uploaded by user in conversation
source_img = r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\780cae86-4690-4361-878b-e2918eb5528b\media__1773139999249.jpg" 
public_dir = r"c:\AnitiGravity Projects\RentMate\public"

if not os.path.exists(source_img):
    print(f"Error: Source image not found at {source_img}")
    exit(1)

try:
    with Image.open(source_img) as img:
        img = img.convert("RGBA")
        
        # Resize functions
        def save_resized(filename, size):
            resized = img.resize(size, Image.Resampling.LANCZOS)
            path = os.path.join(public_dir, filename)
            resized.save(path, format="PNG")
            print(f"Saved {filename} {size}")

        save_resized("favicon.png", (192, 192))
        save_resized("pwa-192x192.png", (192, 192))
        save_resized("pwa-512x512.png", (512, 512))
        save_resized("pwa-maskable-192x192.png", (192, 192))
        save_resized("apple-touch-icon.png", (180, 180))

        # Create OG image (1200x630) with dark blue background
        og_bg = Image.new('RGBA', (1200, 630), (11, 21, 42, 255)) # approx #0B152A
        # Calculate aspect ratio for logo inside OG image, let's make logo 500x500
        logo_for_og = img.resize((500, 500), Image.Resampling.LANCZOS)
        # Paste centered
        offset = ((1200 - 500) // 2, (630 - 500) // 2)
        # Assuming logo might have transparency, use it as mask if RGBA
        og_img_final = Image.alpha_composite(og_bg, Image.new('RGBA', og_bg.size, (0,0,0,0)))
        og_img_final.paste(logo_for_og, offset, logo_for_og if logo_for_og.mode == 'RGBA' else None)
        og_path = os.path.join(public_dir, "og-image.png")
        og_img_final.convert('RGB').save(og_path, format="PNG")
        print("Saved og-image.png")

except Exception as e:
    print(f"Failed to process image: {e}")
    exit(1)
