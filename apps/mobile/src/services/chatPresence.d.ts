import { Socket } from 'socket.io-client';
export declare function connectChatPresence(token: string, businessId?: string | null): Socket<import("@socket.io/component-emitter").DefaultEventsMap, import("@socket.io/component-emitter").DefaultEventsMap> | null;
export declare function disconnectChatPresence(): void;
