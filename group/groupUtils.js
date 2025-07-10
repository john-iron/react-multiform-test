// groupUtils.js
/**
 * Costruisce il formData iniziale (in caso di "nuovo" group)
 * o aggiorna i campi esistenti (in caso di "edit"/"upgrade").
 */
export function buildFormData(data, action, revNo, userData, serverDefaults) {
  // 1) Se data è nullo => costruiamo la struttura base
  //alert(serverDefaults);

  let newFormData;
  if (!data) {
    newFormData = {
      revision_number: '1',
      revision_type: 'Creazione',
      revisor_name: userData?.name || '',
      revision_date: new Date().toISOString().slice(0, 10),
      tenant_name: '',
      tenant_name_auto: '',
      companies_list: [
        {
          company_name: '',
          tipologia: '',
          p_iva: '',
          brands: [],
          license_infinity: '0',
          license_web: '0',
          note: '',
        },
      ],
      infrastructure: {
        type: 'CLOUD_RICCA',
        server_hint: 'DB',
        modules: [
          'moduli_infinity_infinity',
          'moduli_infinity_file_dcs',
          'moduli_infinity_sms',
          'moduli_infinity_ddbengine',
          'moduli_infinity_check_partita_iva',
          'moduli_infinity_fattura_elettronica_nuovo_servizio',
          'moduli_infinity_cadi',
          'smtp_sender',
        ],
        integrations: [
          'eurotax',
          'infocar',
          'pfu',
          'download_aggiornamenti',
          'servizio_licenze',
          'collector',
          'caricamento_immagini',
          'image_gui',
        ],
        server_list: [],
        hasMikrotik: false,
        hasVLAN: false,
      },
      recalc: false,
      admin_contact: { nome: '', telefono: '', email: '' },
      it_contact: { nome: '', telefono: '', email: '' },
    };
  } else {
    // 2) Altrimenti ricicliamo i dati esistenti,
    //    ma aggiorniamo i campi di revisione
    newFormData = {
      ...data,
      revision_number:
        action === 'upgrade'
          ? String(Number(revNo))
          : data?.revision_number || '1',
      revision_type:
        action === 'upgrade'
          ? 'Modifica'
          : data?.revision_type || 'Creazione',
      revisor_name: userData?.name || '',
      revision_date: new Date().toISOString().slice(0, 10),
      recalc: false,
    };
  }

  // 3) Assicuriamoci che esista l'infrastructure e server_list
  if (!newFormData.infrastructure) {
    newFormData.infrastructure = {
      type: 'CLOUD_RICCA',
      server_list: [],
      modules: [],
      integrations: [],
      server_hint: 'DB',
    };
  }
  if (!Array.isArray(newFormData.infrastructure.server_list)) {
    newFormData.infrastructure.server_list = [];
  }

  // 4) Recuperiamo i default per "DB" dal serverDefaults
  const matchedDefault = serverDefaults?.find(sd => sd.role === 'DB');

  // Se matchedDefault non esiste, useremo fallback
  const defaultCpu = matchedDefault?.defaultCpu;
  const defaultRam = matchedDefault?.defaultRam;
  const defaultStatus = matchedDefault?.defaultStatus || 'necessario';
  const defaultDiskList = matchedDefault?.defaultDiskList?.length
    ? matchedDefault.defaultDiskList.map(d => ({ ...d, _id: null }))
    : [
      { letter: 'C', size: '150' },
      { letter: 'D', size: '150' },
      { letter: 'F', size: '150' },
    ];

  // 5) Cerchiamo se esiste già un server con role="DB"
  const dbIndex = newFormData.infrastructure.server_list.findIndex(
    (s) => s.role === 'DB'
  );

  // 6) Se NON c'è nessun DB, lo aggiungiamo con i valori presi dai default
  if (dbIndex < 0) {
    newFormData.infrastructure.server_list.push({
      role: 'DB',
      disk_list: defaultDiskList,
      cpu: defaultCpu,
      ram: defaultRam,
      status: defaultStatus,
      _id: null,
    });
  }
  // Se esiste già un DB, NON lo tocchiamo:
  // (nessuna sovrascrittura, lasciamo i dati dell'utente)

  return newFormData;
}



/**
 * Calcola un hint (stringa) in base ai ruoli attivi nella lista server
 */
export function computeServerHint(serverList) {
  const roles = serverList.map(server => {
    if (server.role.startsWith('TS')) return 'TS';
    if (server.role.startsWith('CX')) return 'CX';
    return server.role;
  });
  return [...new Set(roles)].join('+');
}

/**
 * Calcola quanti TS servono. (Funzione helper)
 */
