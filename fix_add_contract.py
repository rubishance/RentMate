
import re

file_path = r"c:\AnitiGravity Projects\RentMate\src\pages\AddContract.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix upload section
# Looking for {isUploading ? ( ... <Loader2 ... /> ... <Upload ... /> ) }
# Where the : part is missing
upload_pattern = r'(\{isUploading \? \(\s+<Loader2 className="w-8 h-8 text-primary animate-spin" />\s+)(<Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />\s+\)\})'
upload_replacement = r'\1) : (\n                                                                                \2'

content = re.sub(upload_pattern, upload_replacement, content)

# Fix indexation section
# We want to replace the whole div from line 1937 to 1969 approx
# Start: <div className="bg-background/80 p-4 rounded-xl border border-border/50 space-y-4">
# End: next section (Index Type)
indexation_pattern = r'(<div className="bg-background/80 p-4 rounded-xl border border-border/50 space-y-4">).*?({/\* Index Type)'
indexation_replacement = r'''\1
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-medium flex items-center gap-2">
                                                                            {t('baseDate')}
                                                                            {scannedQuotes.baseIndexDate && <Tooltip quote={scannedQuotes.baseIndexDate} />} <ConfidenceDot field="baseIndexDate" />
                                                                        </label>
                                                                        <DatePicker
                                                                            value={formData.baseIndexDate ? parseISO(formData.baseIndexDate) : undefined}
                                                                            onChange={(date) => setValue('baseIndexDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                            className="w-full text-sm"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                \2'''

content = re.sub(indexation_pattern, indexation_replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated AddContract.tsx")
