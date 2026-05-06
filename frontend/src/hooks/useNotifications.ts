import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { useSocket } from './useSocket';
import { type NotificationItem, normalizeNotification, notificationsService } from '../services/notifications';

export const useNotifications = () => {
  const { accessToken, localUser } = useAuth();
  const { socket } = useSocket(accessToken);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const localUserId = localUser?.id_usuario ? Number(localUser.id_usuario) : null;

  const addNotification = useCallback((raw: Partial<NotificationItem>) => {
    const notification = normalizeNotification(raw);
    if (!notification.id) return;
    if (localUserId !== null && Number(notification.usuario_id) !== localUserId) return;

    setNotifications((prev) => {
      if (prev.some((item) => Number(item.id) === Number(notification.id))) return prev;
      return [notification, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    });

    if (!notification.leida) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [localUserId]);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const [listRes, countRes] = await Promise.all([
        notificationsService.getNotifications(accessToken),
        notificationsService.getUnreadCount(accessToken),
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
      void fetchNotifications();
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
  }, [accessToken, fetchNotifications]);

  useEffect(() => {
    if (!socket || !accessToken || localUserId === null) return;

    const handleNewNotification = (data: NotificationItem) => {
      addNotification(data);
    };

    const handleReconnectRefresh = () => {
      void fetchNotifications();
    };

    socket.on('notification_created', handleNewNotification);
    socket.on('connect', handleReconnectRefresh);
    socket.io.on('reconnect', handleReconnectRefresh);

    return () => {
      socket.off('notification_created', handleNewNotification);
      socket.off('connect', handleReconnectRefresh);
      socket.io.off('reconnect', handleReconnectRefresh);
    };
  }, [socket, accessToken, localUserId, addNotification, fetchNotifications]);

  useEffect(() => {
    if (!accessToken || localUserId === null) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, localUserId, fetchNotifications]);

  const markAsRead = async (id: number) => {
    if (!accessToken) return;

    const wasUnread = notifications.some((n) => Number(n.id) === Number(id) && !n.leida);
    setNotifications((prev) => prev.map((n) => (Number(n.id) === Number(id) ? { ...n, leida: true } : n)));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationsService.markAsRead(id, accessToken);
    } catch (error) {
      console.error('Error marking as read:', error);
      void fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!accessToken) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    setUnreadCount(0);

    try {
      await notificationsService.markAllAsRead(accessToken);
    } catch (error) {
      console.error('Error marking all as read:', error);
      void fetchNotifications();
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
};
