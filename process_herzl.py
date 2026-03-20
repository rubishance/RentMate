from PIL import Image
import numpy as np

def make_transparent_icon():
    img_path = r"public\herzl.jpg"
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Failed to open {img_path}: {e}")
        return

    # Convert to numpy array
    data = np.array(img)
    
    # Get colors
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Create mask for white background (assuming mostly white > 240)
    white_mask = (r > 200) & (g > 200) & (b > 200)
    
    # Make white background transparent
    data[:,:,3][white_mask] = 0
    
    # For the black silhouette (non-white), apply the primary color tint: #4F46E5 (Indigo 600)
    # rgb(79, 70, 229)
    black_mask = ~white_mask
    data[:,:,0][black_mask] = 79 # R
    data[:,:,1][black_mask] = 70 # G
    data[:,:,2][black_mask] = 229 # B
    # Keep alpha opaque for black parts
    
    # Save as PNG
    out_img = Image.fromarray(data)
    out_path = r"public\herzl_icon.png"
    out_img.save(out_path)
    print(f"Saved processed icon to {out_path}")

if __name__ == "__main__":
    make_transparent_icon()
