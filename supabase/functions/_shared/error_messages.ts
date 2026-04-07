// _shared/error_messages.ts

export const HTTP_ERRORS_HEBREW: Record<number, string> = {
    400: 'בקשה לא תקינה. אנא ודא שכל הנתונים הוכנסו כשורה.',
    401: 'אין לכם הרשאה לביצוע פעולה זו. אנא התחברו מחדש.',
    403: 'הגישה נדחתה. הפעולה נחסמה עקב הרשאות חסרות.',
    404: 'המשאב המבוקש לא נמצא.',
    409: 'קיימת התנגשות נתונים, הפעולה לא הושלמה.',
    429: 'עברתם את הקצב המותר. אנא המתינו מספר שניות ונסו שוב.',
    500: 'שגיאת שרת פנימית. הצוות שלנו קיבל דיווח על כך.'
};

export const ZOD_ERRORS_HEBREW: Record<string, string> = {
    'too_small': 'הערך שהוזן קצר מדי.',
    'too_big': 'הערך שהוזן ארוך מדי.',
    'invalid_type': 'סוג נתונים לא תקין.',
    'invalid_string': 'הפורמט שהוכנס אינו חוקי.',
    'invalid_enum_value': 'הערך שנבחר אינו מתוך רשימת האפשרויות המותרת.',
    'invalid_union': 'הערך לא תואם אף אחד מהסוגים האפשריים.',
    'invalid_date': 'תאריך לא חוקי.',
    'custom': 'שגיאת נתונים מותאמת אישית.',
};

/**
 * Returns a friendly Hebrew message based on the status code and an optional Zod error string.
 */
export function getFriendlyErrorMessage(statusCode: number, systemError: string = ''): string {
    // Check if it's a known Zod error code inside the string (simple substring match for edge reporting)
    for (const [zodCode, hebMessage] of Object.entries(ZOD_ERRORS_HEBREW)) {
        if (systemError.includes(zodCode)) {
            return hebMessage;
        }
    }

    // Default to HTTP code
    if (HTTP_ERRORS_HEBREW[statusCode]) {
        return HTTP_ERRORS_HEBREW[statusCode];
    }

    return 'אירעה שגיאה בלתי צפויה. אנא הרעננו את העמוד ונסו שוב.';
}
