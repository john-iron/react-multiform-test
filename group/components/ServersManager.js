// src/features/group/components/ServersManager.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { setShowDiskModal, setCurrentServerIndex, updateFormData, setIncludeSuggestedServers } from '../groupSlice';

import { CpuFill, HddFill, HddStackFill, Memory, PlusCircleFill, Sliders, TrashFill } from 'react-bootstrap-icons';


const ROLE_OPTIONS = [
  'DB',
  'TS1',
  'TS2',
  'TS3',
  'WEBAPP',
  'DOC',
  'BI',
  'PROXY',
  // esempio di CX personalizzato ‒ basta aggiungerne altri qui
  'CX_ACME_PORTAL',
];
// -----------------------------
//  DYNAMIC  ROLE  GENERATOR
// -----------------------------
const useRoleOptions = (serverList) => {
  return useMemo(() => {
    // ruoli già presenti (case‑insensitive)
    const used = new Set(
      serverList
        .map(s => (s.role || '').trim().toUpperCase())
        .filter(Boolean)
    );

    // ruoli “singleton”: se esistono NON vanno proposti
    const uniqueRoles = ['DB', 'WEBAPP', 'PROXY', 'DOC', 'BI'];
    const opts = uniqueRoles.filter(r => !used.has(r));

    // prossimo TSn ➜ TS1          se non esiste alcun TS
    //                TS{max+1}    altrimenti
    let maxTs = 0;
    used.forEach(r => {
      const m = r.match(/^TS(\d+)$/i);
      if (m) maxTs = Math.max(maxTs, Number(m[1]));
    });
    opts.push(`TS${maxTs + 1 || 1}`);

    // CX: lasciamo un placeholder fisso (puoi cambiarlo a piacere)
    opts.push('CX_ACME_PORTAL');

    return opts;
  }, [serverList]);
};



