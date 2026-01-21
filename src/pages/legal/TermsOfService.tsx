import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { GlassCard } from '../../components/common/GlassCard';

export default function TermsOfService() {
    return (
        <div className="pb-20">
            <PageHeader
                title="תנאי שימוש"
                subtitle="Terms of Service"
            />

            <div className="container mx-auto px-4 max-w-4xl mt-6">
                <GlassCard className="p-6 md:p-8">
                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-6" dir="rtl">
                        <h2 className="text-2xl font-bold">תנאי שימוש</h2>
                        <p className="text-muted-foreground">עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}</p>

                        <p>
                            ברוכים הבאים ל-RentMate. השימוש באתר ובאפליקציה כפוף לתנאים המפורטים להלן.
                            עצם השימוש באתר מהווה הסכמה לתנאים אלו.
                        </p>

                        <h3>1. השירות</h3>
                        <p>
                            RentMate מספקת פלטפורמה לניהול נכסים, דיירים וחוזים. המערכת מספקת כלים לחישובים, הפקת חוזים ומעקב תשלומים.
                        </p>

                        <h3>2. הגבלת אחריות</h3>
                        <p>
                            השירות ניתן כמות שהוא (AS IS). אנו עושים מאמץ להבטיח את תקינות המערכת ודיוק הנתונים (כגון מדדים), אך אין אנו אחראים לכל נזק, ישיר או עקיף, שייגרם כתוצאה משימוש בשירות או הסתמכות על הנתונים.
                            באחריות המשתמש לוודא את נכונות הנתונים המשפטיים והחשבונאיים.
                        </p>

                        <h3>3. קניין רוחני</h3>
                        <p>
                            כל הזכויות באתר, בעיצוב, בקוד ובתוכן שמורות ל-RentMate. אין להעתיק, להפיץ או להשתמש בתוכן ללא אישור בכתב.
                        </p>

                        <h3>4. שינויים בתנאים</h3>
                        <p>
                            אנו שומרים לעצמנו את הזכות לשנות את תנאי השימוש מעת לעת. השינויים ייכנסו לתוקף עם פרסומם באתר.
                        </p>

                        <h3>5. סמכות שיפוט</h3>
                        <p>
                            על תנאי שימוש אלו יחולו דיני מדינת ישראל. מקום השיפוט הבלעדי בכל עניין הנוגע לשימוש באתר הינו בבתי המשפט המוסמכים בתל אביב-יפו.
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
