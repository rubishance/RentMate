
type ChatEventType = 'OPEN_CHAT' | 'SEND_MESSAGE' | 'FILE_UPLOADED';

interface ChatEvent {
    type: ChatEventType;
    payload?: any;
}

type ChatListener = (event: ChatEvent) => void;

class ChatEventBus {
    private listeners: ChatListener[] = [];

    subscribe(listener: ChatListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    emit(type: ChatEventType, payload?: any) {
        this.listeners.forEach(l => l({ type, payload }));
    }
}

export const chatBus = new ChatEventBus();
