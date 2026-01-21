from PIL import Image
import os

def crop_to_icon(input_path, output_path):
    """Crop the full logo to just the icon portion (remove text at bottom)"""
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    width, height = img.size
    
    # The icon is roughly the top 70% of the image (text is at bottom)
    # Crop to remove the bottom text portion
    crop_height = int(height * 0.65)  # Keep top 65% (icon only)
    
    # Crop: (left, top, right, bottom)
    cropped = img.crop((0, 0, width, crop_height))
    
    # Save with transparency
    cropped.save(output_path, "PNG")
    print(f"Success: Cropped icon saved to {output_path}")

if __name__ == "__main__":
    input_file = r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\3f5985be-7d1a-4d99-a0fc-b6344ea0fe2f\uploaded_image_1768914903863.jpg"
    output_file = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    
    if os.path.exists(input_file):
        crop_to_icon(input_file, output_file)
    else:
        print(f"Error: {input_file} not found.")
