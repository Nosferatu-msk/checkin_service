import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FraudUIState {
  filters: {
    status?: 'new' | 'investigating' | 'resolved' | 'dismissed';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    alertType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedAlertId: string | null;
}

const initialState: FraudUIState = {
  filters: {},
  sortBy: 'created_at',
  sortOrder: 'desc',
  selectedAlertId: null,
};

const fraudSlice = createSlice({
  name: 'fraud',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<FraudUIState['filters']>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    setSelectedAlertId: (state, action: PayloadAction<string | null>) => {
      state.selectedAlertId = action.payload;
    },
  },
});

export const { setFilters, clearFilters, setSorting, setSelectedAlertId } = fraudSlice.actions;
export default fraudSlice.reducer;
