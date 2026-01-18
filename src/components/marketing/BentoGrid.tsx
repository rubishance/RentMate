import { GlassCard } from './GlassCard';

export function BentoGrid() {
    const features = [
        {
            title: "מדד המחירים לצרכן",
            desc: "חישוב הצמדות אוטומטי",
            icon: "ph-chart-line-up",
            color: "text-blue-400",
            img: "/assets/marketing/screens/calculator.png", // Using calculator screen as fallback for index graph
            colSpan: "md:col-span-2",
            rowSpan: "md:row-span-2"
        },
        {
            title: "סורק חוזים AI",
            desc: "מ-PDF לנתונים בשניות",
            icon: "ph-scan",
            color: "text-purple-400",
            img: "/assets/marketing/screens/contracts.png",
            colSpan: "md:col-span-2",
            rowSpan: "md:row-span-1"
        },
        {
            title: "ניהול דיירים",
            desc: "כל המידע במקום אחד",
            icon: "ph-users",
            color: "text-green-400",
            colSpan: "md:col-span-1",
            rowSpan: "md:row-span-1"
        },
        {
            title: "התראות חכמות",
            desc: "לא תפספסו אף תשלום",
            icon: "ph-bell-ringing",
            color: "text-yellow-400",
            colSpan: "md:col-span-1",
            rowSpan: "md:row-span-1"
        }
    ];

    return (
        <section className="py-24 relative">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4 text-white">הכלים שאתם צריכים</h2>
                    <p className="text-xl text-gray-400">במעטפת אחת פשוטה וחכמה</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
                    {features.map((feature, i) => (
                        <GlassCard
                            key={i}
                            className={`${feature.colSpan} ${feature.rowSpan} relative overflow-hidden group !p-0`}
                            delay={i * 0.1}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent z-0"></div>

                            <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                                <div>
                                    <div className={`text-4xl ${feature.color} mb-4 bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-md`}>
                                        <i className={`ph ${feature.icon}`}></i>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                                    <p className="text-gray-400">{feature.desc}</p>
                                </div>

                                {feature.img && (
                                    <div className="absolute -right-10 -bottom-10 w-2/3 opacity-40 group-hover:opacity-60 transition-all duration-500 transform group-hover:scale-105 rotate-3">
                                        <img src={feature.img} className="rounded-lg shadow-xl" alt={feature.title} />
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
}
