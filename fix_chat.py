import os

file_path = "c:/AnitiGravity Projects/RentMate/src/components/chat/ChatWidget.tsx"

with open(file_path, 'r', encoding='utf8') as f:
    lines = f.readlines()

# The error is nested buttons.
# lines 516 to 522 (0-indexed) contain the stray button right inside handleMenuClick.
# Let's just delete the stray button and insert it before the capital gains button.

new_lines = []
for i, line in enumerate(lines):
    if 516 <= i <= 522:
        pass # skip the nested button
    else:
        new_lines.append(line)

new_button_lines = [
    "                                                    <button onClick={() => handleMenuClick(\n",
    "                                                        'אילו סוגי מדדים קיימים?', 'What are the different types of index?',\n",
    "                                                        'מעבר למדד המחירים לצרכן, קיימים מדדים נוספים כמו מדד תשומות הבנייה (שמשפיע לרוב על רכישת דירה מקבלן) ומדדים ענפיים אחרים. ברוב חוזי השכירות משתמשים במדד המחירים לצרכן.',\n",
    "                                                        'Besides the Consumer Price Index, there are other indices such as the Construction Inputs Index (which usually affects buying an apartment from a contractor). Most rental contracts use the Consumer Price Index.'\n",
    "                                                    )} className=\"w-full text-start p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-sm font-medium transition-colors border border-transparent\">\n",
    "                                                        {isRtl ? 'אילו סוגי מדדים קיימים?' : 'What are the different types of index?'}\n",
    "                                                    </button>\n"
]

# Insert the button before line 514 (which is index 513)
# The capital gains button starts at index 513
for i, line in reversed(list(enumerate(new_button_lines))):
    new_lines.insert(513, line)

with open(file_path, 'w', encoding='utf8') as f:
    f.writelines(new_lines)

print("Fixed ChatWidget.tsx syntax error!")
