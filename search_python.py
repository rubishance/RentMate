import os
import glob
import io

directory = r"C:\Users\ראובן שאנס\.gemini\antigravity\brain"
for file_path in glob.glob(directory + '/**/*.txt', recursive=True):
    try:
        with io.open(file_path, 'r', encoding='utf-16le', errors='replace') as f:
            content = f.read()
            if 'פילטר' in content or 'מסננ' in content or 'ביקשתי' in content:
                lines = content.splitlines()
                for i, line in enumerate(lines):
                    if 'פילטר' in line or 'מסננ' in line or 'ביקשתי' in line:
                        print(f"[{file_path}] Match: {line}")
    except Exception as e:
        pass
    try:
        with io.open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
            if 'פילטר' in content or 'מסננ' in content or 'ביקשתי' in content:
                lines = content.splitlines()
                for i, line in enumerate(lines):
                    if 'פילטר' in line or 'מסננ' in line or 'ביקשתי' in line:
                        print(f"[{file_path}] Match (UTF-8): {line}")
    except Exception as e:
        pass
