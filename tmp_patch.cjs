const fs = require('fs');
let code = fs.readFileSync('supabase/functions/chat-support/index.ts', 'utf8');

// 1. Update parsed body
code = code.replace(`const { messages, conversationId } = body;`,
    `const { messages, conversationId, hasAiConsent } = body;`);

// 2. Update checkConsent function
code = code.replace(
    `async function checkConsent(userId: string, supabase: any) {`,
    `async function checkConsent(userId: string, supabase: any, clientConsent?: boolean) {\n    if (clientConsent === true) return true;`
);

// 3. Update tool executions
code = code.replace(/searchContracts\\(functionArgs\\.query, userId\\)/g, `searchContracts(functionArgs.query, userId, hasAiConsent)`);
code = code.replace(/getFinancialSummary\\(functionArgs\\.period, userId, functionArgs\\.currency\\)/g, `getFinancialSummary(functionArgs.period, userId, functionArgs.currency, hasAiConsent)`);
code = code.replace(/getTenantDetails\\(functionArgs\\.name_or_email, userId\\)/g, `getTenantDetails(functionArgs.name_or_email, userId, hasAiConsent)`);
code = code.replace(/listProperties\\(userId\\)/g, `listProperties(userId, hasAiConsent)`);
code = code.replace(/listFolders\\(functionArgs\\.property_id, userId\\)/g, `listFolders(functionArgs.property_id, userId, hasAiConsent)`);
code = code.replace(/organizeDocument\\(functionArgs, userId\\)/g, `organizeDocument(functionArgs, userId, hasAiConsent)`);
code = code.replace(/calculateRentLinkage\\(functionArgs, userId\\)/g, `calculateRentLinkage(functionArgs, userId, hasAiConsent)`);
code = code.replace(/debugEntity\\(functionArgs, userId\\)/g, `debugEntity(functionArgs, userId, hasAiConsent)`);
code = code.replace(/checkExpiringContracts\\(daysThreshold, userId\\)/g, `checkExpiringContracts(daysThreshold, userId, hasAiConsent)`);

// 4. Update tool signatures
code = code.replace(/async function searchContracts\\(query: string, userId: string\\) \\{/g, `async function searchContracts(query: string, userId: string, hasAiConsent?: boolean) {`);
code = code.replace(/async function getFinancialSummary\\(period: string, userId: string, currency: string = 'ILS'\\) \\{/g, `async function getFinancialSummary(period: string, userId: string, currency: string = 'ILS', hasAiConsent?: boolean) {`);
code = code.replace(/async function checkExpiringContracts\\(daysThreshold: number, userId: string\\) \\{/g, `async function checkExpiringContracts(daysThreshold: number, userId: string, hasAiConsent?: boolean) {`);
code = code.replace(/async function getTenantDetails\\(nameOrEmail: string, userId: string\\) \\{/g, `async function getTenantDetails(nameOrEmail: string, userId: string, hasAiConsent?: boolean) {`);
code = code.replace(/async function listProperties\\(userId: string\\) \\{/g, `async function listProperties(userId: string, hasAiConsent?: boolean) {`);
code = code.replace(/async function listFolders\\(propertyId: string, userId: string\\) \\{/g, `async function listFolders(propertyId: string, userId: string, hasAiConsent?: boolean) {`);
code = code.replace(/async function organizeDocument\\(args: any, userId: string\\) \\{/g, `async function organizeDocument(args: any, userId: string, hasAiConsent?: boolean) {`);
code = code.replace(/async function calculateRentLinkage\\(args: any, userId: string\\) \\{/g, `async function calculateRentLinkage(args: any, userId: string, hasAiConsent?: boolean) {`);
code = code.replace(/async function debugEntity\\(args: any, userId: string\\) \\{/g, `async function debugEntity(args: any, userId: string, hasAiConsent?: boolean) {`);

// 5. Update inner checkConsent calls
code = code.replace(/const hasConsent = await checkConsent\\(userId, supabase\\);/g, `const hasConsent = await checkConsent(userId, supabase, hasAiConsent);`);

fs.writeFileSync('supabase/functions/chat-support/index.ts', code);
console.log('Modified chat-support/index.ts successfully');
