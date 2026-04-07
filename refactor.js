const fs = require('fs');

const path = 'src/components/stack/ContractHub.tsx';
let content = fs.readFileSync(path, 'utf8');

// Goal 1: combine Contract Dates (Section 3) and Option Periods (Section 4 now)
// Contract dates ends with:
const cd_end_marker = `                </div>
              )}
            </div>
          </CardContent>
        </Card>`;

const cd_replacement = `                </div>
              )}
            </div>`;

content = content.replace(cd_end_marker, cd_replacement);

const op_start_marker = `        {/* 4. Options & Extensions Section */}
        {(formData.option_periods.length > 0 || !readOnly) && (
          <Card className="rounded-2xl border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden">
            <CardContent className="p-0">`;

const op_replacement = `            {/* 4. Options & Extensions Section */}
            {(formData.option_periods.length > 0 || !readOnly) && (
              <div className="border-t border-slate-100 dark:border-neutral-800">`;

content = content.replace(op_start_marker, op_replacement);

const op_end_marker = `              </div>
            </CardContent>
          </Card>
        )}`;

const op_end_replacement = `              </div>
            </div>
          )}

          </CardContent>
        </Card>`;

content = content.replace(op_end_marker, op_end_replacement);

// Now Goal 2: combine Payments & Linkage
// Currently wrapped in:
const pay_start_marker = `        {/* 5. Payments & Linkage Section */}
        <div className="space-y-4">
          <div className="flex justify-start items-center gap-3 pb-2 border-b border-border/50 mb-2">
            <div className="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Coins className="w-5 h-5 pointer-events-none" />
            </div>
            <div className="flex flex-col items-end">
              <h3 className="font-bold text-[18px] text-brand-600 dark:text-brand-400 mb-0">{t("paymentDetails")}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Payment Info */}
            <Card className="rounded-2xl border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">`;

const pay_replacement = `        {/* 5. Payments & Linkage Section */}
        <Card className="rounded-2xl border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-6 pb-2 flex justify-start items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Coins className="w-5 h-5 pointer-events-none" />
              </div>
              <div className="flex flex-col items-end">
                <h3 className="font-bold text-[18px] text-brand-600 dark:text-brand-400 mb-0">
                  {lang === 'he' ? "פרטי תשלום והצמדה" : "Payment & Linkage Details"}
                </h3>
              </div>
            </div>

            <div className="p-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100 dark:divide-neutral-800">
              
              {/* Base Payment Info */}
              <div className="space-y-4 w-full">`;

content = content.replace(pay_start_marker, pay_replacement);

const rent_steps_start = `                  {/* 5.5 Rent Steps Section (Moved inside card) */}`;
const rent_steps_replacement = `              </div>
              
              {/* Rent Steps Section */}
              <div className="w-full col-span-1 md:col-span-2 pt-6 border-t border-slate-100 dark:border-neutral-800">
                  {/* 5.5 Rent Steps Section (Moved inside card) */}`;

content = content.replace(rent_steps_start, rent_steps_replacement);


const pay_linkage_split = `                  )}
                </div>
              </CardContent>
            </Card>

            {/* Linkage Info */}
            {(!readOnly || formData.linkage_type !== "none") && (
              <Card className="rounded-2xl border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">`;

const pay_linkage_replacement = `                  )}
              </div>

            {/* Linkage Info */}
            {(!readOnly || formData.linkage_type !== "none") && (
              <div className="space-y-4 w-full pt-6 md:pt-0">`;

content = content.replace(pay_linkage_split, pay_linkage_replacement);


const pay_end = `                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>`;

const pay_end_replacement = `                      </>
                    )}
                  </div>
            )}
            </div>
          </CardContent>
        </Card>`;

content = content.replace(pay_end, pay_end_replacement);

// Finally, we need to swap Section 4 and Section 5 back because the user wants "Option Periods" underneath "Contract Dates" which actually makes it inside Section 3!
// Wait! I already moved Option Periods to be AFTER Payments in the last prompt.
// Now the user says: "תקופת החוזה and תקופות אופציה section should be combined into 1 section"
// This means we need to CUT the "Options" block (which currently sits below Payments) and PASTE it back into Section 3!

// Let's do that cleanly.
// Currently content has Options at the bottom.
// We will extract Options from the bottom and append it inside Section 3.

fs.writeFileSync(path, content);
console.log('Script updated successfully');
