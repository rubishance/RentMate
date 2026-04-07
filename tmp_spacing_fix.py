import os
import re

path = r"c:\AnitiGravity Projects\RentMate\src\components\stack\ContractHub.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Option Periods formatting
# Replace title styling
text = text.replace(
    'className="font-bold text-sm text-brand-900 dark:text-white border-b border-transparent"',
    'className="font-bold text-[15px] text-brand-600 dark:text-brand-400 leading-none"'
)
# Replace date styling
text = text.replace(
    'className="text-xs text-muted-foreground opacity-80 mt-0.5 border-b border-transparent"',
    'className="text-[13px] font-medium text-muted-foreground leading-none mt-1"'
)

# Wait, the user said "this is the spacing i want" for all? "make it consistent and small"
# Let's adjust all the mini-windows for Tenant Details, Contract Dates, and Payments & Linkage to have gap-1 or gap-0.5, and tight leading.
text = text.replace(
    'gap-0.5',
    'gap-0.5'
)
# Let's make the paragraph titles inside the mini windows tighter
text = text.replace(
    'text-xs text-muted-foreground font-medium flex items-center justify-start gap-1.5',
    'text-[13px] text-muted-foreground font-medium flex items-center justify-start gap-1.5 leading-none'
)
text = text.replace(
    'text-xs text-muted-foreground font-medium block',
    'text-[13px] text-muted-foreground font-medium block leading-none'
)
text = text.replace(
    '<p className="text-xs text-muted-foreground font-medium">',
    '<p className="text-[13px] text-muted-foreground font-medium leading-none">'
)
text = text.replace(
    '<span className="text-xs text-muted-foreground font-medium">',
    '<span className="text-[13px] text-muted-foreground font-medium leading-none">'
)

# And for the values:
text = text.replace(
    '<p className="font-bold text-brand-900 dark:text-white text-[16px]">',
    '<p className="font-bold text-brand-900 dark:text-white text-[15px] leading-tight mt-1">'
)
text = text.replace(
    '<p className="font-bold text-brand-900 dark:text-white">',
    '<p className="font-bold text-[15px] text-brand-900 dark:text-white leading-tight mt-1">'
)
text = text.replace(
    '<p className="font-bold text-[15px] text-brand-900 dark:text-white">',
    '<p className="font-bold text-[15px] text-brand-900 dark:text-white leading-tight mt-1">'
)
text = text.replace(
    '<p className="font-bold text-[16px] text-brand-900 dark:text-white">',
    '<p className="font-bold text-[15px] text-brand-900 dark:text-white leading-tight mt-1">'
)

text = text.replace(
    '<span className="text-[15px] font-medium text-brand-900 dark:text-white whitespace-pre-wrap leading-relaxed text-start">',
    '<span className="text-[15px] font-medium text-brand-900 dark:text-white whitespace-pre-wrap leading-tight text-start mt-1">'
)

# Fix Rent Steps the same way as Option Periods
text = text.replace(
    'className="font-bold text-sm text-brand-900 dark:text-white border-b border-transparent"',
    'className="font-bold text-[15px] text-brand-600 dark:text-brand-400 leading-none"'
)
text = text.replace(
    'className="text-xs text-muted-foreground opacity-80 mt-0.5 border-b border-transparent"',
    'className="text-[13px] font-medium text-muted-foreground leading-none mt-1"'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated tighter spacing applied to ContractHub.tsx")
