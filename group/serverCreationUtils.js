/**
 * Create or update a server preserving existing settings, engine parameters,
 * defaults or fallbacks.
 */
export function createOrUpdateServer({
  role,
  existingServerList,
  serverDefaults,
  engineParams = {},
  //fallbackCpu = '8',
  //fallbackRam = '16',
  //fallbackCSize = '200GB',
  status
}) {
  // 0) Supporta sia disk_list sia diskList
  const ruleDiskList = engineParams.disk_list ?? engineParams.diskList;

  // 1) Cerca server già esistente
  const existing = existingServerList.find(s => s.role === role);

  // 2) Determina il “baseRole” (TS, CX, …)
  let baseRole = role;
  if (role.startsWith('TS')) baseRole = 'TS';
  if (role.startsWith('CX_')) baseRole = 'CX';

  // 3) Default di riferimento
  const matchedDefault =
    serverDefaults.find(sd => sd.role === baseRole) || {};

  // 4) CPU / RAM / STATUS (logica invariata)
  let finalStatus;
  if (engineParams.status !== undefined) {
    finalStatus = engineParams.status || 'necessario';
  } else if (existing) {
    finalStatus =
      existing.status || matchedDefault.defaultStatus || 'necessario';
  } else {
    finalStatus = matchedDefault.defaultStatus || status || 'necessario';
  }

  const finalCpu =
    (existing && existing.cpu) ||
    engineParams.cpu ||
    matchedDefault.defaultCpu;

  const finalRam =
    (existing && existing.ram) ||
    engineParams.ram ||
    matchedDefault.defaultRam;

  // 5) DISCHI – nuova logica unificata
  let finalDiskList = [];

  if (existing) {
    /*  5.a  SERVER ESISTENTE  ➔  **mantieni** tutti i dischi esistenti,
        modificando solo l’unità C se il default (o il fallback) differisce.
        Qualsiasi disk_list passato nelle regole viene **ignorato**: la
        priorità è la preservazione dello stato reale della macchina.          */
    finalDiskList = existing.disk_list.map(d => ({
      ...d,
      size:
        d.letter === 'C'
          ? matchedDefault.defaultDiskList?.[0]?.size || '100GB'
          : d.size
      // _id resta invariato: serve per riconciliare su Mongo
    }));
  } else {
    /*  5.b  NUOVO SERVER  ➔  scegli nell’ordine:
            1. disk_list specificata dalla regola (se presente)
            2. default del ruolo
            3. fallback “C” da 200 GB (o quello passato)                       */
    if (ruleDiskList) {
      finalDiskList = ruleDiskList.map(d => ({ ...d, _id: null }));
    } else if (
      matchedDefault.defaultDiskList &&
      matchedDefault.defaultDiskList.length
    ) {
      finalDiskList = matchedDefault.defaultDiskList.map(d => ({
        ...d,
        _id: null
      }));
    } else {
      finalDiskList = [{ letter: 'C', size: '100GB', _id: null }];
    }
  }

  return {
    role,
    status: finalStatus,
    _id: existing ? existing._id : null,
    cpu: finalCpu,
    ram: finalRam,
    disk_list: finalDiskList
  };
}


/**
 * Initialize or preserve DB servers
 */
export function initializeDBServer(existingServerList, serverDefaults) {
  const matchedDefault = serverDefaults.find(sd => sd.role === 'DB') || {};

  const dbServers = existingServerList
    .filter(s => s.role === 'DB')
    .map(server => ({
      ...server,
      status: server.status || matchedDefault.defaultStatus || 'necessario',
      cpu: server.cpu || matchedDefault.defaultCpu,
      ram: server.ram || matchedDefault.defaultRam,
      disk_list: server.disk_list.map(d => ({
        ...d,
        size: d.letter === 'C'
          ? (matchedDefault.defaultDiskList && matchedDefault.defaultDiskList[0].size) || '150'
          : d.size
      }))
    }));

  if (!dbServers.length) {
    dbServers.push({
      role: 'DB',
      status: matchedDefault.defaultStatus || 'necessario',
      cpu: matchedDefault.defaultCpu,
      ram: matchedDefault.defaultRam,
      disk_list: matchedDefault.defaultDiskList?.length
        ? matchedDefault.defaultDiskList.map(d => ({ ...d, _id: null }))
        : [{ letter: 'C', size: '150', _id: null }],
      _id: null
    });
  }

  return dbServers;
}

/**
 * Add TS servers according to required vs recommended
 */
