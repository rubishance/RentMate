from PIL import Image, ImageOps
import os

def invert_image(input_path, output_path):
    # Open image
    img = Image.open(input_path).convert("RGBA")
    
    # Split channels
    r, g, b, a = img.split()
    
    # Invert RGB
    rgb_img = Image.merge("RGB", (r, g, b))
    inverted_rgb = ImageOps.invert(rgb_img)
    
    # Merge back with original alpha
    r_inv, g_inv, b_inv = inverted_rgb.split()
    final_img = Image.merge("RGBA", (r_inv, g_inv, b_inv, a))
    
    # Save
    final_img.save(output_path, "PNG")
    print(f"Inverted image saved to: {output_path}")

if __name__ == "__main__":
    input_file = r"c:\AnitiGravity Projects\RentMate\public\assets\images\renty-mascot-transparent.png"
    output_file = r"c:\AnitiGravity Projects\RentMate\public\assets\images\renty-mascot-white.png"
    
    if os.path.exists(input_file):
        invert_image(input_file, output_file)
    else:
        print(f"Source file not found: {input_file}")
