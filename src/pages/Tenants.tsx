import { useTranslation } from '../hooks/useTranslation';

export default function Tenants() {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black tracking-tighter uppercase">{t('tenants')}</h1>
                <p className="text-muted-foreground">{t('comingSoon')}</p>
            </div>
        </div>
    );
}
