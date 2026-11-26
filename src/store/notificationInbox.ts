import { createContext, useContext } from 'react';

export interface NotificationInboxValue {
  unreadCount: number;
  openInbox: () => void;
}

export const NotificationInboxContext = createContext<NotificationInboxValue>({
  unreadCount: 0,
  openInbox: () => {},
});

/** Reads global unread notification count and opens the inbox modal from anywhere in tabs. */
export function useNotificationInbox(): NotificationInboxValue {
  return useContext(NotificationInboxContext);
}
