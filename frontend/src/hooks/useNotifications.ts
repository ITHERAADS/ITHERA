import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { useSocket } from './useSocket';
import { type NotificationItem, normalizeNotification, notificationsService } from '../services/notifications';

export const useNotifications = () => {
  const { accessToken } = useAuth();
  const { socket } = useSocket(accessToken);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const [listRes, countRes] = await Promise.all([
        notificationsService.getNotifications(accessToken),
        notificationsService.getUnreadCount(accessToken)
      ]);

      if (listRes.ok) {
        setNotifications(listRes.notifications);
      }
      if (countRes.ok) {
        setUnreadCount(countRes.count);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [accessToken, fetchNotifications]);

  useEffect(() => {
    if (!socket || !accessToken) return;

    const handleNewNotification = (data: NotificationItem) => {
      const notification = normalizeNotification(data);
      setNotifications(prev => {
        if (prev.some(item => item.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      if (!notification.leida) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('notification_created', handleNewNotification);

    return () => {
      socket.off('notification_created', handleNewNotification);
    };
  }, [socket, accessToken]);

  const markAsRead = async (id: number) => {
    if (!accessToken) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await notificationsService.markAsRead(id, accessToken);
    } catch (error) {
      console.error('Error marking as read:', error);
      // Revert optimistic update ideally, omitted for brevity
    }
  };

  const markAllAsRead = async () => {
    if (!accessToken) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    setUnreadCount(0);

    try {
      await notificationsService.markAllAsRead(accessToken);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
