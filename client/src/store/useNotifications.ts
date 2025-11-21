import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  NotificationType,
  Notification,
} from "../components/Notifications";

interface NotificationStore {
  notifications: Notification[];
  addNotification: (
    message: string,
    type: NotificationType,
    duration?: number
  ) => void;
  removeNotification: (id: string) => void;
}

export const useNotifications = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (message: string, type: NotificationType, duration = 3000) =>
    set((state) => {
      const notification: Notification = {
        id: uuidv4(),
        message,
        type,
        duration,
      };
      return { notifications: [...state.notifications, notification] };
    }),

  removeNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
