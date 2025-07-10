// domain/serverProposalEngine.js
import { Engine } from 'json-rules-engine';
import { buildFactsFromGroup, computeServerHint } from './groupUtils';
import {
  initializeDBServer,
  addTSServers,
  addWebAppServer,
  addBIServer,
  addDocServer,
  addCXServers,
  addProxyServer
} from './serverCreationUtils';

function toJsonRulesFormat(node) {
  if (node.type === 'rule') {
    return {
      fact: node.fact,
      operator: node.operator,
      value: node.value
    };
  }
  if (node.type === 'group') {
    const subConditions = node.children.map(toJsonRulesFormat);
    return node.groupType === 'all'
      ? { all: subConditions }
      : { any: subConditions };
  }
  return {};
}

export async function calcServerProposal({ formData, selectedServer, serverDefaults, ruleList }) {
  const existing = (formData.infrastructure && formData.infrastructure.server_list) || [];
  const companies = formData.companies_list || [];
  const integrations = (formData.infrastructure && formData.infrastructure.integrations) || [];

  // Build facts and engine
  const facts = buildFactsFromGroup(existing, companies, integrations, selectedServer);
  const engine = new Engine();
  ruleList.filter(r => r.enabled).forEach(rule => {
    engine.addRule({
      name: rule.name,
      conditions: toJsonRulesFormat(rule.conditions),
      priority: rule.priority,
      event: rule.event
    });
  });

  // Run engine
  const { events } = await engine.run(facts);

  // 1) Always include DB servers
  const newList = initializeDBServer(existing, serverDefaults);

  // 2) TS counting logic
  const tsEvent = events.find(ev => ev.type === 'server-add' && ev.params.role === 'TS');
  console.log('TS Event:', tsEvent);
  //alert('TS Event detected' + tsEvent ? `: ${JSON.stringify(tsEvent.params)}` : '');
  if (tsEvent) {
    addTSServers(
      newList,
      tsEvent.params,
      facts.tsRequired,
      facts.tsRecommended,
      existing,
      serverDefaults
    );
  }

  // 3) CX per brand
  const cxEvent = events.find(ev => ev.type === 'server-add' && ev.params.role === 'CX');
  if (cxEvent) {
    addCXServers(
      newList,
      cxEvent.params,
      'CX',
      existing,
      serverDefaults,
      companies
    );
  }

  // 4) Single-instance roles
  ['WEBAPP', 'BI', 'DOC', 'PROXY'].forEach(role => {
    const handlerMap = {
      WEBAPP: addWebAppServer,
      BI: addBIServer,
      DOC: addDocServer,
      PROXY: addProxyServer
    };
    const event = events.find(ev => ev.type === 'server-add' && ev.params.role === role);
    if (event) {
      handlerMap[role](newList, event.params, existing, serverDefaults);
    }
  });

  // 5) Compute hint and return
  return {
    serverList: newList,
    serverHint: computeServerHint(newList),
    hasMikrotik: facts.hasMikrotik,
    hasVLAN: facts.hasVLAN,
    hasProxy: facts.hasProxy
  };
}
