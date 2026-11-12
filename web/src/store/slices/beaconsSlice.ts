import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BeaconsUIState {
  selectedBeaconId: string | null;
  filters: {
    zoneId?: string;
    objectId?: string;
    isActive?: boolean;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const initialState: BeaconsUIState = {
  selectedBeaconId: null,
  filters: {},
  sortBy: 'name',
  sortOrder: 'asc',
};

const beaconsSlice = createSlice({
  name: 'beacons',
  initialState,
  reducers: {
    setSelectedBeaconId: (state, action: PayloadAction<string | null>) => {
      state.selectedBeaconId = action.payload;
    },
    setFilters: (state, action: PayloadAction<BeaconsUIState['filters']>) => {
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

export const { setSelectedBeaconId, setFilters, clearFilters, setSorting } = beaconsSlice.actions;
export default beaconsSlice.reducer;
