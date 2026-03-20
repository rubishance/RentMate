
type ChatEventType = 'OPEN_CHAT' | 'SEND_MESSAGE' | 'FILE_UPLOADED' | 'TOGGLE_CHAT' | 'UNREAD_COUNT_CHANGED';

interface ChatEvent {
    type: ChatEventType;
    payload?: any;
}

type ChatListener = (event: ChatEvent) => void;

class ChatEventBus {
    private listeners: ChatListener[] = [];
    private _unreadCount: number = 0;

    subscribe(listener: ChatListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    emit(type: ChatEventType, payload?: any) {
        if (type === 'UNREAD_COUNT_CHANGED' && typeof payload === 'number') {
            this._unreadCount = payload;
        }
        this.listeners.forEach(l => l({ type, payload }));
    }

    get unreadCount() {
        return this._unreadCount;
    }
}

export const chatBus = new ChatEventBus();
