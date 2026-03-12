import sys

def patch_file():
    with open('supabase/functions/chat-support/index.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update tool executions in the main switch block
    replacements = [
        ("searchContracts(functionArgs.query, userId)", "searchContracts(functionArgs.query, userId, hasAiConsent)"),
        ("getFinancialSummary(functionArgs.period, userId, functionArgs.currency)", "getFinancialSummary(functionArgs.period, userId, functionArgs.currency, hasAiConsent)"),
        ("getTenantDetails(functionArgs.name_or_email, userId)", "getTenantDetails(functionArgs.name_or_email, userId, hasAiConsent)"),
        ("listProperties(userId)", "listProperties(userId, hasAiConsent)"),
        ("listFolders(functionArgs.property_id, userId)", "listFolders(functionArgs.property_id, userId, hasAiConsent)"),
        ("organizeDocument(functionArgs, userId)", "organizeDocument(functionArgs, userId, hasAiConsent)"),
        ("calculateRentLinkage(functionArgs, userId)", "calculateRentLinkage(functionArgs, userId, hasAiConsent)"),
        ("debugEntity(functionArgs, userId)", "debugEntity(functionArgs, userId, hasAiConsent)"),
        ("checkExpiringContracts(daysThreshold, userId)", "checkExpiringContracts(daysThreshold, userId, hasAiConsent)")
    ]
    
    # 2. Update function signatures
    replacements += [
        ("async function searchContracts(query: string, userId: string)", "async function searchContracts(query: string, userId: string, hasAiConsent?: boolean)"),
        ("async function getFinancialSummary(period: string, userId: string, currency: string = 'ILS')", "async function getFinancialSummary(period: string, userId: string, currency: string = 'ILS', hasAiConsent?: boolean)"),
        ("async function checkExpiringContracts(daysThreshold: number, userId: string)", "async function checkExpiringContracts(daysThreshold: number, userId: string, hasAiConsent?: boolean)"),
        ("async function getTenantDetails(nameOrEmail: string, userId: string)", "async function getTenantDetails(nameOrEmail: string, userId: string, hasAiConsent?: boolean)"),
        ("async function listProperties(userId: string)", "async function listProperties(userId: string, hasAiConsent?: boolean)"),
        ("async function listFolders(propertyId: string, userId: string)", "async function listFolders(propertyId: string, userId: string, hasAiConsent?: boolean)"),
        ("async function organizeDocument(args: any, userId: string)", "async function organizeDocument(args: any, userId: string, hasAiConsent?: boolean)"),
        ("async function calculateRentLinkage(args: any, userId: string)", "async function calculateRentLinkage(args: any, userId: string, hasAiConsent?: boolean)"),
        ("async function debugEntity(args: any, userId: string)", "async function debugEntity(args: any, userId: string, hasAiConsent?: boolean)")
    ]

    # 3. Update inner checkConsent calls
    # Since we want to pass hasAiConsent to checkConsent everywhere it's called inside those functions
    replacements.append(("const hasConsent = await checkConsent(userId, supabase);", "const hasConsent = await checkConsent(userId, supabase, hasAiConsent);"))

    for old, new_text in replacements:
        if old in content:
            content = content.replace(old, new_text)
            print(f"Replaced: {old[:30]}...")
        else:
            print(f"WARNING: Could not find: {old[:30]}...")

    with open('supabase/functions/chat-support/index.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
if __name__ == '__main__':
    patch_file()