export function addTSServers(
  newList,
  engineParams,          // viene da tsEvent.params
  tsRequired,
  tsRecommended,
  existingServerList,
  serverDefaults
) {

  // 1) Valore di default dettato dall’event (se presente)
  const baseStatus = engineParams.status; // può essere 'necessario' o 'consigliato'
  for (let i = 0; i < tsRecommended; i++) {
    const status = i < tsRequired ? 'necessario' : 'consigliato';
    const role = `TS${i + 1}`;

    const params = { ...engineParams, status };
    const server = createOrUpdateServer({
      role,
      existingServerList,
      serverDefaults,
      engineParams: params,
      status
    });
    newList.push(server);
  }
}


/**
 * Add single WEBAPP server
 */
export function addWebAppServer(newList, engineParams, existingServerList, serverDefaults) {
  const status = engineParams.status || 'necessario';
  const server = createOrUpdateServer({
    role: 'WEBAPP',
    existingServerList,
    serverDefaults,
    engineParams: { ...engineParams, status },
    status
  });
  newList.push(server);
}

/**
 * Add single BI server
 */
export function addBIServer(newList, engineParams, existingServerList, serverDefaults) {
  const status = engineParams.status || 'necessario';
  const server = createOrUpdateServer({
    role: 'BI',
    existingServerList,
    serverDefaults,
    engineParams: { ...engineParams, status },
    status
  });
  newList.push(server);
}

/**
 * Add single DOC server
 */
export function addDocServer(newList, engineParams, existingServerList, serverDefaults) {
  const status = engineParams.status || 'necessario';
  const server = createOrUpdateServer({
    role: 'DOC', existingServerList,
    serverDefaults,
    engineParams: { ...engineParams, status },
    status
  });
  newList.push(server);
}

/**
 * Add CX servers per brand (excludes NISSAN)
 */
export function addCXServers(newList, engineParams, roleHint, existingServerList, serverDefaults, companiesList) {
  // 1. Centralizziamo tutti i gruppi di brand in un unico oggetto.
  //    Questo rende facile aggiungere o modificare gruppi in futuro.
  const brandGroups = {
    PSA: ['PEUGEOT', 'CITROEN', 'DS', 'OPEL'],
    FCA: ['FIAT', 'FIAT (SOLO SERVICE)', 'ALFA ROMEO', 'ALFA ROMEO (SOLO SERVICE)', 'LANCIA', 'LANCIA (SOLO SERVICE)', 'JEEP', 'JEEP (SOLO SERVICE)', 'ABARTH', 'MASERATI'],
    VGI: ['VOLKSWAGEN', 'AUDI', 'SEAT', 'CUPRA', 'SKODA', 'PORSCHE', 'LAMBORGHINI', 'BUGATTI'],
    RENAULT: ['RENAULT', 'DACIA', 'ALPINE'],
    JLR: ['JAGUAR', 'LAND ROVER']
  };

  // 2. Usiamo un Set per tenere traccia dei gruppi già aggiunti.
  //    È più efficiente e pulito di una serie di flag booleani (come 'hasPSA', 'hasFCA', ecc.).
  const addedGroups = new Set();

  companiesList.forEach(company => {
    const brands = (company.brands || []).map(b => typeof b === 'string' ? b : b.description || b.code || b._id).map(b => b.toUpperCase());
    const allowed = brands.filter(b => roleHint !== 'CX' || b !== 'NISSAN');

    allowed.forEach(brand => {
      // 3. Logica generalizzata per trovare il gruppo del brand.
      //    Cerca il brand in ogni array dell'oggetto 'brandGroups'.
      //    Se lo trova, restituisce il nome del gruppo (es. "PSA").
      //    Altrimenti, restituisce il nome del brand originale.
      const finalBrand = Object.keys(brandGroups).find(group => brandGroups[group].includes(brand)) || brand;

      const status = engineParams.status || 'necessario';
      const suffix = (company.company_name || '').replace(/\W+/g, '');
      const role = `CX_${finalBrand}_${suffix}`;

      const server = createOrUpdateServer({
        role,
        existingServerList,
        serverDefaults,
        engineParams: { ...engineParams, status },
        status
      });

      // 4. Logica generalizzata per aggiungere il server.
      const isGroup = brandGroups.hasOwnProperty(finalBrand);

      if (isGroup) {
        // Se 'finalBrand' è un gruppo (es. "PSA", "FCA"), lo aggiungiamo solo una volta.
        if (!addedGroups.has(finalBrand)) {
          newList.push(server);
          addedGroups.add(finalBrand); // Segna il gruppo come aggiunto.
        }
      } else {
        // Se è un brand non raggruppato, lo aggiungiamo sempre.
        newList.push(server);
      }
    });
  });
}

/**
 * Add single PROXY server
 */
export function addProxyServer(newList, engineParams, existingServerList, serverDefaults) {
  const status = engineParams.status || 'necessario';
  const server = createOrUpdateServer({
    role: 'PROXY',
    existingServerList,
    serverDefaults,
    engineParams: { ...engineParams, status },
    status
  });
  newList.push(server);
}
