// Définitions des outils MCP + exécution.

import { appeler } from './paiement.js';

const PAIEMENT =
  'Paiement à l\'unité x402 (USDC sur Solana, gas sponsorisé) : aucun compte, aucune clé API. ' +
  'Configurez le serveur avec X402_PAYER_KEY_B64 (wallet financé en USDC) ou X402_CREDIT_TOKEN (crédit prépayé).';

export const OUTILS = [
  {
    nom: 'certs_check_now',
    titre: "Vérifier la validité TLS d'un domaine (0,002 $ USDC)",
    description:
      "Vérifie immédiatement l'état TLS/SSL d'un nom de domaine : chaîne de certificats, " +
      "date d'expiration, protocoles supportés. " + PAIEMENT +
      ' Le paramètre `domain` accepte aussi une URL complète (normalisée automatiquement).',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Nom de domaine à vérifier (ex. "exemple.ca" ou "https://exemple.ca").',
        },
      },
      required: ['domain'],
    },
    chemin: '/certs/v1/certs/check-now',
    versCorps: (a) => ({ domain: a.domain }),
  },
  {
    nom: 'heartbeat_create_monitor',
    titre: 'Créer un moniteur de disponibilité (0,003 $ USDC)',
    description:
      "Crée un moniteur de disponibilité (HTTP, mot-clé, port ou ping). " + PAIEMENT +
      ' ⚠️ La création exige un compte TestRaptor connecté (SSO) côté backend ; ' +
      "un agent anonyme recevra 401 après le paiement. `type` : HTTP | KEYWORD | PORT | PING. " +
      'Selon le type : HTTP/KEYWORD exigent `url`, PORT exige `host`+`port`, PING exige `host`.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du moniteur (max 200 car.).' },
        type: { type: 'string', description: 'HTTP | KEYWORD | PORT | PING.' },
        url: { type: 'string', description: 'URL surveillée (HTTP/KEYWORD).' },
        keyword: { type: 'string', description: 'Mot-clé attendu dans la page (KEYWORD).' },
        host: { type: 'string', description: 'Hôte (PORT/PING).' },
        port: { type: 'integer', description: 'Port (PORT).' },
        intervalSeconds: { type: 'integer', description: 'Intervalle en secondes.' },
        expectedStatus: { type: 'integer', description: 'Code HTTP attendu.' },
        timeoutMs: { type: 'integer', description: 'Timeout en millisecondes.' },
        paused: { type: 'boolean', description: 'Créé en pause ?' },
      },
      required: ['name', 'type'],
    },
    chemin: '/heartbeat/v1/heartbeat/monitors',
    versCorps: (a) => ({
      name: a.name,
      type: a.type,
      url: a.url,
      keyword: a.keyword,
      host: a.host,
      port: a.port,
      intervalSeconds: a.intervalSeconds,
      expectedStatus: a.expectedStatus,
      timeoutMs: a.timeoutMs,
      paused: a.paused,
    }),
  },
  {
    nom: 'pixeldrift_lancer_captures',
    titre: "Lancer des captures d'écran de pages web (0,005 $ USDC)",
    description:
      "Lance une session de captures d'écran (desktop, mobile, tablette) des pages référencées. " +
      PAIEMENT +
      ' `urlIds` : identifiants numériques des URLs à capturer. `formats` (optionnel) : ' +
      "sous-ensemble de ['desktop','mobile','tablet'] (défaut : desktop). Retourne un jobId.",
    inputSchema: {
      type: 'object',
      properties: {
        urlIds: { type: 'array', items: { type: 'integer' }, description: 'IDs des URLs à capturer.' },
        formats: {
          type: 'array',
          items: { type: 'string' },
          description: "Formats de capture, ex. ['desktop','mobile','tablet'].",
        },
      },
      required: ['urlIds'],
    },
    chemin: '/pixeldrift/api/captures/lancer',
    versCorps: (a) => ({ urlIds: a.urlIds, formats: a.formats }),
  },
  {
    nom: 'bundle_check',
    titre: 'Acheter un lot de crédit prépayé (0,008 $ USDC)',
    description:
      "Achète un lot de crédit prépayé (0,008 $ USDC) et renvoie un jeton `X402-Credit` " +
      'réutilisable sur les appels suivants sans nouvelle transaction Solana. ' + PAIEMENT,
    inputSchema: { type: 'object', properties: {} },
    chemin: '/v1/bundle/check',
    versCorps: () => ({}),
  },
  {
    nom: 'credit_topup',
    titre: 'Recharger le crédit prépayé (montant libre, min 0,008 $ USDC)',
    description:
      "Recharge le crédit prépayé d'un montant libre en USDC (min 0,008 $, max 1000 $) " +
      'et renvoie un jeton `X402-Credit`. Une seule transaction Solana pour de nombreux appels. ' +
      PAIEMENT,
    inputSchema: {
      type: 'object',
      properties: {
        montant: {
          type: 'string',
          description: 'Montant en USDC (ex. "0.50"). Min 0.008, max 1000.',
        },
      },
      required: ['montant'],
    },
    chemin: '/v1/credit/topup',
    versCorps: (a) => ({ montant: a.montant }),
  },
];

export async function executerOutil(outil, args) {
  const corps = outil.versCorps(args || {});
  const resultat = await appeler({ chemin: outil.chemin, corps });
  return { corps, resultat };
}
