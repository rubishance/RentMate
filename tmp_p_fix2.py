import re

path = r"c:\AnitiGravity Projects\RentMate\src\components\stack\ContractHub.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Tenant Details <p> -> <div>
text = text.replace(
    '<p className="text-[13px] text-muted-foreground font-medium flex items-center justify-start gap-1.5 leading-none">',
    '<div className="text-[13px] text-muted-foreground font-medium flex items-center justify-start gap-1.5 leading-none m-0">'
)
text = text.replace(
    '<p className="font-bold text-[15px] text-brand-900 dark:text-white leading-tight mt-1">',
    '<div className="font-bold text-[15px] text-brand-900 dark:text-white leading-tight mt-1 m-0">'
)
text = text.replace(
    '</p>\n                        </div>',
    '</div>\n                        </div>'
)
text = text.replace(
    '<User className="w-3.5 h-3.5" />\n                          </p>',
    '<User className="w-3.5 h-3.5" />\n                          </div>'
)
text = text.replace(
    '<CreditCard className="w-3.5 h-3.5" />\n                          </p>',
    '<CreditCard className="w-3.5 h-3.5" />\n                          </div>'
)
text = text.replace(
    '<Phone className="w-3.5 h-3.5" />\n                          </p>',
    '<Phone className="w-3.5 h-3.5" />\n                          </div>'
)
text = text.replace(
    '<Mail className="w-3.5 h-3.5" />\n                          </p>',
    '<Mail className="w-3.5 h-3.5" />\n                          </div>'
)

# 2. Contract Dates <p> -> <div>
text = text.replace(
    '<p className="text-[13px] text-muted-foreground font-medium leading-none">',
    '<div className="text-[13px] text-muted-foreground font-medium leading-none m-0">'
)
# And the closing for contract dates is just </p> on the same line or next line.
text = text.replace(
    '<div className="text-[13px] text-muted-foreground font-medium leading-none m-0">{t("signingDate")}</p>',
    '<div className="text-[13px] text-muted-foreground font-medium leading-none m-0">{t("signingDate")}</div>'
)
text = text.replace(
    '<div className="text-[13px] text-muted-foreground font-medium leading-none m-0">{t("startDate")}</p>',
    '<div className="text-[13px] text-muted-foreground font-medium leading-none m-0">{t("startDate")}</div>'
)
text = text.replace(
    '<div className="text-[13px] text-muted-foreground font-medium leading-none m-0">{t("endDate")}</p>',
    '<div className="text-[13px] text-muted-foreground font-medium leading-none m-0">{t("endDate")}</div>'
)

# 3. Payments & Linkage <p> -> <div>
text = text.replace(
    '<p className="text-[13px] text-muted-foreground font-medium block leading-none">',
    '<div className="text-[13px] text-muted-foreground font-medium block leading-none m-0">'
)
text = text.replace(
    '<div className="text-[13px] text-muted-foreground font-medium block leading-none m-0">{t("paymentMethod") || "אמצעי תשלום"}</p>',
    '<div className="text-[13px] text-muted-foreground font-medium block leading-none m-0">{t("paymentMethod") || "אמצעי תשלום"}</div>'
)
text = text.replace(
    '<div className="text-[13px] text-muted-foreground font-medium block leading-none m-0">{t("paymentDay")}</p>',
    '<div className="text-[13px] text-muted-foreground font-medium block leading-none m-0">{t("paymentDay")}</div>'
)

# 4. Values (font-bold) have </p> on the same or next lines
text = text.replace(
    '</p>\n                  </div>',
    '</div>\n                  </div>'
)

# 5. Fix card layouts
text = text.replace(
    'rounded-2xl p-4 flex flex-col items-start',
    'rounded-[14px] p-3.5 flex flex-col items-start'
)
text = text.replace(
    'gap-4 text-start w-full mt-2',
    'gap-3 text-start w-full mt-2'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
print("Finished safe <p> tags replacements to clear margins.")
