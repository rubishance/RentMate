from PIL import Image
import os

def remove_background(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    datas = img.getdata()
    
    new_data = []
    # Threshold for considering a pixel as "background white"
    threshold = 245 
    
    for item in datas:
        # If the pixel is very white, make it transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    input_file = r"C:\Users\ראובן שאנס\.gemini\antigravity\brain\3f5985be-7d1a-4d99-a0fc-b6344ea0fe2f\uploaded_image_1768915676876.png"
    output_file = r"c:\AnitiGravity Projects\RentMate\src\assets\rentmate-icon-only.png"
    
    if os.path.exists(input_file):
        remove_background(input_file, output_file)
        print(f"Success: {output_file} created.")
    else:
        print(f"Error: {input_file} not found.")
