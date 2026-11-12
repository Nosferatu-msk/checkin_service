import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../../types/entities';

interface NotificationsState {
  unreadCount: number;
  lastFetchedAt: string | null;
}

const initialState: NotificationsState = {
  unreadCount: 0,
  lastFetchedAt: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    updateFromNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.unreadCount = action.payload.filter((n) => !n.is_read).length;
      state.lastFetchedAt = new Date().toISOString();
    },
    decrementUnreadCount: (state) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },
  },
});

export const {
  setUnreadCount,
  updateFromNotifications,
  decrementUnreadCount,
  resetUnreadCount,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
