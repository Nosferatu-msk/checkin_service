import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UsersUIState {
  selectedUserId: string | null;
  filters: {
    role?: 'admin' | 'curator' | 'employee';
    isActive?: boolean;
    searchQuery?: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const initialState: UsersUIState = {
  selectedUserId: null,
  filters: {},
  sortBy: 'full_name',
  sortOrder: 'asc',
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setSelectedUserId: (state, action: PayloadAction<string | null>) => {
      state.selectedUserId = action.payload;
    },
    setFilters: (state, action: PayloadAction<UsersUIState['filters']>) => {
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

export const { setSelectedUserId, setFilters, clearFilters, setSorting } = usersSlice.actions;
export default usersSlice.reducer;
