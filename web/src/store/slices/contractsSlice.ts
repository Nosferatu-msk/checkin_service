import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ContractsUIState {
  selectedContractId: string | null;
  filters: {
    objectId?: string;
    status?: 'active' | 'expired' | 'terminated';
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const initialState: ContractsUIState = {
  selectedContractId: null,
  filters: {},
  sortBy: 'contract_number',
  sortOrder: 'asc',
};

const contractsSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    setSelectedContractId: (state, action: PayloadAction<string | null>) => {
      state.selectedContractId = action.payload;
    },
    setFilters: (state, action: PayloadAction<ContractsUIState['filters']>) => {
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

export const { setSelectedContractId, setFilters, clearFilters, setSorting } = contractsSlice.actions;
export default contractsSlice.reducer;
