
import os

file_path = r"c:\AnitiGravity Projects\RentMate\src\pages\AddContract.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    # Match the container div for base index/date
    if 'bg-background/80 p-4 rounded-xl border border-border/50 space-y-4' in line:
        # Narrow down to the relevant section (indexation is around step 3/4, line 1900+)
        if i > 1900 and i < 2000:
            start_idx = i
    # Match the start of the next section
    if '{/* Index Type' in line and start_idx != -1 and i > start_idx:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    # Preserve the indentation of the start line
    indent = lines[start_idx][:lines[start_idx].find('<')]
    
    new_block = [
        lines[start_idx],
        f'{indent}    <div className="space-y-1">\n',
        f'{indent}        <label className="text-xs font-medium flex items-center gap-2">\n',
        f"{indent}            {{t('baseDate')}}\n",
        f'{indent}            {{scannedQuotes.baseIndexDate && <Tooltip quote={{scannedQuotes.baseIndexDate}} />}} <ConfidenceDot field="baseIndexDate" />\n',
        f'{indent}        </label>\n',
        f'{indent}        <DatePicker\n',
        f"{indent}            value={{formData.baseIndexDate ? parseISO(formData.baseIndexDate) : undefined}}\n",
        f"{indent}            onChange={{(date) => setValue('baseIndexDate', date ? format(date, 'yyyy-MM-dd') : '')}}\n",
        f'{indent}            className="w-full text-sm"\n',
        f'{indent}        />\n',
        f'{indent}    </div>\n',
        f'{indent}</div>\n',
        '\n'
    ]
    
    # We want to keep the "{/* Index Type" line (lines[end_idx])
    final_lines = lines[:start_idx] + new_block + lines[end_idx:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(final_lines)
    print(f"Successfully updated indexation block at lines {start_idx+1}-{end_idx+1}")
else:
    print(f"Failed to find indices. Start: {start_idx}, End: {end_idx}")
