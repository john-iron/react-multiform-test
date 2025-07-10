// groupSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchGroup,
  saveGroup,
  fetchBrands,
  fetchModuli,
  fetchIntegrazioni,
  fetchServerDefaults,
  checkCompanyPiva,
  recalcServerProposal,
} from './groupThunks';


import { buildFormData } from './groupUtils';

const groupSlice = createSlice({
  name: 'group',
  initialState: {
    loading: false,
    error: null,
    formData: null,
    brands: [],
    moduli: [],
    integrazioni: [],
    includeSuggestedServers: true,
    serverDefault: [],
    activeTab: 'group',
    showDiskModal: false,
    currentServerIndex: null,
    submitDisabled: false,
    selectedServer: 'CLOUD_RICCA',
    action: 'add',
    revNo: null,
  },
  reducers: {
    setActiveTab: (state, action) => { state.activeTab = action.payload; },
    setIncludeSuggestedServers: (state, action) => { state.includeSuggestedServers = action.payload; },
    setCurrentServerIndex: (state, action) => { state.currentServerIndex = action.payload; },
    setShowDiskModal: (state, action) => { state.showDiskModal = action.payload; },
    setSelectedServer: (state, action) => {
      state.selectedServer = action.payload;
      if (state.formData?.infrastructure) {
        state.formData.infrastructure.type = action.payload;
      }
    },
    setSubmitDisabled: (state, action) => { state.submitDisabled = action.payload; },
    updateFormData: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    addCompany: (state) => {
      state.formData.companies_list.push({
        company_name: '',
        tipologia: '',
        p_iva: '',
        brands: [],
        license_infinity: '0',
        license_web: '0',
        note: '',
      });
    },
    removeCompany: (state, action) => {
      state.formData.companies_list = state.formData.companies_list.filter((_, i) => i !== action.payload);
    },
    addBrand: (state, action) => {
      const { companyIndex, brand: brandId } = action.payload;
      const company = state.formData.companies_list[companyIndex];
      if (!company.brands) company.brands = [];
      const full = state.brands.find(b => b._id === brandId);
      if (full) company.brands.push(full);
    },
    removeBrand: (state, action) => {
      const { companyIndex, brandIndex } = action.payload;
      state.formData.companies_list[companyIndex].brands =
        state.formData.companies_list[companyIndex].brands.filter((_, i) => i !== brandIndex);
    },
    updateBrand: (state, action) => {
      const { companyIndex, brandIndex, value: brandId } = action.payload;
      const complete = state.brands.find(b => b._id === brandId);
      if (complete) {
        state.formData.companies_list[companyIndex].brands[brandIndex] = complete;
      }
    },
    updateCompanyField: (state, action) => {
      const { companyIndex, field, value } = action.payload;
      state.formData.companies_list[companyIndex][field] = value;
    },
    clearError: (state) => { state.error = null; },
  },

  extraReducers: (builder) => {
    // fetchGroup
    builder
      .addCase(fetchGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroup.fulfilled, (state, action) => {
        state.loading = false;
        const { data, action: act, revNo, userData } = action.payload;
        state.formData = buildFormData(data, act, revNo, userData, state.serverDefaults);
        state.selectedServer = state.formData?.infrastructure?.type || 'CLOUD_RICCA';
        state.action = act;
        state.revNo = revNo;
      })
      .addCase(fetchGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Errore fetch group';
      })

      // saveGroup
      .addCase(saveGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveGroup.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(saveGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Errore salvataggio group';
      })

      // fetchBrands
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.brands = action.payload;
      })

      // fetchModuli
      .addCase(fetchModuli.fulfilled, (state, action) => {
        state.moduli = action.payload;
      })

      // fetchIntegrazioni
      .addCase(fetchIntegrazioni.fulfilled, (state, action) => {
        state.integrazioni = action.payload;
      })

      // recalcServerProposal
      .addCase(recalcServerProposal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(recalcServerProposal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(recalcServerProposal.fulfilled, (state, action) => {
        if (action.payload) {
          state.loading = false;
          state.formData = {
            ...state.formData,
            infrastructure: {
              ...state.formData.infrastructure,
              server_list: action.payload.newServerList,
              server_hint: action.payload.serverHint,
              hasMikrotik: action.payload.hasMikrotik,
              hasVLAN: action.payload.hasVLAN,
            }
          };
        }
      })
      .addCase(fetchServerDefaults.pending, (state) => {
        // se vuoi impostare qualche flag di loading
      })
      .addCase(fetchServerDefaults.fulfilled, (state, action) => {
        // Salvi i defaults in Redux
        state.serverDefaults = action.payload;
      })
      .addCase(fetchServerDefaults.rejected, (state, action) => {
        // Gestione errori
        state.error = action.payload || 'Errore fetch server defaults';
      });
  },
});

export const {
  setActiveTab,
  setIncludeSuggestedServers,
  setCurrentServerIndex,
  setShowDiskModal,
  setSelectedServer,
  setSubmitDisabled,
  updateFormData,
  addCompany,
  removeCompany,
  addBrand,
  removeBrand,
  updateBrand,
  updateCompanyField,
  clearError,
} = groupSlice.actions;

export default groupSlice.reducer;