function computeServerHint(serverList) {
  const hint = [];
  for (const server of serverList) {
    const role = server.role;
    if (role === 'DB') hint.push('DB');
    if (role === 'TS1') hint.unshift('TS');
    if (role === 'WEBAPP') hint.push('WEBAPP');
    if (role === 'DOC') hint.push('DOC');
    if (role === 'BI') hint.push('BI');
    if (role === 'PROXY') hint.push('PROXY');
    if (role.includes('CX') && !hint.includes('CX')) hint.push('CX');
  }
  return hint.join('+');
}
const ServersManager = () => {
  const dispatch = useDispatch();
  const { formData, includeSuggestedServers } = useSelector(state => state.group);
  const roleOptions = useRoleOptions(formData.infrastructure.server_list);

  // stato locale per la riga “nuovo server”
  const [newRole, setNewRole] = useState('');
  // se le opzioni cambiano e newRole non è più valido ➜ reset
  useEffect(() => {
    if (newRole && !roleOptions.includes(newRole)) setNewRole('');
  }, [roleOptions, newRole]);
  const InfrastructureLabels = {
    CLOUD_RICCA: "Cloud Ricca",
    CLOUD_OWN: "Cloud proprietario",
    ON_PREMISE: "On Premise",
    HYBRID: "Modalità Ibrida",
  };
  function ServerInfo({ infrastructureType }) {
    // Recupera la label: se non c’è corrispondenza, cade su un placeholder
    const label = InfrastructureLabels[infrastructureType] ?? "—";

    return (
      <div className="col-md-3 mb-2">
        <small className="text-secondary">Hosting</small>
        <div><strong>{label}</strong></div>
      </div>
    );
  }

  // 1) Filtriamo i server
  const displayedServers = useMemo(() => {
    return formData.infrastructure.server_list.filter(
      server => includeSuggestedServers || server.status === 'necessario'
    );
  }, [formData, includeSuggestedServers]);

  // 2) Calcoliamo il serverHint in base ai soli server mostrati
  const serverHint = useMemo(() => {
    return computeServerHint(displayedServers);
  }, [displayedServers]);

  // Calcola le informazioni riepilogative extra
  const totalCompanies = formData.companies_list ? formData.companies_list.length : 0;
  const totalIntegrations = formData.infrastructure && formData.infrastructure.integrations
    ? formData.infrastructure.integrations.length
    : 0;
  const totalBrands = formData.companies_list
    ? formData.companies_list.reduce((acc, company) => {
      return acc + (company.brands ? company.brands.length : 0);
    }, 0)
    : 0;
  const groupName = formData.tenant_name || '';


  const hasMikrotik = formData.infrastructure.hasMikrotik || false;
  const hasVLAN = formData.infrastructure.hasVLAN || false;

  const totalLicenses = formData.companies_list
    ? formData.companies_list.reduce((acc, company) => {
      return acc + (company.license_infinity ? parseInt(company.license_infinity) : 0);
    }, 0)
    : 0;
  const totalWebLicenses = formData.companies_list
    ? formData.companies_list.reduce((acc, company) => {
      return acc + (company.license_web ? parseInt(company.license_web) : 0);
    }, 0)
    : 0;
  const totalServer = formData.infrastructure.server_list
    ? formData.infrastructure.server_list.reduce((acc, server) => {
      return acc + (server.disk_list ? server.disk_list.length : 0);
    }, 0)
    : 0;

  // ... le altre funzioni (handleServerChange, handleAddServer, etc.)
  // (codice già presente non mostrato per brevità)

  const handleServerChange = (serverIndex, e) => {
    const { name, value } = e.target;
    const newServerList = formData.infrastructure.server_list.map((server, i) =>
      i === serverIndex ? { ...server, [name]: value } : server
    );
    dispatch(updateFormData({
      infrastructure: {
        ...formData.infrastructure,
        server_list: newServerList,
        server_hint: computeServerHint(newServerList)
      }
    }));
  };

  const handleAddServer = () => {
    if (!newRole) {
      // senza ruolo non si crea nulla: potresti mostrare un toast/alert se preferisci
      return;
    }
    const newServer = {
      _id: null,
      role: newRole,           // 🆕 pre‑impostato
      status: 'necessario',
      cpu: '8',
      ram: '16',
      disk_list: [{ letter: 'C', size: '100GB' }],
    };
    const newServerList = [...formData.infrastructure.server_list, newServer];
    dispatch(updateFormData({
      infrastructure: {
        ...formData.infrastructure,
        server_list: newServerList,
        server_hint: computeServerHint(newServerList),
      },
    }));
    setNewRole('');            // resetta la select
  };

  const handleRemoveServer = (serverIndex) => {
    const newServerList = formData.infrastructure.server_list.filter((_, i) => i !== serverIndex);
    dispatch(updateFormData({
      infrastructure: {
        ...formData.infrastructure,
        server_list: newServerList
      }
    }));
  };

  const handleManageDisks = (serverIndex) => {
    dispatch(setCurrentServerIndex(serverIndex));
    dispatch(setShowDiskModal(true));
  };

  return (
    <div>
      <div className="mb-2">
        <small className="text-secondary">ServerHint (basato su visualizzazione):</small>
        <strong>{serverHint}</strong>
      </div>
      {/* Riepilogo del Form */}
      <div className="card mb-3">
        <div className="card-header">
          <strong>Riepilogo Form</strong>
        </div>
        <div className="card-body">
          <div className="row">
            {/* Informazioni Gruppo */}
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Nome Gruppo:</small>
              <div><strong>{groupName}</strong></div>
            </div>
            {/* Informazioni Company */}
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Aziende:</small>
              <div><strong>{totalCompanies}</strong></div>
            </div>
            {/* Informazioni Integrazione */}
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Integrazioni:</small>
              <div><strong>{totalIntegrations}</strong></div>
            </div>
            {/* Informazioni Brand */}
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Brand (Mandati):</small>
              <div><strong>{totalBrands}</strong></div>
            </div>
            <div className="col-md-3 mb-2">
              <small className="text-secondary">MIKROTIK?</small>
              <div><strong>{hasMikrotik ? "NECESSARIA" : 'no'}</strong></div>
            </div>
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Segmentazione VLAN?</small>
              <div><strong>{hasVLAN ? "NECESSARIA" : 'no'}</strong></div>
            </div>
            {/* ... dentro al render di ServersManager */}
            <ServerInfo infrastructureType={formData.infrastructure.type} />


          </div>
        </div>
      </div>

      {/* Riepilogo Server */}
      <div className="card mb-3">
        <div className="card-header">
          <strong>Riepilogo Server</strong>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Totale Server:</small>
              <div><strong>{formData.infrastructure.server_list.length}</strong></div>
            </div>
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Server Necessari:</small>
              <div>
                <strong>
                  {
                    formData.infrastructure.server_list.filter(
                      server => server.status === 'necessario'
                    ).length
                  }
                </strong>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Filtro Visualizzazione:</small>
              <div>
                <strong>{includeSuggestedServers ? "Tutti (inclusi consigliati)" : "Solo necessari"}</strong>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <small className="text-secondary">Riepilogo Licenze</small>
              <div>
                <strong>Licenze Infinity: {totalLicenses}</strong>
                <br />
                <strong>Licenze Web: {totalWebLicenses}</strong>
              </div>
            </div>
            <div className="col-12 mt-2">
              <small className="text-secondary">Server Hint:</small>
              <div><strong>{serverHint}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end align-items-center mb-2">
        <label htmlFor="serverFilter" className="me-2 text-secondary"><small>Filtra visualizzazione:</small></label>
        <select
          id="serverFilter"
          className="form-select form-select-sm w-auto"
          value={includeSuggestedServers ? "all" : "necessary"}
          onChange={(e) => dispatch(setIncludeSuggestedServers(e.target.value === "all"))}
        >
          <option value="necessary">Solo necessari</option>
          <option value="all">Tutti (inclusi consigliati)</option>
        </select>
      </div>
      <table className="table table-sm mt-2">
        <thead>
          <tr>
            <th className="bg-light border-0 fw-normal text-secondary"><small>#</small></th>
            <th className="bg-light border-0 fw-normal text-secondary">
              <HddStackFill className="mr-2" /><small>Ruolo</small>
            </th>
            <th className="bg-light border-0 fw-normal text-secondary"><small>Status</small></th>
            <th className="bg-light border-0 fw-normal text-secondary">
              <CpuFill className="mr-2" /><small>CPU</small>
            </th>
            <th className="bg-light border-0 fw-normal text-secondary">
              <Memory className="mr-2" /><small>RAM</small>
            </th>
            <th className="bg-light border-0 fw-normal text-secondary">
              <HddFill className="mr-2" /><small>Dischi</small>
            </th>
            <th className="bg-light border-0 fw-normal text-secondary"></th>
          </tr>
        </thead>
        <tbody>
          {displayedServers.map((server, index) => (
            <tr key={server._id || index}>
              <td>{index + 1}</td>
              <td>
                <input
                  type="text"
                  className="form-control"
                  id={`role_${index}`}
                  name="role"
                  value={server.role}
                  onChange={(e) => handleServerChange(index, e)}
                  pattern="^(DB|TS\d+|BI|DOC|WEBAPP|PROXY|CX_[A-Za-z0-9]+_[A-Za-z0-9 ]+)$"
                  title="Valori validi: DB, TS1, BI, DOC, WEBAPP, PROXY, CX_..."
                  required
                />
              </td>
              <td>
                <div className="d-flex align-items-center">
                  {server.status === 'necessario' && <span className="badge bg-success">Necessario</span>}
                  {server.status === 'consigliato' && <span className="badge bg-warning text-dark">Consigliato</span>}
                  {!['necessario', 'consigliato'].includes(server.status) && (
                    <span className="badge bg-secondary">Non definito</span>
                  )}
                </div>
              </td>
              <td>
                <input
                  type="text"
                  className="form-control"
                  id={`cpu_${index}`}
                  name="cpu"
                  value={server.cpu}
                  onChange={(e) => handleServerChange(index, e)}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="form-control"
                  id={`ram_${index}`}
                  name="ram"
                  value={server.ram}
                  onChange={(e) => handleServerChange(index, e)}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-link text-primary"
                  onClick={() => handleManageDisks(index)}
                >
                  <Sliders /> Configura
                </button>
              </td>
              <td className="text-end">
                <OverlayTrigger placement="top" overlay={<Tooltip>Elimina Server</Tooltip>}>
                  <button
                    type="button"
                    className="btn btn-link text-danger"
                    onClick={() => handleRemoveServer(index)}
                  >
                    <TrashFill />
                  </button>
                </OverlayTrigger>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={6}>
              <select
                className="form-select form-select-sm w-auto d-inline-block me-2"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="" disabled>Seleziona un ruolo…</option>
                {roleOptions.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </td>
            <td className="text-end">
              <OverlayTrigger placement="top" overlay={<Tooltip>Aggiungi Server</Tooltip>}>
                <button
                  type="button"
                  className="btn btn-link text-primary"
                  onClick={handleAddServer}
                  disabled={!newRole}
                >
                  <PlusCircleFill />
                </button>
              </OverlayTrigger>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ServersManager;