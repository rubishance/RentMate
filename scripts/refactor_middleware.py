import os
import re

FUNCTIONS_DIR = r"c:\AnitiGravity Projects\RentMate\supabase\functions"
EXCLUDE_LIST = ["_shared", "handle-whatsapp-inbound", "handle-stripe", "handle-voice", "legacy"]

def refactor_file(file_path, function_name):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # 1. Inject import
    if "import { withEdgeMiddleware }" not in content:
        # Find the last import
        import_match = list(re.finditer(r"^import\s+.*?;\n", content, re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            insert_pos = last_import.end()
            content = content[:insert_pos] + "import { withEdgeMiddleware } from '../_shared/middleware.ts';\n" + content[insert_pos:]
        else:
            # Fallback if no imports (rare for these functions)
            content = "import { withEdgeMiddleware } from '../_shared/middleware.ts';\n" + content
    
    # 2. Add validateAdmin for admin functions
    if function_name.startswith("admin-") or function_name in ["get-system-stats"]:
        if "validateAdmin" not in content:
            content = content.replace(
                "import { withEdgeMiddleware } from '../_shared/middleware.ts';",
                "import { withEdgeMiddleware } from '../_shared/middleware.ts';\nimport { validateAdmin } from '../_shared/auth.ts';"
            )

    # 3. Replace serve(async (req) => { with serve(withEdgeMiddleware('FUNCTION_NAME', async (req, logger) => {
    # It might be `req: Request` or just `req`
    # Also handle some spacing or async ()
    serve_pattern = r"serve\(\s*async\s*\(\s*(req.*?)\s*\)\s*=>\s*\{"
    replacement = rf"serve(withEdgeMiddleware('{function_name}', async (\1, logger) => {{"
    content = re.sub(serve_pattern, replacement, content)

    # Add extra closing parenthesis at the very end of the file for the serve block if it was modified
    # We replace `});` at the end of the file with `}));` or `});` depending on if we replaced serve.
    if re.search(serve_pattern, original_content):
        # Find the last `});` and replace with `}));`
        last_paren_idx = content.rfind("});")
        if last_paren_idx != -1:
            content = content[:last_paren_idx] + "}));" + content[last_paren_idx+3:]

    # 4. Remove manual logger instantiation
    logger_pattern = r"^\s*(?:const|let)\s+logger\s*=\s*(?:new\s+)?AnalyticsLogger[^;]+;\n*"
    content = re.sub(logger_pattern, "", content, flags=re.MULTILINE)

    # 6. Safety Note
    # We decided against parsing and replacing try/catch blocks via regex because it destructs nested braces.
    # The middleware is already designed to intercept the returned 500 responses and inject Hebrew user_message dynamically!

    # 7. Admin Guard Logic injection at the start of the handler
    if function_name.startswith("admin-"):
        # Very brute force, find the newly replaced serve block and inject the check
        serve_wrapper = rf"serve\(withEdgeMiddleware\('{function_name}', async \(req: Request, logger\) => {{"
        fallback_wrapper = rf"serve\(withEdgeMiddleware\('{function_name}', async \(req, logger\) => {{"
        
        guard_code = """
    // Verify Admin Authorization
    const authResult = await validateAdmin(req);
    if (!authResult.success) {
        throw new Error(authResult.error);
    }
"""     
        if serve_wrapper in content and "validateAdmin(req)" not in content:
            content = content.replace(serve_wrapper, serve_wrapper + guard_code)
        elif fallback_wrapper in content and "validateAdmin(req)" not in content:
            content = content.replace(fallback_wrapper, fallback_wrapper + guard_code)


    return content, content != original_content

def main():
    modified_count = 0
    first_modified_file = None

    for entry in os.listdir(FUNCTIONS_DIR):
        if entry in EXCLUDE_LIST:
            print(f"Skipping excluded: {entry}")
            continue

        func_dir = os.path.join(FUNCTIONS_DIR, entry)
        if not os.path.isdir(func_dir):
            continue

        index_file = os.path.join(func_dir, "index.ts")
        if not os.path.exists(index_file):
            print(f"No index.ts in {entry}")
            continue

        try:
            new_content, changed = refactor_file(index_file, entry)
            if changed:
                with open(index_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                modified_count += 1
                if not first_modified_file:
                    first_modified_file = index_file
                print(f"Refactored: {entry}")
        except Exception as e:
            print(f"Error processing {entry}: {e}")

    print(f"\nTotal files successfully refactored: {modified_count}")
    if first_modified_file:
        print(f"\nExample Modified File ({first_modified_file}):")
        with open(first_modified_file, 'r', encoding='utf-8') as f:
            print(f.read()[:500] + "\n... [TRUNCATED] ...")

if __name__ == "__main__":
    main()
