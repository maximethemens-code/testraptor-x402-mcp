#!/usr/bin/env node
// Serveur MCP x402 TestRaptor (transport stdio).
// Aucun `console.log` : stdout est le canal MCP.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { initialiserPaiement, modePaiement } from './paiement.js';
import { OUTILS, executerOutil } from './outils.js';

const server = new Server(
  { name: 'testraptor-x402', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: OUTILS.map((o) => ({
    name: o.nom,
    title: o.titre,
    description: o.description,
    inputSchema: o.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params || {};
  const outil = OUTILS.find((o) => o.nom === name);
  if (!outil) {
    return { content: [{ type: 'text', text: `Outil inconnu : ${name}` }], isError: true };
  }
  try {
    const { resultat } = await executerOutil(outil, args || {});
    if (resultat.challenge) {
      return {
        content: [
          {
            type: 'text',
            text:
              `Paiement x402 requis (endpoint ${outil.chemin}). Configurez le serveur avec ` +
              `X402_PAYER_KEY_B64 ou X402_CREDIT_TOKEN.\n\nChallenge :\n${JSON.stringify(resultat.body, null, 2)}`,
          },
        ],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify(resultat.body, null, 2) }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `Erreur : ${e.message}` }], isError: true };
  }
});

await initialiserPaiement().catch((e) =>
  console.error(`[x402-mcp] paiement indisponible : ${e.message}`)
);
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[x402-mcp] démarré — mode paiement : ${modePaiement()}`);
