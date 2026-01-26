from PIL import Image, ImageFilter
import os
import sys

def process_image(input_path, output_path, threshold=240, feather=False):
    try:
        print(f"Processing: {input_path}")
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            # Check if pixel is white-ish
            if item[0] > threshold and item[1] > threshold and item[2] > threshold:
                new_data.append((255, 255, 255, 0)) # Make transparent
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        
        # Optional: Feathering to remove jagged edges if needed, but simple transparency often cleaner for icons
        # if feather:
        #    # Simple erosion/dilation or blur trick could go here, but keeping it simple for now
        #    pass
            
        img.save(output_path, "PNG")
        print(f"Saved to: {output_path}")
        return True
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return False

def clean_edges(input_path, output_path):
    # Specialized cleaner to remove "halo" by checking alpha and neighbors
    # This is a bit more complex, for now let's rely on the threshold removal
    pass

if __name__ == "__main__":
    project_root = r"c:\AnitiGravity Projects\RentMate"
    assets_dir = os.path.join(project_root, "public", "assets", "images")
    
    files_to_fix = [
        "renty-head-clean.png",
        "renty-full-body-white.png"
    ]
    
    for filename in files_to_fix:
        inp = os.path.join(assets_dir, filename)
        # We overwrite for now, or create a 'fixed' version
        # Let's overwrite as we are fixing the asset
        if os.path.exists(inp):
            process_image(inp, inp, threshold=220) # Slightly more aggressive threshold
        else:
            print(f"File not found: {inp}")

    # Also check src/assets if they are copied there (Vite sometimes uses src assets)
    src_assets_dir = os.path.join(project_root, "src", "assets")
    # Add src paths if you know them, but sticking to public based on find_by_name results
