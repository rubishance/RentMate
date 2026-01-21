import { useState } from 'react';

interface Props {
    onAccept: () => void;
    onDecline: () => void;
}

export function LegalDisclaimerModal({ onAccept, onDecline }: Props) {
    const [hasRead, setHasRead] = useState(false);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                <h2 className="text-2xl font-bold mb-4">⚠️ סורק חוזים AI - כתב ויתור משפטי</h2>

                <div className="space-y-4 text-sm">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-r-4 border-yellow-400 p-4">
                        <p className="font-bold mb-2">הודעה חשובה</p>
                        <p>
                            כלי AI זה מחלץ נתונים מהחוזה שלך <strong>לנוחיותך בלבד</strong>.
                            הוא <strong>אינו מספק</strong> ייעוץ משפטי או מאמת תאימות משפטית.
                        </p>
                    </div>

                    <div>
                        <p className="font-semibold mb-2">אתה אחראי ל:</p>
                        <ul className="list-disc pr-6 space-y-1">
                            <li>בדיקת כל המידע שחולץ לצורך דיוק</li>
                            <li>הבנת הזכויות והחובות המשפטיות שלך</li>
                            <li>התייעצות עם עורך דין מוסמך לקבלת ייעוץ משפטי</li>
                            <li>אימות כל הנתונים מול החוזה המקורי</li>
                        </ul>
                    </div>

                    <div>
                        <p className="font-semibold mb-2">ה-AI עלול:</p>
                        <ul className="list-disc pr-6 space-y-1">
                            <li>לבצע טעויות בחילוץ הנתונים</li>
                            <li>להחמיץ סעיפים חשובים בחוזה</li>
                            <li>לפרש שגוי שפה מעורפלת</li>
                            <li>להיכשל בחילוץ כל המידע הרלוונטי</li>
                        </ul>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 border-r-4 border-red-400 p-4">
                        <p className="font-bold">
                            בשימוש בכלי זה, אתה מאשר ש-RentMate ומערכת ה-AI שלה
                            אינם מספקים ייעוץ משפטי ואינם אחראים לכל טעות,
                            השמטה או תוצאה הנובעת משימוש בנתונים שחולצו.
                        </p>
                    </div>
                </div>

                <div className="mt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasRead}
                            onChange={(e) => setHasRead(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm">
                            קראתי והבנתי את כתב הויתור הזה. אני אאמת את כל הנתונים שחולצו.
                        </span>
                    </label>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onDecline}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-secondary"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={onAccept}
                        disabled={!hasRead}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        אישור והמשך
                    </button>
                </div>
            </div>
        </div>
    );
}
