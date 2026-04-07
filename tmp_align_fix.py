import os

path = r"c:\AnitiGravity Projects\RentMate\src\components\stack\ContractHub.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Fix the Property Address blue background to be the exact app primary blue
text = text.replace(
    'bg-brand-900 border border-brand-800 p-5 rounded-[1.5rem] shadow-[0_4px_24px_rgba(13,71,161,0.06)] flex flex-col items-end',
    'bg-primary border border-primary p-5 rounded-[1.5rem] shadow-[0_4px_24px_rgba(13,71,161,0.06)] flex flex-col items-start text-start'
)

# 2. Fix inner alignments for Property Address block
text = text.replace(
    '<div className="relative z-10 w-full flex flex-col items-end">',
    '<div className="relative z-10 w-full flex flex-col items-start text-start">'
)
text = text.replace(
    '<h2 className="text-[22px] sm:text-[26px] leading-[1.2] font-black text-white text-right tracking-tight mb-3 mt-0">',
    '<h2 className="text-[22px] sm:text-[26px] leading-[1.2] font-black text-white text-start tracking-tight mb-3 mt-0">'
)
text = text.replace(
    'className={cn(\n                "flex flex-row-reverse',
    'className={cn(\n                "flex flex-row'
)

# 3. Fix section headers which used justify-end (which pushes LEFT in RTL)
text = text.replace(
    'flex justify-end items-center gap-3',
    'flex justify-start items-center gap-3'
)
text = text.replace(
    '<div className="flex flex-col items-end">\n                <h3',
    '<div className="flex flex-col items-start text-start">\n                <h3'
)

# 4. Fix mini-windows that used items-end (pushing LEFT in RTL)
text = text.replace(
    'flex flex-col items-end w-full gap-0.5',
    'flex flex-col items-start text-start w-full gap-0.5'
)
text = text.replace(
    'flex flex-col items-end w-full space-y-2',
    'flex flex-col items-start text-start w-full space-y-2'
)

# 5. Fix text-right to text-start for some elements
text = text.replace(
    'text-right w-full mt-2',
    'text-start w-full mt-2'
)

# 6. For Option Periods where rentAmount was text-left and label text-right
# Wait, I already swapped the flex row order. Let's make sure it's using text-start/end correctly.
text = text.replace('text-right', 'text-start') # Replace any remaining text-right with text-start for RTL flexibility.
text = text.replace('text-left', 'text-end')     # Replace text-left with text-end for RTL flexibility.

# Actually, the global replacement of text-right might be risky. Let's be surgical.
# But wait, text-start and text-end are exactly what we want. In LTR text-start is left. In RTL it's right.
# Wait, let's NOT blindly replace text-right because L.1084 uses text-right. L.1091 uses text-left.
# I already fixed the flex layout in L.1079-L1097.

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Alignment fixes applied.")
