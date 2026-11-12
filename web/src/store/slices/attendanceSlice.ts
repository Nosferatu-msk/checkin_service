import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AttendanceUIState {
  filters: {
    objectId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: 'present' | 'late' | 'absent' | 'left_early';
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'table' | 'calendar';
}

const initialState: AttendanceUIState = {
  filters: {},
  sortBy: 'check_in_time',
  sortOrder: 'desc',
  viewMode: 'table',
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<AttendanceUIState['filters']>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    setViewMode: (state, action: PayloadAction<'table' | 'calendar'>) => {
      state.viewMode = action.payload;
    },
  },
});

export const { setFilters, clearFilters, setSorting, setViewMode } = attendanceSlice.actions;
export default attendanceSlice.reducer;
