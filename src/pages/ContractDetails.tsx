import { useNavigate, useParams } from 'react-router-dom';
import { ContractHub } from '../components/stack/ContractHub';

export default function ContractDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // If no ID, redirect back to properties
    if (!id) {
        navigate('/properties');
        return null;
    }

    return (
        <div className="pb-24 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ContractHub will handle data fetching and display.
                 We just provide the context. */}
            <ContractHub
                contractId={id}
                initialReadOnly={true}
            />
        </div>
    );
}
