// src/features/group/components/CompaniesManager.jsx
import React, { useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import {
  addCompany,
  removeCompany,
  addBrand,
  removeBrand,
  updateBrand,
  updateCompanyField,
  setSubmitDisabled,
} from '../groupSlice';

import {
  checkCompanyPiva,
} from '../groupThunks';

import { BuildingFill, InfoCircleFill, PlusCircleFill, TrashFill } from 'react-bootstrap-icons';

function generateFakePIVA() {
  // Genera 4 cifre random per completare dopo "900"
  const randomFourDigits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const firstBlock = '900' + randomFourDigits; // Totale: 7 cifre (3+4)
  const officeCode = '000'; // 3 cifre fisse
  const partial = firstBlock + officeCode; // Ora siamo a 10 cifre

  // Ora calcoliamo il codice di controllo (ultima cifra, per fare 11 cifre)
  let sum = 0;
  for (let i = 0; i < partial.length; i++) {
    let num = parseInt(partial.charAt(i), 10);
    if (i % 2 === 0) { // cifre in posizione pari (0-based) vengono raddoppiate
      num *= 2;
      if (num > 9) num -= 9;
    }
    sum += num;
  }
  const controlDigit = (10 - (sum % 10)) % 10;

  return partial + controlDigit; // 10 + 1 = 11 cifre finali
}




const CompaniesManager = () => {
  const dispatch = useDispatch();
  const { formData, brands } = useSelector(state => state.group);
  const [companyNameErrors, setCompanyNameErrors] = useState({});
  const [companyPivaErrors, setCompanyPivaErrors] = useState({});


  // Handler per aggiornare un campo della company (es. company_name)
  const handleCompanyChange = (companyIndex, e) => {
    const { name, value } = e.target;
    dispatch(updateCompanyField({ companyIndex, field: name, value }));
  };

  // Handler per il cambio di tipologia; in questo caso, il nome del campo è "tipologia"
  const handleTipologiaChange = (companyIndex, e) => {
    const { name, value } = e.target;
    dispatch(updateCompanyField({ companyIndex, field: name, value }));
    //dispatch(updateFormData({ recalc: true }));
  };

  const handleAddCompany = () => {
    dispatch(setSubmitDisabled(true));
    dispatch(addCompany());
  };

  const handleRemoveCompany = (companyIndex) => {
    dispatch(removeCompany(companyIndex));
    //dispatch(updateFormData({ recalc: true }));
  };

  const handleAddBrand = (companyIndex, brandId) => {
    dispatch(addBrand({ companyIndex, brand: brandId }));
  };

  const handleRemoveBrand = (companyIndex, brandIndex) => {
    dispatch(removeBrand({ companyIndex, brandIndex }));
    //dispatch(updateFormData({ recalc: true }));
  };

  const handleBrandChange = (companyIndex, brandIndex, e) => {
    dispatch(updateBrand({
      companyIndex,
      brandIndex,
      value: e.target.value
    }));
    //dispatch(updateFormData({ recalc: true }));
  };

  // Gestione blur per controlli asincroni (come validazione di duplicati)

  const handleCompanyPivaBlur = async (index, e) => {
    const { value } = e.target;
    const company = formData.companies_list[index];

    // Se non c'è valore => errore
    if (!value) {
      dispatch(setSubmitDisabled(true));
      return;
    }

    // Validazione locale
    if (!/^\d{11}$/.test(value)) {
      setCompanyPivaErrors(prev => ({
        ...prev,
        [index]: "La partita IVA deve contenere esattamente 11 caratteri numerici"
      }));
      dispatch(setSubmitDisabled(true));
      return;
    }

    // ⚠️ Se esiste _id → azienda esistente: salta controllo duplicato
    if (company._id) {
      setCompanyPivaErrors(prev => ({ ...prev, [index]: null }));
      dispatch(setSubmitDisabled(false));
      return;
    }

    // Nuova azienda → controlla duplicato
    try {
      const isDuplicate = await dispatch(checkCompanyPiva(value)).unwrap();
      setCompanyPivaErrors(prev => ({
        ...prev,
        [index]: isDuplicate ? "Partita IVA già esistente" : null
      }));
      //alert(isDuplicate);
      dispatch(setSubmitDisabled(isDuplicate));
    } catch (error) {
      console.error("Errore controllo P.IVA:", error);
    }
  };
  const handleCompanyNameBlur = async (index, e) => {
    const { value } = e.target;

    // Se non c'è valore => errore
    if (!value) {
      setCompanyNameErrors(prev => ({
        ...prev,
        [index]: "Il campo non può essere vuoto!"
      }));
      dispatch(setSubmitDisabled(true));
      return;
    }
    setCompanyNameErrors(prev => ({ ...prev, [index]: null }));
    dispatch(setSubmitDisabled(false));
    return;


  };

  if (!formData) return null;

  return (
    <div>
      {formData.companies_list.map((company, companyIndex) => (
        <div key={companyIndex} className="card mb-4 rounded-0">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="text-primary mb-0">
              <BuildingFill className="mr-2" />
              Azienda n° {companyIndex + 1}
            </h5>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-add-company">Elimina Azienda</Tooltip>}
            >
              <button
                type="button"
                onClick={() => handleRemoveCompany(companyIndex)}
                className="btn btn-link text-danger text-decoration-none"
              >
                <TrashFill />
              </button>
            </OverlayTrigger>
          </div>
          <div className="card-body">
            <div className="container">
              <div className="row">
                {/* Informazioni Azienda */}
                <div className="col-12 mb-4">
                  <div className="card mb-4 rounded-0 border-0">
                    <div className="card-header bg-transparent border-bottom">
                      <span className="text-secondary">
                        <InfoCircleFill className="mr-2" />
                        Anagrafica Azienda
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-2">
                          <label htmlFor={`tipologia_${companyIndex}`} className="form-label text-secondary">
                            <small>Tipologia</small>
                          </label>
                          <select
                            id={`tipologia_${companyIndex}`}
                            name="tipologia"
                            className="form-control"
                            value={company.tipologia || ""}
                            onChange={(e) => handleTipologiaChange(companyIndex, e)}
                          >
                            <option value="">Seleziona tipologia...</option>
                            <option value="Placca">Placca</option>
                            <option value="Concessionario">Concessionario</option>
                            <option value="Officina">Officina</option>
                            <option value="Ricambista">Ricambista</option>
                            <option value="Contabile">Contabile</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label htmlFor={`company_name_${companyIndex}`} className="form-label text-secondary">
                            <small>Nome Azienda*</small>
                          </label>
                          <input
                            type="text"
                            id={`company_name_${companyIndex}`}
                            name="company_name"
                            className={`form-control ${companyNameErrors[companyIndex] ? "is-invalid" : ""}`}
                            value={company.company_name}
                            onChange={(e) => handleCompanyChange(companyIndex, e)}
                            onBlur={(e) => handleCompanyNameBlur(companyIndex, e)}
                            pattern=".{3,}"
                            title="Il nome della'azienda deve essere composto da almeno 3 caratteri"
                            required
                          />
                          {companyNameErrors[companyIndex] && (
                            <div className="invalid-feedback">{companyNameErrors[companyIndex]}</div>
                          )}
                        </div>
                        <div className="col-md-4">
                          <label htmlFor={`p_iva_${companyIndex}`} className="form-label text-secondary d-flex justify-content-between align-items-center">
                            <small>P.IVA*</small>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                const fakePIVA = generateFakePIVA();
                                dispatch(updateCompanyField({ companyIndex, field: 'p_iva', value: fakePIVA }));
                                setCompanyPivaErrors(prev => ({ ...prev, [companyIndex]: null })); // reset eventuali errori
                                dispatch(setSubmitDisabled(false)); // abilita submit
                              }}
                            >
                              Genera
                            </button>
                          </label>
                          <input
                            type="text"
                            id={`p_iva_${companyIndex}`}
                            name="p_iva"
                            className={`form-control ${companyPivaErrors[companyIndex] ? "is-invalid" : ""}`}
                            value={company.p_iva}
                            onChange={(e) => handleCompanyChange(companyIndex, e)}
                            onBlur={(e) => handleCompanyPivaBlur(companyIndex, e)}
                            pattern="^\d{11}$"
                            title="La partita IVA deve essere numerica e composta da 11 cifre"
                            required
                          />
                          {companyPivaErrors[companyIndex] && (
                            <div className="invalid-feedback">{companyPivaErrors[companyIndex]}</div>
                          )}
                        </div>

                        <div className="col-md-1">
                          <label htmlFor={`license_infinity_${companyIndex}`} className="form-label text-secondary">
                            <small>Lic. Infinity</small>
                          </label>
                          <input
                            type="number"
                            id={`license_infinity_${companyIndex}`}
                            name="license_infinity"
                            className="form-control"
                            value={company.license_infinity}
                            onChange={(e) => handleCompanyChange(companyIndex, e)}
                          //onBlur={() => dispatch(updateFormData({ recalc: true }))}

                          />
                        </div>
                        <div className="col-md-1">
                          <label htmlFor={`license_web_${companyIndex}`} className="form-label text-secondary">
                            <small>Lic. Web</small>
                          </label>
                          <input
                            type="number"
                            id={`license_web_${companyIndex}`}
                            name="license_web"
                            className="form-control"
                            value={company.license_web}
                            onChange={(e) => handleCompanyChange(companyIndex, e)}
                          //onBlur={() => dispatch(updateFormData({ recalc: true }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="container">
              <div className="row">
                {/* Gestione Brand */}
                <div className="col-md-6 mb-4">
                  <div className="card mb-4 rounded-0 border-0">
                    <div className="card-header bg-transparent border-bottom">
                      <span className="text-secondary">
                        CM Mandati
                      </span>
                    </div>
                    <div className="card-body">
                      <h6 className="text-secondary mb-2">Mandati Selezionati</h6>
                      {company.brands.length === 0 && (
                        <div className="text-muted mb-3">
                          <small>Nessun mandato selezionato</small>
                        </div>
                      )}

                      {/* Badge (“nuvolette”) per ogni brand */}
                      <div className="mb-3">
                        {company.brands.map((brandId, brandIndex) => {
                          const fullBrand = brands.find(b =>
                            typeof brandId === 'object' ? b._id === brandId._id : b._id === brandId
                          );
                          return (
                            <span
                              key={brandIndex}
                              className="badge d-inline-flex align-items-center bg-light text-dark border me-2 mb-2"
                              style={{ fontSize: '0.85rem' }}
                            >
                              {fullBrand ? fullBrand.description : brandId}

                              {/* Pulsante Rimuovi brand */}
                              <OverlayTrigger placement="top" overlay={<Tooltip>Elimina Mandato</Tooltip>}>
                                <button
                                  type="button"
                                  className="btn btn-link p-0 ms-2 text-danger"
                                  onClick={() => handleRemoveBrand(companyIndex, brandIndex)}
                                >
                                  <TrashFill />
                                </button>
                              </OverlayTrigger>
                            </span>
                          )
                        })}
                      </div>

                      {/* Select per Aggiungere un nuovo brand */}
                      <div className="input-group">
                        <select
                          className="form-select"
                          defaultValue=""
                          onChange={(e) => {
                            const chosen = e.target.value;
                            if (!chosen) return; // se l'utente seleziona "vuoto"

                            // evita duplicati
                            if (company.brands.some(b => b._id === chosen)) {
                              alert("Mandato già presente!");
                              e.target.value = "";
                              return;
                            }
                            handleAddBrand(companyIndex, chosen);
                            e.target.value = "";
                          }}
                        >
                          <option value="">Aggiungi un Mandato...</option>
                          {brands.map(b => (
                            <option key={b._id} value={b._id}>{b.description}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="col-6 mb-4">
                  <div className="card mb-4 rounded-0 border-0">
                    <div className="card-header bg-transparent border-bottom">
                      <span className="text-secondary">
                        Note della Versione
                      </span>
                    </div>
                    <div className="card-body">
                      <textarea
                        id={`note_${companyIndex}`}
                        name="note"
                        className="form-control"
                        value={company.note}
                        onChange={(e) => handleCompanyChange(companyIndex, e)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="card-footer d-flex justify-content-between align-items-right">
            <OverlayTrigger placement="top" overlay={<Tooltip>Nuova Azienda</Tooltip>}>
              <button
                type="button"
                className="btn btn-link text-primary float-end mt-3"
                onClick={handleAddCompany}
              >
                <PlusCircleFill />
              </button>
            </OverlayTrigger>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompaniesManager;
