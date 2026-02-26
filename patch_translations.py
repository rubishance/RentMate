import re
import sys

def patch_file():
    filepath = 'src/hooks/useTranslation.ts'
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 1. Add to TranslationKeys
        keys_to_add = """
    // Missing Payment UI Keys
    | 'cardsView'
    | 'tableView'
    | 'actionNeeded'
    | 'upcomingAndPaid'
    | 'unnamedTenant'"""

        if "'cardsView'" not in content:
            content = content.replace(
                "    // Payments Page\n    | 'paymentsTitle'",
                keys_to_add + "\n    // Payments Page\n    | 'paymentsTitle'"
            )

        # 2. Add to he object
        he_keys = """
        // Missing Payment UI Keys
        cardsView: 'תצוגת כרטיסיות',
        tableView: 'תצוגת טבלה',
        actionNeeded: 'לטיפולך',
        upcomingAndPaid: 'קרובים ושולמו',
        unnamedTenant: 'דייר ללא שם',
"""
        if "cardsView: 'תצוגת כרטיסיות'" not in content:
            content = content.replace(
                "        // Payments Page\n        paymentsTitle: 'תשלומים',",
                he_keys + "        // Payments Page\n        paymentsTitle: 'תשלומים',"
            )

        # 3. Add to en object (End of en object)
        en_keys = """
        cardsView: 'Cards View',
        tableView: 'Table View',
        actionNeeded: 'Action Needed',
        upcomingAndPaid: 'Upcoming & Paid',
        unnamedTenant: 'Unnamed Tenant',
"""
        if "cardsView: 'Cards View'" not in content:
            # Find the end of `en` object
            content = content.replace(
                "        errorSavingPayments: 'Error saving payments',",
                "        errorSavingPayments: 'Error saving payments',\n" + en_keys
            )

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print("Translation patch completed successfully.")
        
    except Exception as e:
        print(f"Error patching file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    patch_file()
