// src/features/group/DataManager.jsx
import React, { useEffect, useContext, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { CloudCheckFill, CloudPlusFill } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';


import CompaniesManager from './group/components/CompaniesManager';
import ServersManager from './group/components/ServersManager';
import DiskModal from './group/components/DiskModal';
import ImportModal from './group/components/ImportModal';
import GroupLayout from 'components/layout/GroupLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { ListGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Upload } from 'react-bootstrap-icons'; // Aggiungi questa icona

import {
  ArrowLeftCircleFill,
  ArrowRightCircleFill,
  BuildingFill,
  CalendarFill,
  Check,
  Diagram2Fill,
  HddFill,
  Save,
  List,
  PencilFill,
  PeopleFill,
  PersonFill,
  PlusCircleFill,
  TrashFill
} from 'react-bootstrap-icons';

import {
  fetchGroup,
  fetchBrands,
  fetchModuli,
  fetchIntegrazioni,
  fetchServerDefaults,
  saveGroup,
  recalcServerProposal
} from './group/groupThunks';  // <-- i thunk vengono da "groupThunks.js"

import {
  setSelectedServer,
  updateFormData,
  setActiveTab,
  // ... e le altre azioni sync
} from './group/groupSlice';
import { AuthContext } from 'context/AuthContext';






const DataManager = () => {
  const dispatch = useDispatch();
  const { id, revNo, action } = useParams(); // Estrai i parametri dalla URL
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newIntegrations, setNewIntegrations] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false); // <-- NUOVO STATO

  const navigate = useNavigate();

  // Ottieni userData dal contesto di autenticazione
  const { userData } = useContext(AuthContext);

  const {
    loading,
    error,
    formData,
    activeTab,
    showDiskModal,
    currentServerIndex,
    serverDefaults,
    submitDisabled,
    selectedServer,
    includeSuggestedServers,
    integrazioni,
    moduli,
  } = useSelector(state => state.group);


  // Aggiungi questa utility function in cima al file
  function validateGroupTab() {
    const errors = [];
    const { tenant_name } = formData; // supponendo formData a livello di scope
    //console.log('formData', formData);
    if (!tenant_name || tenant_name.length === 0) {
      errors.push("Il nome del gruppo non può essere nullo");
      return errors;
    }

    return errors;
  }


  function validateCompaniesTab() {
    const errors = [];
    const { companies_list } = formData;  // presupponiamo formData sia nello scope

    // 1) Controllo lista vuota
    if (!companies_list || companies_list.length === 0) {
      errors.push("Devi inserire almeno un'azienda\r\n");
      return errors;
    }

    // 2) Controllo concessionari Nissan
    // Se ti basta segnalare un unico errore globale:
    /*
    if (companies_list.some(c =>
          c.tipologia === 'Concessionario' &&
          c.brands?.includes('NISSAN')
        )) {
      errors.push("Non può esistere un concessionario Nissan nel gruppo");
      // Se vuoi interrompere qui:
      return errors;
    }
    */
    // — oppure —  
    // Se preferisci indicare esattamente quale riga azienda sbaglia:
    companies_list.forEach((company, idx) => {
      if (company.tipologia === 'Concessionario' && company.brands?.some(b => b.description === 'NISSAN') && selectedServer === 'CLOUD_RICCA') {
        errors.push(`Azienda #${idx + 1}: Non può esistere un concessionario Nissan nel gruppo.`);
      }
    });


    // 3) Altri controlli per ciascuna azienda
    companies_list.forEach((company, idx) => {
      if (!company.company_name?.trim()) {
        errors.push(`Azienda #${idx + 1}: Nome azienda obbligatorio.\r\n`);
      }
      if (!company.p_iva?.match(/^\d{11}$/)) {
        errors.push(`Azienda #${idx + 1}: P.IVA deve essere 11 cifre.\r\n`);
      }
      // …eventuali altri controlli…
    });

    return errors;
  }


  function validateCurrentTab(tab) {
    // restitution: array di stringhe con i messaggi di errore,
    // se array è vuoto => no errori
    const errors = [];
    switch (tab) {
      case 'group':
        errors.push(...validateGroupTab());
        break;
      case 'companies':
        errors.push(...validateCompaniesTab());
        break;
      case 'servers':
        //errors.push(...validateServersTab());
        break;
      // ...
      default:
        // se tab "group" non richiede check,
        // o puoi farne uno ad hoc
        break;
    }
    return errors;
  }



  useEffect(() => {
    // Al prima mount, forziamo la tab 'group'
    dispatch(setActiveTab('group'));
    // Se non vuoi che si ripeta quando formData o altri cambiano,
    // assicura di NON inserire dipendenze oltre a []
  }, [dispatch]);

  // Carica dati iniziali
  useEffect(() => {
    dispatch(fetchGroup({ id, action, revNo, userData }));
    dispatch(fetchBrands());
    dispatch(fetchModuli());
    dispatch(fetchIntegrazioni());
    dispatch(fetchServerDefaults());
  }, [dispatch, id, action, revNo, userData]);

  // Aggiungi questo useEffect dopo gli altri
  // In DataManager.jsx modifica il useEffect per il ricalcolo
  // Modifica l'useEffect del DataManager.jsx

  useEffect(() => {
    if (!formData) return;

    // Se recalc è true, chiamiamo il thunk
    if (formData.recalc) {
      dispatch(recalcServerProposal());
    }
  }, [
    dispatch,
    formData, // se preferisci, formData.recalc come dipendenza
  ]);

  const SuccessModal = () => (
    <Modal
      show={showSuccessModal}
      onHide={() => setShowSuccessModal(false)}
      onExited={() => navigate('/gui/')}

      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Operazione Riuscita!</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {action === 'edit' ?
          'Modifiche salvate con successo!' :
          'Nuovo gruppo creato con successo!'}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="success"
          onClick={() => {
            setShowSuccessModal(false);
            navigate('/gui/');
          }}
        >
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );

  // Calcola l'indice corrente dal tuo array TABS
  const TABS = ['group', 'companies', 'servers'];
  const currentIndex = TABS.indexOf(activeTab);

  const handlePrev = () => {
    if (currentIndex > 0) {
      // dispatch verso l'azione setActiveTab, passando la "tab" precedente
      mergeAndSaveAllIntegrations();
      dispatch(setActiveTab(TABS[currentIndex - 1]));
      dispatch(updateFormData({ recalc: true }));
    }
  };

  const handleNext = () => {
    if (currentIndex < TABS.length - 1) {
      const currentTab = TABS[currentIndex];
      const errors = validateCurrentTab(currentTab);
      if (errors.length > 0) {
        // ora: un toast separato per ogni singolo messaggio
        errors.forEach(err => toast.error(err));
        return;
      }
      if (currentTab === 'group') {
        mergeAndSaveAllIntegrations();
      }
      dispatch(setActiveTab(TABS[currentIndex + 1]));
      dispatch(updateFormData({ recalc: true }));
    }
  };

  // Handler per moduli e integrazioni
  //Li presentiamo in maniera non modificabile per cui li commento
  /*
  const handleAddItem = (field) => {
    const currentArray = formData.infrastructure[field] || [];
    const newArray = [...currentArray, ''];
    dispatch(updateFormData({
      infrastructure: { ...formData.infrastructure, [field]: newArray }
    }));
  };

  const handleItemChange = (index, field, e) => {
    const currentArray = formData.infrastructure[field] || [];
    const newArray = currentArray.map((item, i) => (i === index ? e.target.value : item));
    dispatch(updateFormData({
      infrastructure: { ...formData.infrastructure, [field]: newArray }
    }));
    //dispatch(updateFormData({ recalc: true }));
  };
  */
  // Gestione admin_contact e it_contact
  const handleREFChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("admin_contact_")) {
      const field = name.replace("admin_contact_", "").toLowerCase();
      dispatch(updateFormData({
        admin_contact: {
          ...formData.admin_contact,
          [field]: value
        }
      }));
    } else if (name.startsWith("it_contact_")) {
      const field = name.replace("it_contact_", "").toLowerCase();
      dispatch(updateFormData({
        it_contact: {
          ...formData.it_contact,
          [field]: value
        }
      }));
    }
  };
  const handleRemoveItem = (index, field) => {
    const currentArray = formData.infrastructure[field] || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    dispatch(updateFormData({
      infrastructure: { ...formData.infrastructure, [field]: newArray }
    }));
    //dispatch(updateFormData({ recalc: true }));
  };

  const internalSubmit = (e) => {
    e.preventDefault();
    dispatch(saveGroup({ id, action, formData, userData, includeSuggestedServers }))
      .unwrap()
      .then(() => {
        setShowSuccessModal(true); // Mostra il modale di successo
      })
      .catch((err) => {
        alert('Errore: ' + JSON.stringify(err, null, 2));
      });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <FontAwesomeIcon icon={faSpinner} spin size="3x" />
      </div>
    );
  }
  if (error) return <div>Errore: {error}</div>;
  if (!formData) return null;

  // Estraggo le integrazioni già esistenti e le tratto come "predefinite".
  const predefinedIntegrations = formData?.infrastructure?.integrations || [];

  // Stato locale per le nuove integrazioni da aggiungere.

  // Calcolo le brand disponibili, escludendo quelle già “predefinite” o già scelte come nuove.
  const integratedBrands = formData?.infrastructure?.integrations || [];
  const allBrands = integrazioni.map(i => i.brand);

  // Filtra e lascia solo quelli non ancora scelti
  const availableBrands = allBrands.filter(b => !integratedBrands.includes(b));

  function handleSelectIntegration(e) {
    const brand = e.target.value;
    if (!brand) return; // se l'utente sceglie l'opzione vuota

    // integrazioni già presenti in Redux
    const currentIntegrations = formData.infrastructure.integrations || [];

    // se già presente, evita duplicati
    if (currentIntegrations.includes(brand)) {
      toast.warning("Integrazione già presente.");
      return;
    }

    // Altrimenti la aggiungiamo direttamente in Redux
    dispatch(updateFormData({
      infrastructure: {
        ...formData.infrastructure,
        integrations: [...currentIntegrations, brand]
      }
    }));
  }
  /** Rimuove una integrazione appena aggiunta (non predefinita). */
  function handleRemoveNewIntegration(index) {
    setNewIntegrations(prev => prev.filter((_, i) => i !== index));
  }

  function handleRemoveIntegration(brand) {
    const current = formData.infrastructure.integrations || [];
    const updated = current.filter(item => item !== brand);
    dispatch(updateFormData({
      infrastructure: {
        ...formData.infrastructure,
        integrations: updated
      }
    }));
  }

  /**
   * Quando l’utente salva o avanza di tab, unisci
   * predefinite + nuove, e aggiornale in Redux (se lo desideri).
   */
  function mergeAndSaveAllIntegrations() {

    const finalIntegrations = [...new Set([
      ...predefinedIntegrations,
      ...newIntegrations
    ])];

    dispatch(updateFormData({
      infrastructure: {
        ...formData.infrastructure,
        integrations: finalIntegrations
      }
    }));

    setNewIntegrations([]);
    // ... poi prosegui con handleNext() o salvataggio ...
  }
  return (
    <GroupLayout activeTab={activeTab} setActiveTab={(tab) => dispatch({ type: 'group/setActiveTab', payload: tab })}>
      <form onSubmit={internalSubmit}>
        {activeTab === 'group' && (
          <div>
            {/* Sezione Revisione */}
            <div className="card mb-4 rounded-0 border-0">
              <div className="card-header bg-transparent border-bottom">
                <span className="text-secondary"><PencilFill className="mr-2" />Revisione</span>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-3">
                    <label htmlFor="revision_number" className="form-label text-secondary">
                      <Check className="mr-2" /><small>N°</small>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="revision_number"
                      name="revision_number"
                      value={formData.revision_number || '1'}
                      disabled
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="revision_type" className="form-label text-secondary">
                      <List className="mr-2" /><small>Tipologia</small>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="revision_type"
                      name="revision_type"
                      value={formData.revision_type || ''}
                      disabled
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="revisor_name" className="form-label text-secondary">
                      <PersonFill className="mr-2" /><small>Revisore</small>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="revisor_name"
                      name="revisor_name"
                      value={userData?.name || ''}
                      disabled
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="revision_date" className="form-label text-secondary">
                      <CalendarFill className="mr-2" /><small>Data</small>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="revision_date"
                      name="revision_date"
                      value={new Date().toISOString().slice(0, 10)}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sezione Anagrafica Gruppo */}
            <div className="card mb-4 rounded-0 border-0">

              <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center">

                {/* Titolo con tag semantico corretto (h5) */}
                <h5 className="mb-0 text-secondary d-flex align-items-center">
                  <PencilFill className="me-2" aria-hidden="true" />
                  Anagrafica Gruppo
                </h5>

                {/* Pulsante di azione */}
                <Button variant="outline-primary" size="sm" onClick={() => setShowImportModal(true)}>
                  <Upload className="me-2" aria-hidden="true" />
                  Importa Quotazione
                </Button>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <div className='row mb-3'>
                      <div className="col-md-12">
                        <label htmlFor="tenant_name" className="form-label text-secondary">
                          <BuildingFill className="mr-2" /><small>Ragione sociale*</small>
                        </label>
                        <input
                          type="text"
                          id="tenant_name"
                          name="tenant_name"
                          className="form-control border-2"
                          autoFocus
                          value={formData.tenant_name}
                          onChange={(e) =>
                            dispatch(updateFormData({
                              tenant_name: e.target.value,
                              tenant_name_auto: e.target.value
                                .toLowerCase()
                                .replace(/\s+/g, '')     // Rimuove gli spazi
                                .replace(/[^\w]/g, '')
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="auto_tenant_name" className="form-label text-secondary">
                          <BuildingFill className="mr-2" /><small>Tenant</small>
                        </label>
                        <input
                          type="text"
                          id="auto_tenant_name"
                          name="tenant_name_auto"
                          className="form-control"
                          value={formData.tenant_name_auto}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="server" className="form-label text-secondary">
                          <HddFill className="mr-2" /><small>Infrastruttura Hardware/Network</small>
                        </label>
                        <select
                          id="server"
                          name="server"
                          className="form-select"
                          value={selectedServer}
                          onChange={(e) => {
                            dispatch(setSelectedServer(e.target.value));
                            dispatch(updateFormData({
                              infrastructure: {
                                ...formData.infrastructure,
                                type: e.target.value
                              }
                            }));
                            //dispatch(updateFormData({ recalc: true }));
                          }}
                        >
                          <option value="CLOUD_RICCA">Cloud Ricca</option>
                          <option value="CLOUD_OWN">Cloud proprietario</option>
                          <option value="ON_PREMISE">On Premise</option>
                          <option value="HYBRID">Modalità Ibrida</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {/*}
                  <div className="col-md-3">
                    <label htmlFor="auto_tenant_name" className="form-label text-secondary">
                      <BuildingFill className="mr-2" /><small>Tenant</small>
                    </label>
                    <input
                      type="text"
                      id="auto_tenant_name"
                      name="tenant_name_auto"
                      className="form-control"
                      value={formData.tenant_name_auto}
                      disabled
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="server" className="form-label text-secondary">
                      <HddFill className="mr-2" /><small>Infrastruttura Hardware/Network</small>
                    </label>
                    <select
                      id="server"
                      name="server"
                      className="form-select"
                      value={selectedServer}
                      onChange={(e) => {
                        dispatch(setSelectedServer(e.target.value));
                        dispatch(updateFormData({
                          infrastructure: {
                            ...formData.infrastructure,
                            type: e.target.value
                          }
                        }));
                        //dispatch(updateFormData({ recalc: true }));
                      }}
                    >
                      <option value="CLOUD_RICCA">Cloud Ricca</option>
                      <option value="CLOUD_OWN">Cloud proprietario</option>
                      <option value="ON_PREMISE">On Premise</option>
                      <option value="HYBRID">Modalità Ibrida</option>
                    </select>
                  </div>
                  */}
                  <div className="col-md-3">
                    <label htmlFor="admin_contact" className="form-label text-secondary">
                      <PersonFill className="mr-2" /><small>Amministrativo</small>
                    </label>
                    <input
                      type="text"
                      id="admin_contact_nome"
                      name="admin_contact_nome"
                      placeholder="Nome"
                      className="form-control mb-2"
                      value={formData?.admin_contact?.nome || ''}
                      onChange={handleREFChange}
                    />
                    <input
                      type="text"
                      id="admin_contact_telefono"
                      name="admin_contact_telefono"
                      placeholder="Numero di telefono"
                      className="form-control mb-2"
                      value={formData?.admin_contact?.telefono || ''}
                      onChange={handleREFChange}
                    />
                    <input
                      type="text"
                      id="admin_contact_email"
                      name="admin_contact_email"
                      placeholder="Email"
                      className="form-control mb-2"
                      value={formData?.admin_contact?.email || ''}
                      onChange={handleREFChange}
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="admin_contact" className="form-label text-secondary">
                      <PersonFill className="mr-2" /><small>IT</small>
                    </label>
                    <input
                      type="text"
                      id="it_contact_nome"
                      name="it_contact_nome"
                      placeholder="Nome"
                      className="form-control mb-2"
                      value={formData?.it_contact?.nome || ''}
                      onChange={handleREFChange}
                    />
                    <input
                      type="text"
                      id="it_contact_telefono"
                      name="it_contact_telefono"
                      placeholder="Numero di telefono"
                      className="form-control mb-2"
                      value={formData?.it_contact?.telefono || ''}
                      onChange={handleREFChange}
                    />
                    <input
                      type="text"
                      id="it_contact_email"
                      name="it_contact_email"
                      placeholder="Email"
                      className="form-control mb-2"
                      value={formData?.it_contact?.email || ''}
                      onChange={handleREFChange}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Sezione Referenti Gruppo 
            <div className="card mb-4 rounded-0 border-0">
              <div className="card-header bg-transparent border-bottom">
                <span className="text-secondary"><PeopleFill className="mr-2" />Referenti Gruppo</span>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                          <label htmlFor="admin_contact" className="form-label text-secondary">
                            <PersonFill className="mr-2"/><small>Amministrativo</small>
                          </label>
                          <input
                            type="text"
                            id="admin_contact_nome"
                            name="admin_contact_nome"
                            placeholder="Nome"
                            className="form-control mb-2"
                            value={formData?.admin_contact?.nome || ''}
                            onChange={handleREFChange}
                          />
                          <input
                            type="text"
                            id="admin_contact_telefono"
                            name="admin_contact_telefono"
                            placeholder="Numero di telefono"
                            className="form-control mb-2"
                            value={formData?.admin_contact?.telefono || ''}
                            onChange={handleREFChange}
                          />
                          <input
                            type="text"
                            id="admin_contact_email"
                            name="admin_contact_email"
                            placeholder="Email"
                            className="form-control mb-2"
                            value={formData?.admin_contact?.email || ''}
                            onChange={handleREFChange}
                          />
                  </div>
                  <div className="col-md-6">
                        <label htmlFor="admin_contact" className="form-label text-secondary">
                            <PersonFill className="mr-2"/><small>IT</small>
                          </label>
                          <input
                            type="text"
                            id="it_contact_nome"
                            name="it_contact_nome"
                            placeholder="Nome"
                            className="form-control mb-2"
                            value={formData?.it_contact?.nome || ''}
                            onChange={handleREFChange}
                          />
                          <input
                            type="text"
                            id="it_contact_telefono"
                            name="it_contact_telefono"
                            placeholder="Numero di telefono"
                            className="form-control mb-2"
                            value={formData?.it_contact?.telefono || ''}
                            onChange={handleREFChange}
                          />
                          <input
                            type="text"
                            id="it_contact_email"
                            name="it_contact_email"
                            placeholder="Email"
                            className="form-control mb-2"
                            value={formData?.it_contact?.email || ''}
                            onChange={handleREFChange}
                          />
                  </div>
                </div>
              </div>
            </div>
            */}
            {/* Sezione Moduli e Integrazioni */}
            <div className="card mb-4 rounded-0 border-0">
              <div className="card-header bg-transparent border-bottom">
                <span className="text-secondary">
                  <Diagram2Fill className="mr-2" />
                  Moduli e Integrazioni
                </span>
              </div>
              <div className="card-body">
                <div className="row">
                  {/* --- MODULI --- OLD IMPLEMENTATION
                  <div className="col-md-6">
                    <h6 className="text-secondary mb-3">Moduli</h6>
                    <ListGroup className="mb-3">
                      {formData?.infrastructure?.modules?.map((modulo, index) => (
                        <ListGroup.Item key={index} className="d-flex align-items-center">
                          <div className="flex-grow-1 me-2">
                            <select
                              className="form-select"
                              value={modulo || ''}
                              onChange={(e) => handleItemChange(index, 'modules', e)}
                            >
                              <option value="">Scegli un Modulo...</option>
                              {moduli.map((m) => (
                                <option key={m.brand} value={m.brand}>
                                  {m.brand
                                    .replace(/^moduli_infinity_/, "")
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, c => c.toUpperCase())}
                                </option>
                              ))}
                            </select>
                          </div>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Elimina Modulo</Tooltip>}>
                            <button
                              type="button"
                              className="btn btn-link text-danger p-0"
                              onClick={() => handleRemoveItem(index, 'modules')}
                            >
                              <TrashFill />
                            </button>
                          </OverlayTrigger>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                    <OverlayTrigger placement="top" overlay={<Tooltip>Aggiungi Modulo</Tooltip>}>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => handleAddItem('modules')}
                      >
                        <PlusCircleFill className="me-1" />
                        Aggiungi Modulo
                      </button>
                    </OverlayTrigger>
                  </div>
                  */}
                  {/* MODULI in sola lettura (nuvolette) */}
                  <div className="col-md-6">
                    <h6 className="text-secondary mb-2">Integrazioni già inserite</h6>
                    {predefinedIntegrations.length === 0 && (
                      <div className="text-muted mb-3">
                        <small>Nessuna integrazione presente.</small>
                      </div>
                    )}

                    {/* Elenco integrazioni scelte (nuvolette) */}
                    <div className="mb-3">
                      {integratedBrands.map((brand, idx) => (
                        <span
                          key={idx}
                          className="badge d-inline-flex align-items-center bg-light text-dark border me-2 mb-2"
                          style={{ fontSize: '0.85rem' }}
                        >
                          <CloudCheckFill className="me-1 text-info" />
                          {brand.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}

                          {/* Pulsante per rimuovere l'integrazione */}
                          <OverlayTrigger placement="top" overlay={<Tooltip>Rimuovi integrazione</Tooltip>}>
                            <button
                              type="button"
                              className="btn btn-link p-0 ms-2 text-danger"
                              onClick={() => handleRemoveIntegration(brand)}
                            >
                              <TrashFill />
                            </button>
                          </OverlayTrigger>
                        </span>
                      ))}
                    </div>
                    <h6 className="text-secondary mb-2">Moduli già inseriti</h6>
                    {formData?.infrastructure?.modules?.length === 0 && (
                      <div className="text-muted mb-3">
                        <small>Nessun modulo presente.</small>
                      </div>
                    )}

                    <div className="mb-3">
                      {formData?.infrastructure?.modules?.map((modulo, idx) => {
                        // Se i moduli sono salvati come brand (es. "moduli_infinity_crm"), formattiamoli
                        const displayedName = modulo
                          .replace(/^moduli_infinity_/, "")
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, c => c.toUpperCase());

                        return (
                          <span
                            key={idx}
                            className="badge d-inline-flex align-items-center bg-light text-dark border me-2 mb-2"
                            style={{ fontSize: '0.85rem' }}
                          >
                            <CloudCheckFill className="me-1 text-info" />
                            {displayedName}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* --- INTEGRAZIONI --- */}
                  {/* Integrazioni predefinite + nuove integrazioni */}
                  <div className="col-md-6">



                    {/* Sezione per aggiungere NUOVE integrazioni */}
                    <div className="card shadow-sm">
                      <div className="card-header bg-light">
                        <CloudPlusFill className="me-1 text-primary" />
                        Aggiungi Nuove Integrazioni
                      </div>
                      <div className="card-body p-3">
                        <ListGroup className="mb-3">
                          {newIntegrations.map((brand, index) => (
                            <ListGroup.Item key={index} className="d-flex align-items-center">
                              <div className="flex-grow-1 me-2">
                                <input
                                  type="text"
                                  className="form-control bg-white"
                                  value={brand
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, c => c.toUpperCase())}
                                  disabled
                                />
                              </div>
                              <OverlayTrigger placement="top" overlay={<Tooltip>Rimuovi integrazione</Tooltip>}>
                                <button
                                  type="button"
                                  className="btn btn-link text-danger p-0"
                                  onClick={() => handleRemoveNewIntegration(index)}
                                >
                                  <TrashFill />
                                </button>
                              </OverlayTrigger>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>

                        {/* Select per aggiungere un’altra integrazione */}
                        <div className="input-group">
                          <select
                            className="form-select"
                            defaultValue=""
                            onChange={handleSelectIntegration}
                          >
                            <option value="">Scegli un'Integrazione...</option>
                            {availableBrands.map((brand) => (
                              <option key={brand} value={brand}>
                                {brand
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, c => c.toUpperCase())}
                              </option>
                            ))}
                          </select>

                        </div>
                      </div>
                    </div>
                  </div>
                  {/* fine col-md-6 */}
                </div>{/* fine row */}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'companies' && (
          <CompaniesManager />
        )}
        {activeTab === 'servers' && <ServersManager />}
        {/* -- 
            Per avere il pulsante di “Inserisci” o “Salva Modifiche” 
            solo nella sezione “companies”, lo mostriamo a condizione che 
            activeTab === 'companies'. 
        -- */}
        {(activeTab === 'servers') && (
          <button type="submit"
            disabled={submitDisabled}
            className="btn btn-success text-white mt-4 text-decoration-none"
            style={{ float: 'right' }}
          >
            <Save className="me-2" />
            {action === 'edit' ? ' Salva le Modifiche' : ' Inserisci un Nuovo Gruppo'}
          </button>
        )}
      </form>
      <div className="d-flex justify-content-between mt-3">
        {/* Freccia sinistra */}
        {currentIndex > 0 && (
          <div
            onClick={handlePrev}
            style={{
              position: 'fixed',
              bottom: '25%',
              left: '10px',
              transform: 'translateY(-40%)',
              fontSize: '3rem',
              cursor: 'pointer',
              zIndex: 9999,
              userSelect: 'none'
            }}
            className="text-primary"
          >
            <ArrowLeftCircleFill />
          </div>
        )}

        {/* Freccia destra */}
        {currentIndex < TABS.length - 1 && (
          <div
            onClick={handleNext}
            style={{
              position: 'fixed',
              bottom: '25%',
              right: '10px',
              transform: 'translateY(-40%)',
              fontSize: '3rem',
              cursor: 'pointer',
              zIndex: 9999,
              userSelect: 'none'
            }}
            className="text-primary"
          >
            <ArrowRightCircleFill />
          </div>
        )}
      </div>
      {showDiskModal &&
        <DiskModal
          show={showDiskModal}
          handleClose={(v) => dispatch({ type: 'group/setShowDiskModal', payload: v })}
        />
      }
      <SuccessModal />
      <ImportModal show={showImportModal} handleClose={() => setShowImportModal(false)} />

    </GroupLayout>
  );
};

export default DataManager;
