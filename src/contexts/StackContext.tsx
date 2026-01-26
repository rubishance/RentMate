import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// --- Types ---

export type StackLayerType =
    | 'property_hub'      // Level 1: Property Details Sheet
    | 'contract_viewer'   // Level 1: Contract Sheet
    | 'maintenance_chat'  // Level 1: Maintenance Sheet
    | 'wizard'            // Level 2: Full Screen Creation Flow
    | 'document_viewer'   // Level 2: File Preview
    | 'single_bill';      // Level 2: Bill Details

export type StackLayer = {
    id: string;
    type: StackLayerType;
    props: Record<string, any>;
    title?: string;
    isExpanded?: boolean; // If true, takes up more space / full screen
};

interface StackContextType {
    stack: StackLayer[];
    activeLayer: StackLayer | null;
    push: (type: StackLayerType, props?: any, options?: { title?: string, isExpanded?: boolean }) => void;
    pop: () => void;
    clear: () => void;
    update: (id: string, updates: Partial<StackLayer>) => void;
}

// --- Context ---

const StackContext = createContext<StackContextType | undefined>(undefined);

// --- Provider ---

export function StackProvider({ children }: { children: ReactNode }) {
    const [stack, setStack] = useState<StackLayer[]>([]);

    const push = useCallback((type: StackLayerType, props: any = {}, options: { title?: string, isExpanded?: boolean } = {}) => {
        const newLayer: StackLayer = {
            id: crypto.randomUUID(),
            type,
            props,
            title: options.title,
            isExpanded: options.isExpanded || false
        };
        setStack(prev => [...prev, newLayer]);
    }, []);

    const pop = useCallback(() => {
        setStack(prev => prev.slice(0, -1));
    }, []);

    const clear = useCallback(() => {
        setStack([]);
    }, []);

    const update = useCallback((id: string, updates: Partial<StackLayer>) => {
        setStack(prev => prev.map(layer => layer.id === id ? { ...layer, ...updates } : layer));
    }, []);

    const activeLayer = stack.length > 0 ? stack[stack.length - 1] : null;

    return (
        <StackContext.Provider value={{ stack, activeLayer, push, pop, clear, update }}>
            {children}
        </StackContext.Provider>
    );
}

// --- Hook ---

export function useStack() {
    const context = useContext(StackContext);
    if (context === undefined) {
        throw new Error('useStack must be used within a StackProvider');
    }
    return context;
}
