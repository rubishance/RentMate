import re
import sys
import os

def sanitize_sql_functions(sql_content):
    # Matches: CREATE [OR REPLACE] FUNCTION name ( params )
    # Including support for multiline params and various spacings
    pattern = re.compile(r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w\.]+)\s*\((.*?)\)", re.IGNORECASE | re.DOTALL)
    
    def get_types_only(params_str):
        if not params_str.strip():
            return ""
            
        params = []
        current_param = ""
        paren_count = 0
        for char in params_str:
            if char == '(' : paren_count += 1
            if char == ')' : paren_count -= 1
            if char == ',' and paren_count == 0:
                params.append(current_param.strip())
                current_param = ""
            else:
                current_param += char
        if current_param.strip():
            params.append(current_param.strip())
            
        types = []
        for p in params:
            # A parameter can be: [IN|OUT|INOUT|VARIADIC] [name] type [DEFAULT val]
            # We want to strip DEFAULT and names.
            
            # 1. Remove DEFAULT and everything after it
            p = re.sub(r"\s+DEFAULT\s+.*$", "", p, flags=re.IGNORECASE | re.DOTALL)
            
            # 2. Split by whitespace and examine parts
            # We need to distinguish between [mode] [name] type
            parts = p.split()
            if not parts: continue
            
            # Modes list
            modes = {'IN', 'OUT', 'INOUT', 'VARIADIC'}
            
            # If the first part is a mode, skip it?
            # Actually, DROP FUNCTION usually only needs the types. 
            # But it needs the argmodes if there are OUT parameters? 
            # "The argument types of the function (if any), as a comma-separated list."
            # "OUT arguments are NOT part of the signature." 
            
            # So we only want the types of IN, INOUT, or VARIADIC parameters.
            # But most of these migrations don't use complex modes.
            
            # If there's 3 parts: [MODE] [NAME] TYPE
            # If there's 2 parts: [NAME] TYPE or [MODE] TYPE
            # if there's 1 part: TYPE
            
            # Heuristic: the LAST word (after stripping default) is almost always the TYPE.
            # (Unless it's something like "integer[]" which is one word).
            type_part = parts[-1]
            types.append(type_part)
            
        return ", ".join(types)

    def replace_func(match):
        func_name = match.group(1)
        params_str = match.group(2)
        
        # Get purely types for the DROP signature
        drop_types = get_types_only(params_str)
        
        # Construct the safe block
        # We use CASCADE to handle dependencies (like triggers or views)
        return f"DROP FUNCTION IF EXISTS {func_name}({drop_types}) CASCADE;\n{match.group(0)}"

    return pattern.sub(replace_func, sql_content)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sanitize_sql.py <file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Clean up any previous broken drop statements I added
    content = re.sub(r"DROP\s+FUNCTION\s+IF\s+EXISTS\s+.*?CASCADE;\s*(?=CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION)", "", content, flags=re.IGNORECASE | re.DOTALL)
    
    new_content = sanitize_sql_functions(content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Sanitized {file_path}")
