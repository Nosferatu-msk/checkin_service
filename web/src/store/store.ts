import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';
import notificationsReducer from './slices/notificationsSlice';
import objectsReducer from './slices/objectsSlice';
import zonesReducer from './slices/zonesSlice';
import beaconsReducer from './slices/beaconsSlice';
import contractsReducer from './slices/contractsSlice';
import usersReducer from './slices/usersSlice';
import attendanceReducer from './slices/attendanceSlice';
import slaReducer from './slices/slaSlice';
import fraudReducer from './slices/fraudSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    notifications: notificationsReducer,
    objects: objectsReducer,
    zones: zonesReducer,
    beacons: beaconsReducer,
    contracts: contractsReducer,
    users: usersReducer,
    attendance: attendanceReducer,
    sla: slaReducer,
    fraud: fraudReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
