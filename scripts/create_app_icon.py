from PIL import Image, ImageOps
import os

def create_app_icon(input_path, output_path):
    """Create a square app icon: Logo on white background with padding."""
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    # Open the icon-only transparent logo
    logo = Image.open(input_path).convert("RGBA")
    
    # Calculate sizes for a 512x512 icon
    icon_size = 512
    padding = 64 # Edge on the sides
    logo_target_size = icon_size - (padding * 2)
    
    # Resize logo maintaining aspect ratio
    logo.thumbnail((logo_target_size, logo_target_size), Image.Resampling.LANCZOS)
    
    # Create white background
    background = Image.new("RGBA", (icon_size, icon_size), (255, 255, 255, 255))
    
    # Center logo on background
    offset = ((icon_size - logo.width) // 2, (icon_size - logo.height) // 2)
    background.paste(logo, offset, logo)
    
    # Save as PNG
    background.save(output_path, "PNG")
    print(f"Success: App icon saved to {output_path}")

if __name__ == "__main__":
    icon_only = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    app_icon = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-app-icon.png"
    
    print("Creating app icon...")
    create_app_icon(icon_only, app_icon)
