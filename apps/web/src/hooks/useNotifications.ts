import { useEffect, useCallback, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export interface Notification {
    type: 'LEAD_UPDATE' | 'NEW_LEAD' | 'EMAIL_RECEIVED' | 'MEETING_SCHEDULED' |
    'DOCUMENT_SIGNED' | 'STAGE_CHANGE' | 'HOT_LEAD' | 'TASK_REMINDER';
    title: string;
    message: string;
    data?: Record<string, any>;
    leadId?: string;
    userId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    timestamp: Date;
}

interface UseNotificationsOptions {
    onNotification?: (notification: Notification) => void;
    autoConnect?: boolean;
}

interface UseNotificationsReturn {
    isConnected: boolean;
    notifications: Notification[];
    subscribe: (leadId: string) => void;
    unsubscribe: (leadId: string) => void;
    clearNotifications: () => void;
}

// @ts-ignore - Vite env
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
    const { onNotification, autoConnect = true } = options;
    const token = useSelector((state: RootState) => state.auth.accessToken);
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const socketRef = useRef<Socket | null>(null);

    // Connect to WebSocket
    useEffect(() => {
        if (!autoConnect || !token) return;

        const socket = io(`${API_URL}/notifications`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🔌 WebSocket connected');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('🔌 WebSocket disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error.message);
        });

        socket.on('notification', (notification: Notification) => {
            console.log('📬 Notification received:', notification);

            // Add to notifications list
            setNotifications(prev => [notification, ...prev].slice(0, 50));

            // Call custom handler
            if (onNotification) {
                onNotification(notification);
            }
        });

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };
    }, [token, autoConnect, onNotification]);

    // Subscribe to a lead's updates
    const subscribe = useCallback((leadId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('subscribe:lead', { leadId });
        }
    }, []);

    // Unsubscribe from a lead's updates
    const unsubscribe = useCallback((leadId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('unsubscribe:lead', { leadId });
        }
    }, []);

    // Clear all notifications
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    return {
        isConnected,
        notifications,
        subscribe,
        unsubscribe,
        clearNotifications,
    };
}

// Priority-based styling helpers
export function getNotificationColor(priority?: string): string {
    switch (priority) {
        case 'urgent': return '#d32f2f';
        case 'high': return '#f57c00';
        case 'medium': return '#1976d2';
        case 'low': return '#388e3c';
        default: return '#1976d2';
    }
}

export function getNotificationIcon(type: string): string {
    switch (type) {
        case 'NEW_LEAD': return '👤';
        case 'HOT_LEAD': return '🔥';
        case 'EMAIL_RECEIVED': return '📧';
        case 'MEETING_SCHEDULED': return '📅';
        case 'DOCUMENT_SIGNED': return '✍️';
        case 'STAGE_CHANGE': return '📊';
        case 'TASK_REMINDER': return '⏰';
        default: return '🔔';
    }
}
