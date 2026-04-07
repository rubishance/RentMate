import os
import re

path = r"c:\AnitiGravity Projects\RentMate\src\components\stack\ContractHub.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace <p> with <div> in the read-only cards where the huge spacing was reported
# Specifically we'll replace <p className="text-[13px]... and others with <div
text = text.replace('<p className="text-[13px]', '<div className="text-[13px] m-0"')
text = text.replace('<p className="font-bold', '<div className="font-bold m-0"')

# End tags
text = text.replace('</p>', '</div>')

# Also, in the gap between the gray boxes themselves, gap-4 (16px) is a bit large, let's reduce to gap-3 (12px)
text = text.replace('gap-4 text-start w-full mt-2', 'gap-3 text-start w-full mt-2')

# Let's ensure p-4 is changed to p-3.5 or p-3 to make the boxes tighter? The user said "spacing too big in many fields".
# Maybe the paddings are too big. Let's make padding inside the mini-window p-3 (12px) instead of p-4 (16px)
text = text.replace('rounded-2xl p-4 flex flex-col items-start', 'rounded-[14px] p-3.5 flex flex-col items-start')

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Replaced <p> tags with <div> tags to remove global paragraph margins, and slightly tightened padding/gaps.")
