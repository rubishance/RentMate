
import os

try:
    if os.path.exists('logo_b64.txt'):
        with open('logo_b64.txt', 'r') as f:
            raw_data = f.read()
        # Clean the certutil output
        b64_data = raw_data.replace('-----BEGIN CERTIFICATE-----', '').replace('-----END CERTIFICATE-----', '').replace('\n', '').replace('\r', '').strip()
    elif os.path.exists('logo_b64_clean.txt'):
        with open('logo_b64_clean.txt', 'r') as f:
            b64_data = f.read().strip()
    else:
        print("Error: No logo base64 file found.")
        exit(1)
    
    with open('email_templates/preview.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Check what we are replacing.
    # The current preview.html has: <img src="https://qfvrekvugdjnwhnaucmz.supabase.co/storage/v1/object/public/assets/logo.png" ...>
    # or it might have the placeholder if I reverted?
    # Actually step 1076 updated it to the URL.
    # So I need to replace that URL with the data URI.
    
    target_url = "https://qfvrekvugdjnwhnaucmz.supabase.co/storage/v1/object/public/assets/logo.png"
    new_src = f"data:image/png;base64,{b64_data}"
    
    if target_url in html_content:
        new_html = html_content.replace(target_url, new_src)
        with open('email_templates/preview.html', 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Successfully injected base64 logo.")
    else:
        print("Target URL not found in HTML.")
        # Fallback: try replacing the previous placeholder if it exists?
        placeholder = "data:image/png;base64,PLACEHOLDER_BASE64_LOGO"
        if placeholder in html_content:
             new_html = html_content.replace(placeholder, new_src)
             with open('email_templates/preview.html', 'w', encoding='utf-8') as f:
                f.write(new_html)
             print("Successfully injected base64 logo (replaced placeholder).")

except Exception as e:
    print(f"Error: {e}")
