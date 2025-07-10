// groupThunks.js
import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import CONFIG from 'js/config';
import { calcServerProposal } from './serverProposalEngine';

import { computeServerHint } from './groupUtils';


// 1. Thunk: fetchGroup
export const fetchGroup = createAsyncThunk(
  'group/fetchGroup',
  async ({ id, action, revNo, userData }, { rejectWithValue }) => {
    try {
      if (!id || action === 'add') {
        return { data: null, action, revNo, userData };
      }
      const response = await axios.get(`${CONFIG.API_URL}/groups/${id}`, { withCredentials: true });
      return { data: response.data, action, revNo, userData };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 2. Thunk: saveGroup
export const saveGroup = createAsyncThunk(
  'group/saveGroup',
  async ({ id, action, formData, userData, includeSuggestedServers }, { rejectWithValue }) => {
    try {
      const clonedFormData = JSON.parse(JSON.stringify(formData));

      clonedFormData.infrastructure.server_hint =
        computeServerHint(clonedFormData.infrastructure.server_list);

      const updatedDealer = {
        ...clonedFormData,
        creator_contact: {
          nome: userData?.name,
          email: userData?.email
        }
      };

      let method = 'post';
      let url = `${CONFIG.API_URL}/groups`;
      if (id) {
        if (action === 'upgrade') {
          method = 'post';
          url = `${CONFIG.API_URL}/groups/${id}`;
        } else if (action === 'edit') {
          method = 'put';
          url = `${CONFIG.API_URL}/groups/${id}`;
        }
      }

      const response = await axios[method](url, updatedDealer, { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 3. Thunk: fetchBrands
export const fetchBrands = createAsyncThunk(
  'group/fetchBrands',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${CONFIG.API_URL}/brandsadm`, { withCredentials: true });
      //console.log('Brands:', response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 4. Thunk: fetchModuli
export const fetchModuli = createAsyncThunk(
  'group/fetchModuli',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${CONFIG.API_URL}/moduli/moduli_infinity`, { withCredentials: true });
      return response.data?.content || [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 5. Thunk: fetchIntegrazioni
export const fetchIntegrazioni = createAsyncThunk(
  'group/fetchIntegrazioni',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${CONFIG.API_URL}/moduli/altre_integrazioni`, { withCredentials: true });
      return response.data?.content || [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);




// 6. Thunk: checkCompanyPiva
export const checkCompanyPiva = createAsyncThunk(
  'group/checkCompanyPiva',
  async (piva, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${CONFIG.API_URL}/companies/check-duplicate/${encodeURIComponent(piva)}`,
        { withCredentials: true }
      );
      return res.data.duplicate;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);


// 7. Thunk: recalcServerProposal (motore di regole)
/*
export const recalcServerProposal = createAsyncThunk(
  'group/recalcServerProposal',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { formData, selectedServer, serverDefaults } = getState().group;
      const companiesList = formData.companies_list || [];
      const existingServerList = formData.infrastructure?.server_list || [];
      const integrations = formData.infrastructure?.integrations || [];

      const facts = buildFactsFromGroup(companiesList, integrations, selectedServer);
      //console.log('Facts:', facts);
      // 1) Recupera le regole abilitate dal backend
      const response = await axios.get(`${CONFIG.API_URL}/rules`, { withCredentials: true });
      const ruleList = response.data || [];
      //console.log('Regole disponibili:', ruleList);
      // 2) Inizializza motore
      const engine = new Engine();
      ruleList.filter(r => r.enabled).forEach(rule => {
        if (!rule.conditions) {
          // Se non c’è conditions, puoi o saltarla o impostare un default
          console.warn(`La regola '${rule.name}' non ha conditions. Skipping...`);
          return;
        }
        // 1. converti "rule.conditions" nel formato json-rules-engine
        const convertedConditions = toJsonRulesFormat(rule.conditions);
      
        // 2. costruiamo l'oggetto finale
        const toEngine = {
          conditions: convertedConditions,
          event: rule.event
        };
        //console.log('Condizioni finali per json-rules-engine:', toEngine);

        engine.addRule(toEngine);
      });
      

      // 3) Eventuale "on success" (facoltativo)
      engine.on('success', async (event, almanac, ruleResult) => {
        if (event.type === 'server-add') {
          console.log('Regola eseguita:', ruleResult);
          //console.log('Aggiunto server TS:', event.params.count);
        }
      });

      // Reset temporaneo
      facts.hasTS = false;
      facts.hasWebapp = false;
      facts.hasProxy = false;

      // 4) Esecuzione
      const { events } = await engine.run(facts);

      // 5) Inizializza DB
      let newServerList = initializeDBServer(existingServerList,serverDefaults);

      // 6) Elabora gli eventi generati dalle regole
      events.forEach(ev => {
        if (ev.type === 'server-add') {
          // es: { role: 'TS', cpu: '10', ram: '20', status: 'necessario', count, ... }
          const { role, status, count, cpu, ram, disk_list } = ev.params;
          // Costruiamo "engineParams" con i valori di override del rules-engine
          const engineParams = { cpu, ram, status, disk_list };

          
          //console.log('Facts:', facts);

          switch (role) {
            // ---------------------------------------------------
            // TS => Conteggio multiplo basato su tsRequired / tsRecommended
            // ---------------------------------------------------
            case 'TS':
              if(!facts.hasTS) {
                console.log('Aggiunto server TS:', role, status, count, cpu, ram);
                addTSServers(
                  newServerList,
                  engineParams, 
                  facts.tsRequired,              // quante TS "necessarie"
                  facts.tsRecommended || 1,      // quante TS totali (compreso consigliate)
                  existingServerList,
                  serverDefaults
                );
                facts.hasTS = true;
              }
              break;

            // ---------------------------------------------------
            // WEBAPP => Singolo server
            // ---------------------------------------------------
            case 'WEBAPP':
              console.log('Aggiunto server WEBAPP:', role, status, count, cpu, ram);
              if(!facts.hasWebapp) {
                addWebAppServer(
                  newServerList,
                  engineParams,
                  existingServerList,
                  serverDefaults
                );
                facts.hasWebapp = true;
              }
              break;

            // ---------------------------------------------------
            // BI => Singolo server
            // ---------------------------------------------------
            case 'BI':
              console.log('Aggiunto server: BI', role, status, count, cpu, ram);
              addBIServer(
                newServerList,
                engineParams,
                existingServerList,
                serverDefaults
              );
              break;

            // ---------------------------------------------------
            // DOC => Singolo server, con eventuale CPU/RAM da regola
            // ---------------------------------------------------
            case 'DOC':
              console.log('Aggiunto server:', role, status, count, cpu, ram);
              addDocServer(
                newServerList,
                engineParams,
                existingServerList,
                serverDefaults
              );
              break;

            // ---------------------------------------------------
            // CX => Conteggio multiplo per brand (loop)
            // ---------------------------------------------------
            case 'CX':
              console.log('Aggiunto server CX:', role, status, count, cpu, ram);
              addCXServers(
                newServerList,
                engineParams,
                role, // "CX_NISSAN" ecc.
                existingServerList,
                serverDefaults,
                companiesList
              );
              break;

            // ---------------------------------------------------
            // PROXY => Singolo server
            // ---------------------------------------------------
            case 'PROXY':
              if(!facts.hasProxy) {
                addProxyServer(
                  newServerList,
                  engineParams,
                  existingServerList,
                  serverDefaults
                );
                facts.hasProxy = true;
              }
              break;

            default:
              // Eventi non gestiti
              break;
          }
        }
      });

      // 7) Calcolo final server_hint e reset recalc
      const hints = computeServerHint(newServerList);
      dispatch({ type: 'group/updateFormData', payload: { recalc: false } });

      return {
        newServerList: newServerList.map(s => ({ ...s })),
        serverHint: hints
      };

    } catch (error) {
      return rejectWithValue(error.toString());
    }
  }
);
*/

// groupThunks.js
export const recalcServerProposal = createAsyncThunk(
  'group/recalcServerProposal',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { formData, selectedServer, serverDefaults } = getState().group;

      // ① Recupero regole (infrastructure)
      const { data: ruleList } = await axios.get(`${CONFIG.API_URL}/rules`, { withCredentials: true });

      // ② Delego al dominio

      const { serverList, serverHint, hasMikrotik, hasVLAN, hasProxy } = await calcServerProposal({
        formData,
        selectedServer,
        serverDefaults,
        ruleList
      });
      //console.log('HasMikrotik:', hasMikrotik);
      // ③ Aggiorno lo store
      dispatch({ type: 'group/updateFormData', payload: { recalc: false } });

      return { newServerList: serverList, serverHint, hasMikrotik, hasVLAN };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addBrand = createAction('group/addBrand', function prepare({ companyIndex, brand }) {
  return {
    payload: { companyIndex, brand },
  };
});

// 8. Carica i server di Defualt
export const fetchServerDefaults = createAsyncThunk(
  'group/fetchServerDefaults',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${CONFIG.API_URL}/serverdefaults`, { withCredentials: true });
      return response.data; // array di server defaults
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
