import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertTitle, Box, IconButton, Badge, Drawer, List, ListItem, ListItemText, Typography, Chip, Divider } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import { useNotifications, Notification, getNotificationIcon, getNotificationColor } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

interface NotificationContextType {
    isConnected: boolean;
    notifications: Notification[];
    unreadCount: number;
    showDrawer: boolean;
    setShowDrawer: (show: boolean) => void;
    subscribe: (leadId: string) => void;
    unsubscribe: (leadId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationContext must be used within NotificationProvider');
    }
    return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const [showDrawer, setShowDrawer] = useState(false);
    const [currentToast, setCurrentToast] = useState<Notification | null>(null);
    const [toastOpen, setToastOpen] = useState(false);

    const handleNotification = useCallback((notification: Notification) => {
        // Show toast for high priority notifications
        if (notification.priority === 'high' || notification.priority === 'urgent') {
            setCurrentToast(notification);
            setToastOpen(true);
        }
    }, []);

    const { isConnected, notifications, subscribe, unsubscribe } = useNotifications({
        onNotification: handleNotification,
    });

    const handleToastClose = () => {
        setToastOpen(false);
    };

    const handleToastClick = () => {
        if (currentToast?.leadId) {
            navigate(`/leads/${currentToast.leadId}`);
        }
        setToastOpen(false);
    };

    const unreadCount = notifications.filter(n =>
        n.priority === 'high' || n.priority === 'urgent'
    ).length;

    return (
        <NotificationContext.Provider value={{
            isConnected,
            notifications,
            unreadCount,
            showDrawer,
            setShowDrawer,
            subscribe,
            unsubscribe,
        }}>
            {children}

            {/* Toast for urgent notifications */}
            <Snackbar
                open={toastOpen}
                autoHideDuration={6000}
                onClose={handleToastClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    severity={currentToast?.priority === 'urgent' ? 'error' : 'info'}
                    onClose={handleToastClose}
                    onClick={handleToastClick}
                    sx={{ cursor: 'pointer', minWidth: 300 }}
                >
                    <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{getNotificationIcon(currentToast?.type || '')}</span>
                        {currentToast?.title}
                    </AlertTitle>
                    {currentToast?.message}
                </Alert>
            </Snackbar>

            {/* Notification Drawer */}
            <NotificationDrawer
                open={showDrawer}
                onClose={() => setShowDrawer(false)}
                notifications={notifications}
            />
        </NotificationContext.Provider>
    );
}

// Notification Bell Button
export function NotificationBell() {
    const { unreadCount, setShowDrawer, isConnected } = useNotificationContext();

    return (
        <IconButton
            color="inherit"
            onClick={() => setShowDrawer(true)}
            sx={{ position: 'relative' }}
        >
            <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
            </Badge>
            {/* Connection indicator */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isConnected ? 'success.main' : 'error.main',
                }}
            />
        </IconButton>
    );
}

// Notification Drawer
function NotificationDrawer({
    open,
    onClose,
    notifications
}: {
    open: boolean;
    onClose: () => void;
    notifications: Notification[];
}) {
    const navigate = useNavigate();

    const handleNotificationClick = (notification: Notification) => {
        if (notification.leadId) {
            navigate(`/leads/${notification.leadId}`);
            onClose();
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: 360 } }}
        >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Notifications</Typography>
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <Divider />

            {notifications.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        No notifications yet
                    </Typography>
                </Box>
            ) : (
                <List sx={{ pt: 0 }}>
                    {notifications.map((notification, index) => (
                        <React.Fragment key={index}>
                            <ListItem
                                button
                                onClick={() => handleNotificationClick(notification)}
                                sx={{
                                    borderLeft: 3,
                                    borderColor: getNotificationColor(notification.priority),
                                }}
                            >
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <span>{getNotificationIcon(notification.type)}</span>
                                            <Typography variant="subtitle2">
                                                {notification.title}
                                            </Typography>
                                            {notification.priority === 'urgent' && (
                                                <Chip label="Urgent" color="error" size="small" />
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <>
                                            <Typography variant="body2" color="text.secondary">
                                                {notification.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                {new Date(notification.timestamp).toLocaleTimeString()}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            )}
        </Drawer>
    );
}
