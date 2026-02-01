import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PropertyHub } from '../components/stack/PropertyHub';
import { supabase } from '../lib/supabase';
import { Property } from '../types/database';
import { useTranslation } from '../hooks/useTranslation';
import { Loader2 } from 'lucide-react';

export default function PropertyDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProperty() {
            if (!id) return;

            try {
                const { data, error } = await supabase
                    .from('properties')
                    .select('*, contracts(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setProperty(data);
            } catch (err: any) {
                console.error('Error fetching property:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchProperty();
    }, [id]);

    const handleDelete = () => {
        // After deletion, go back to the list
        navigate('/properties');
    };

    const handleSave = () => {
        // Refresh or just stay on page? 
        // PropertyHub updates state locally too, so usually fine.
        // We could also refetch here if needed.
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-500">{t('error')}</h2>
                <p className="text-muted-foreground">{error || t('propertyNotFound')}</p>
                <button
                    onClick={() => navigate('/properties')}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
                >
                    {t('goBack')}
                </button>
            </div>
        );
    }

    if (!id) return null;

    return (
        <div className="pb-24 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* We rely on PropertyHub to render the content. 
                 PropertyHub works well as a block. 
                 It acts as the "Page Content". */}
            <PropertyHub
                propertyId={id}
                property={property}
                onDelete={handleDelete}
                onSave={handleSave}
            />
        </div>
    );
}
