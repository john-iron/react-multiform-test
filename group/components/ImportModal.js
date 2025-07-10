// src/features/group/components/ImportModal.jsx
import React, { useState, useRef } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { updateFormData, setSelectedServer } from '../groupSlice';
import { Upload } from 'react-bootstrap-icons'; // Importa l'icona se vuoi usarla nel bottone

const ImportModal = ({ show, handleClose }) => {
  const dispatch = useDispatch();
  const { formData: currentFormData } = useSelector(state => state.group);

  // STATO MODIFICATO: non più jsonInput, ma il file e il suo contenuto
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [error, setError] = useState('');

  // Ref per l'input nascosto (per lo stile avanzato)
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      // L'utente ha annullato la selezione
      setSelectedFile(null);
      setFileContent('');
      return;
    }

    if (file.type !== "application/json") {
      setError("Per favore, seleziona un file JSON (.json).");
      setSelectedFile(null);
      setFileContent('');
      return;
    }

    setSelectedFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      // e.target.result contiene il testo del file
      setFileContent(e.target.result);
    };
    reader.onerror = (e) => {
      console.error("Errore durante la lettura del file:", e);
      setError("Impossibile leggere il file selezionato.");
      toast.error("Errore nella lettura del file.");
    };
    reader.readAsText(file); // Avvia la lettura del file come testo
  };

  const handleImport = () => {
    // La validazione ora controlla se un file è stato caricato e letto
    if (!selectedFile || !fileContent) {
      setError('Per favore, seleziona e carica un file JSON valido.');
      return;
    }

    try {
      // La logica di parsing rimane quasi identica, ma usa `fileContent`
      const cleanedJson = fileContent.trim().replace(/^\uFEFF/, ''); // Rimuove il BOM
      const importedData = JSON.parse(cleanedJson);

      if (!importedData.companies_list || !importedData.infrastructure) {
        throw new Error("Il JSON non ha la struttura attesa. Mancano 'companies_list' o 'infrastructure'.");
      }

      // La tua logica di sanificazione e unione dati rimane INVARIATA
      const sanitizedCompanies = (importedData.companies_list || []).map(c => ({ ...c, brands: Array.isArray(c.brands) ? c.brands : (c.brands ? [c.brands] : []) }));
      const sanitizedServers = (importedData.infrastructure.server_list || []).map(s => ({ ...s, disk_list: Array.isArray(s.disk_list) ? s.disk_list : (s.disk_list ? [s.disk_list] : []) }));
      const defaultModules = currentFormData?.infrastructure?.modules || [];
      const importedModules = importedData.infrastructure?.modules || [];
      const defaultIntegrations = currentFormData?.infrastructure?.integrations || [];
      const importedIntegrations = importedData.infrastructure?.integrations || [];
      const combinedModules = [...new Set([...defaultModules, ...importedModules])];
      const combinedIntegrations = [...new Set([...defaultIntegrations, ...importedIntegrations])];

      const newFormData = {
        tenant_name: importedData.tenant_name || '',
        tenant_name_auto: (importedData.tenant_name || '').toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, ''),
        revision_number: importedData.revision_number || '1.0',
        revision_type: importedData.revision_type || 'Importazione',
        revisor_name: importedData.revisor_name || currentFormData?.revisor_name || '',
        admin_contact: importedData.admin_contact || { nome: '', telefono: '', email: '' },
        it_contact: importedData.it_contact || { nome: '', telefono: '', email: '' },
        companies_list: sanitizedCompanies,
        infrastructure: {
          ...importedData.infrastructure,
          server_list: sanitizedServers,
          modules: combinedModules,
          integrations: combinedIntegrations,
        },
        recalc: true,
      };

      dispatch(updateFormData(newFormData));
      if (newFormData.infrastructure.type) {
        dispatch(setSelectedServer(newFormData.infrastructure.type));
      }

      toast.success('Dati importati con successo!');
      handleCloseAndReset(); // Chiudi e resetta lo stato

    } catch (e) {
      console.error("Errore durante l'importazione del JSON:", e);
      setError(`Errore nel parsing del JSON: ${e.message}`);
      toast.error("Errore durante l'importazione. Controlla la console.");
    }
  };

  const handleCloseAndReset = () => {
    // Funzione helper per resettare tutto quando si chiude il modale
    handleClose();
    setSelectedFile(null);
    setFileContent('');
    setError('');
    // Resetta il valore dell'input per permettere di ricaricare lo stesso file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Funzione per triggerare l'input file cliccando sul bottone custom
  const handleUploadButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    // Usa la funzione di reset personalizzata per `onHide`
    <Modal show={show} onHide={handleCloseAndReset} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Importa Quotazione da File JSON</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Seleziona il file <code>companies_import.json</code> generato dallo script di audit.</p>

        {/* Input file nascosto, controllato tramite ref */}
        <Form.Control
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="d-none" // Nascondiamo l'input di default
        />

        {/* Bottone custom per triggerare l'upload */}
        <Button variant="outline-secondary" onClick={handleUploadButtonClick}>
          <Upload className="me-2" />
          Scegli un file...
        </Button>

        {/* Mostra il nome del file selezionato */}
        {selectedFile && <p className="mt-2 mb-0">File selezionato: <strong>{selectedFile.name}</strong></p>}

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCloseAndReset}>
          Annulla
        </Button>
        <Button variant="primary" onClick={handleImport} disabled={!selectedFile}>
          Carica e Applica
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImportModal;