import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ObjectsUIState {
  selectedObjectId: string | null;
  filters: {
    isActive?: boolean;
    searchQuery?: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const initialState: ObjectsUIState = {
  selectedObjectId: null,
  filters: {},
  sortBy: 'name',
  sortOrder: 'asc',
};

const objectsSlice = createSlice({
  name: 'objects',
  initialState,
  reducers: {
    setSelectedObjectId: (state, action: PayloadAction<string | null>) => {
      state.selectedObjectId = action.payload;
    },
    setFilters: (state, action: PayloadAction<ObjectsUIState['filters']>) => {
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

export const { setSelectedObjectId, setFilters, clearFilters, setSorting } = objectsSlice.actions;
export default objectsSlice.reducer;
