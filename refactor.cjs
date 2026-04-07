const fs = require('fs');
const path = 'src/components/stack/ContractHub.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file currently has:
// 1. Header (lines start to 1170)
// 2. Contract Dates Section
// 3. Payments & Linkage Section (I swapped this!)
// 4. Options & Extensions Section
// 5. Security & Extras Section

// In my script I will parse these out using predictable strings.

// ---------------------------------------------------------
// -- SECTION 3: Contract Dates
// ---------------------------------------------------------
const s3_start = "        {/* 3. Contract Dates Section */}";
const s3_end_str = `              )}
            </div>
          </CardContent>
        </Card>`;

let s3_start_idx = content.indexOf(s3_start);
let s3_end_idx = content.indexOf(s3_end_str, s3_start_idx) + s3_end_str.length;
const s3_content = content.substring(s3_start_idx, s3_end_idx);

// ---------------------------------------------------------
// -- SECTION 4: Payments & Linkage
// ---------------------------------------------------------
const s4_start = "        {/* 5. Payments & Linkage Section */}";
// Section 4 ends exactly where Section 4 Options starts.
const s5_start = "        {/* 4. Options & Extensions Section */}";
let s4_start_idx = content.indexOf(s4_start);
let s5_start_idx = content.indexOf(s5_start);

const s4_content = content.substring(s4_start_idx, s5_start_idx);

// ---------------------------------------------------------
// -- SECTION 5: Options & Extensions
// ---------------------------------------------------------
const s6_start = "        {/* 6. Security & Extras Section */}";
let s6_start_idx = content.indexOf(s6_start);

const s5_content = content.substring(s5_start_idx, s6_start_idx);

if (s3_start_idx === -1 || s4_start_idx === -1 || s5_start_idx === -1 || s6_start_idx === -1) {
    console.error("Missing a section marker!");
    process.exit(1);
}

// Extract top and bottom parts:
const top_part = content.substring(0, s3_start_idx);
const bottom_part = content.substring(s6_start_idx);

// =========================================================
// Rework S3 combined with S5 (Contract Dates + Options)
// =========================================================
let new_s3 = s3_content;
// Strip the closing tags from s3
new_s3 = new_s3.replace(`              )}
            </div>
          </CardContent>
        </Card>`, `              )}
            </div>`);

// Modify s5 content to remove outer card
let new_s5 = s5_content;
new_s5 = new_s5.replace(`        {/* 4. Options & Extensions Section */}
        {(formData.option_periods.length > 0 || !readOnly) && (
          <Card className="rounded-2xl border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden">
            <CardContent className="p-0">`, `            {/* Option Periods appended into Contract Dates Section */}
            {(formData.option_periods.length > 0 || !readOnly) && (
              <div className="border-t border-slate-100 dark:border-neutral-800">`);

new_s5 = new_s5.replace(`              </div>
            </CardContent>
          </Card>
        )}`, `              </div>
            </div>
          )}`);

// Finish closing tags of combined s3:
let combined_s3_s5 = new_s3 + "\n" + new_s5 + `          </CardContent>\n        </Card>\n\n`;

// =========================================================
// Rework S4 (Payments + Linkage)
// =========================================================
let new_s4 = s4_content;

// 1. Swap the outer structure of s4
const pay_start_regex = "        \\{\\/\\* 5. Payments & Linkage Section \\*\\/} \n\\s*<div className=\"space\\-y\\-4\">\n\\s*<div className=\"flex justify\\-start items\\-center gap\\-3 pb\\-2 border\\-b border\\-border\\/50 mb\\-2\">\n\\s*<div className=\"w\\-10 h\\-10 rounded\\-\\[12px\\] bg\\-slate\\-100 dark:bg\\-neutral\\-800 flex items\\-center justify\\-center text\\-brand\\-600 dark:text\\-brand\\-400\">\n\\s*<Coins className=\"w\\-5 h\\-5 pointer\\-events\\-none\" \\/>\n\\s*<\\/div>\n\\s*<div className=\"flex flex\\-col items\\-end\">\n\\s*<h3 className=\"font\\-bold text\\-\\[18px\\] text\\-brand\\-600 dark:text\\-brand\\-400 mb\\-0\">\\{t\\(\"paymentDetails\"\\)\\}<\\/h3>\n\\s*<\\/div>\n\\s*<\\/div>\n\n\\s*<div className=\"grid grid\\-cols\\-1 md:grid\\-cols\\-2 gap\\-6\">\n\\s*\\{\\/\\* Base Payment Info \\*\\/\\}\n\\s*<Card className=\"rounded\\-2xl border\\-0 shadow\\-\\[0_4px_24px_rgba\\(13,71,161,0.06\\)\\] overflow\\-hidden\">\n\\s*<CardContent className=\"p\\-0\">\n\\s*<div className=\"p\\-6\">";