export function calculateTSCount(totalLicenses, selectedServer) {
  // Capienza di un singolo TS
  const capacity = selectedServer === 'CLOUD_RICCA' ? 30 : 25;
  const threshold = Math.floor(capacity / 3);      // 8 per Ricca, 6 per altri

  // Server “pieni” richiesti e residuo
  let tsRequired = Math.floor(totalLicenses / capacity);
  const leftover = totalLicenses % capacity;

  // Valore di partenza: i necessari già calcolati
  let tsRecommended = tsRequired;

  // ------------------------
  //  Caso A · 0 licenze
  // ------------------------
  if (totalLicenses === 0) {
    return { tsRequired: 0, tsRecommended: 0 };
  }

  // -------------------------------------------------
  //  Caso B · Fino a una “fetta” di soglia (≤ ⅓)
  //          → nessun TS obbligatorio,
  //            ma ne consigliamo uno solo.
  // -------------------------------------------------
  if (totalLicenses <= threshold) {
    return { tsRequired: 0, tsRecommended: 1 };
  }

  // -------------------------------------------------
  //  Caso C · Oltre la soglia
  //          → server pieni + (eventuale) extra
  // -------------------------------------------------
  const extra = leftover > threshold ? 1 : 0;
  tsRecommended = tsRequired + extra;

  console.log(`TS Required: ${tsRequired}, TS Recommended: ${tsRecommended}`);
  return { tsRequired, tsRecommended };
}


/**
 * Costruisce i "facts" da passare al rules-engine, partendo dai dati
 * delle companies e dalle integrazioni selezionate.
 */
export function buildFactsFromGroup(serverList, companiesList, integrations, selectedServer) {
  let totalLicenses = 0;
  let totalLicensesWeb = 0;
  let brands = new Set();
  let tipologie = new Set();

  let hasTS = false;
  let hasProxy = false;
  let hasMikrotik = false;
  let hasVLAN = false;
  let hasWebapp = false;
  let hasNissan = false;
  let hasRenault = false;
  let hasPSA = false;
  let hasCX = false;
  let biActive = false;
  let docActive = false;
  let docType = '';

  serverList.forEach(server => {
    if (server.role === 'TS') hasTS = true;
    if (server.role === 'PROXY') hasProxy = true;
    if (server.role === 'WEBAPP') hasWebapp = true;
  });


  companiesList.forEach(company => {
    totalLicenses += parseInt(company.license_infinity || 0, 10);
    totalLicensesWeb += parseInt(company.license_web || 0, 10);

    (company.brands || []).forEach(item => {
      // 1) Ricavo desc sia da oggetto sia da stringa
      let desc = '';
      let proxyFlag = false;
      let mikrotikFlag = false;
      if (item && typeof item === 'object') {
        desc = `${item.description || item.code || ''}`.toUpperCase().trim();
        proxyFlag = !!item.hasProxy;
        mikrotikFlag = !!item.hasMikrotik;

      } else if (typeof item === 'string') {
        desc = item.toUpperCase().trim();
      }
      // 2) Alert sempre
      //alert(JSON.stringify(item, null, 2));

      // 3) Se c’è flag hasProxy
      if (proxyFlag) {
        console.warn(`Brand ${desc} hasProxy: ${proxyFlag}`);
        hasProxy = proxyFlag;
      }
      // 3) Se c’è flag hasMikrotik
      if (mikrotikFlag && selectedServer === 'CLOUD_RICCA') {
        console.warn(`Brand ${desc} hasMikrotik: ${mikrotikFlag}`);
        hasMikrotik = mikrotikFlag;
      }

      //alert(desc);

      // 4) Aggiungo al set e flag specifici
      brands.add(desc);
      if (desc === 'NISSAN') {
        //alert("DENTRO IF: " + desc);
        hasVLAN = true;
        hasNissan = true;
      }

      if (desc === 'RENAULT') hasRenault = true;
      if (['PEUGEOT', 'CITROEN', 'DS', 'OPEL'].includes(desc)) hasPSA = true;
    });

    hasCX = hasNissan || hasRenault || hasPSA;

    tipologie.add(company.tipologia);
  });

  const { tsRequired, tsRecommended } = calculateTSCount(totalLicenses, selectedServer);
  hasTS = tsRequired > 0;

  if (integrations.includes('arxivar_server')) {
    docActive = true;
    docType = 'arxivar';
  } else if (integrations.includes('documentale_zucchetti')) {
    docActive = true;
    docType = 'zucchetti';
  }

  if (integrations.includes('bi_saas_qlik_datatransfer')) {
    biActive = true;
  }



  return {
    totalLicenses,
    totalLicensesWeb,
    selectedServer,
    brandCount: brands.size,
    dealerType: Array.from(tipologie) || '',
    hasTS,
    hasProxy,
    hasWebapp,
    hasNissan,
    hasRenault,
    hasMikrotik,
    hasVLAN,
    hasPSA,
    hasOtherBrand: Array.from(brands).some(b => b !== 'NISSAN' && b !== 'RENAULT'),
    tsRequired,
    tsRecommended,
    biActive,
    hasCX,
    docActive,
    docType
  };
}
