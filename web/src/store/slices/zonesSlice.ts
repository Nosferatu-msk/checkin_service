import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ZonesUIState {
  selectedZoneId: string | null;
  filters: {
    objectId?: string;
    type?: 'entry' | 'exit' | 'work' | 'restricted';
    isActive?: boolean;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const initialState: ZonesUIState = {
  selectedZoneId: null,
  filters: {},
  sortBy: 'name',
  sortOrder: 'asc',
};

const zonesSlice = createSlice({
  name: 'zones',
  initialState,
  reducers: {
    setSelectedZoneId: (state, action: PayloadAction<string | null>) => {
      state.selectedZoneId = action.payload;
    },
    setFilters: (state, action: PayloadAction<ZonesUIState['filters']>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
  },
});

export const { setSelectedZoneId, setFilters, clearFilters, setSorting } = zonesSlice.actions;
export default zonesSlice.reducer;
