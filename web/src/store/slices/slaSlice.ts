import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SLAUIState {
  filters: {
    objectId?: string;
    status?: 'pending' | 'reviewed' | 'resolved';
    severity?: 'low' | 'medium' | 'high';
    dateFrom?: string;
    dateTo?: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  activeTab: 'violations' | 'requirements';
}

const initialState: SLAUIState = {
  filters: {},
  sortBy: 'occurred_at',
  sortOrder: 'desc',
  activeTab: 'violations',
};

const slaSlice = createSlice({
  name: 'sla',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<SLAUIState['filters']>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    setActiveTab: (state, action: PayloadAction<'violations' | 'requirements'>) => {
      state.activeTab = action.payload;
    },
  },
});

export const { setFilters, clearFilters, setSorting, setActiveTab } = slaSlice.actions;
export default slaSlice.reducer;