const pay_replace = `        {/* Payments & Linkage Section combined */}
        <Card className="rounded-2xl border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden mb-6">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-6 pb-2 flex justify-start items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Coins className="w-5 h-5 pointer-events-none" />
              </div>
              <div className="flex flex-col items-start text-start">
                <h3 className="font-bold text-[18px] text-brand-600 dark:text-brand-400 mb-0">
                  {lang === 'he' ? "פרטי תשלום והצמדה" : "Payment Details & Linkage"}
                </h3>
              </div>
            </div>

            <div className="p-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8 md:divide-x md:divide-x-reverse divide-slate-100 dark:divide-neutral-800 relative">
              
              {/* Base Payment Info */}
              <div className="space-y-4">`;

// Instead of string replaces, let's extract block by block if possible.
// Because formatting is hard to match exactly if a single space is off.

// Find exactly where Rent steps start
let rent_idx = s4_content.indexOf("{/* 5.5 Rent Steps Section (Moved inside card) */}");
let base_pay_content = s4_content.substring(
    s4_content.indexOf('<div className="p-6">') + '<div className="p-6">'.length,
    rent_idx
);

let rent_steps_content = s4_content.substring(rent_idx, s4_content.indexOf('                  )}', rent_idx) + '                  )}'.length);

let linkage_idx = s4_content.indexOf('{/* Linkage Info */}');
let linkage_content = s4_content.substring(
    s4_content.indexOf('<div className="p-6">', linkage_idx) + '<div className="p-6">'.length,
    s4_content.indexOf('                      </>\n                    )}\n                  </div>\n                </CardContent>\n              </Card>\n            )}\n          </div>\n        </div>', linkage_idx)
);

// If extraction failed, throw error.
if(rent_idx === -1 || linkage_idx === -1) {
   console.error("Failed to parse blocks of S4");
   process.exit(1);
}

// Build the robust combined card for S4:
let combined_s4 = `        {/* 4. Payments & Linkage Section Combined */}
        <Card className="rounded-2xl border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden mb-6">
          <CardContent className="p-0">
            {/* Header */}
            <div className="bg-slate-50/30 dark:bg-neutral-900/10 p-6 pb-4 flex justify-start items-center gap-3 border-b border-slate-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Coins className="w-5 h-5 pointer-events-none" />
              </div>
              <div className="flex flex-col items-start text-start">
                <h3 className="font-bold text-[18px] text-brand-600 dark:text-brand-400 mb-0">
                  {lang === 'he' ? "פרטי תשלום והצמדה" : "Payment & Linkage Details"}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              
              {/* Base Payment Column */}
              <div className="p-6 md:border-l border-slate-100 dark:border-neutral-800 flex flex-col gap-4">
                 ${base_pay_content.trim()}
              </div>

              {/* Linkage Column */}
              {(!readOnly || formData.linkage_type !== "none") && (
                <div className="p-6 flex flex-col gap-4">
                 ${linkage_content.trim()}
                      </>
                    )}
                </div>
              )}
            </div>

            {/* Rent Steps Section */}
            ${rent_steps_content ? `
            <div className="border-t border-slate-100 dark:border-neutral-800 p-6">
                 ${rent_steps_content.trim()}
            </div>
            ` : ""}
          </CardContent>
        </Card>
`;

// Now construct the final file:
// The order should be: top_part + combined_s3_s5 + combined_s4 + bottom_part
// Because we already moved Options out, and we want S3_S5 (Contract Dates + Options) before S4 (Payments&Linkage).
const final_content = top_part + combined_s3_s5 + combined_s4 + bottom_part;

fs.writeFileSync(path, final_content);
console.log('ContractHub structured successfully!');
