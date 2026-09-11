// Client de paiement x402 côté MCP.
//
// Deux modes de paiement, dans l'ordre de priorité :
//   1. `X402_CREDIT_TOKEN`   : jeton prépayé (X402-Credit) → débit du grand livre, zéro tx Solana.
//   2. `X402_PAYER_KEY_B64`  : wallet payeur → transaction USDC/Solana via le facilitateur
//      (gas sponsorisé par Dexter : le payeur n'a besoin QUE d'USDC, pas de SOL).
// Sans ni l'un ni l'autre, les appels renvoient le challenge 402 tel quel (informatif).

import { x402Client } from '@x402/core/client';
import { x402HTTPClient, decodePaymentRequiredHeader } from '@x402/core/http';
import { ExactSvmScheme } from '@x402/svm/exact/client';
import { createKeyPairSignerFromBytes } from '@solana/kit';
import { config } from './config.js';

let clientHttp = null; // x402HTTPClient construit une seule fois (lazy).

export async function initialiserPaiement() {
  if (clientHttp) return clientHttp;
  if (!config.payerKeyB64) return null;
  const octets = Uint8Array.from(Buffer.from(config.payerKeyB64, 'base64'));
  if (octets.length !== 64) {
    throw new Error(
      'X402_PAYER_KEY_B64 invalide : attendu 64 octets (secret key Solana) encodés en base64.'
    );
  }
  const signer = await createKeyPairSignerFromBytes(octets);
  const coreClient = x402Client.fromConfig({
    schemes: [{ network: config.reseauCaip, client: new ExactSvmScheme(signer, { rpcUrl: config.rpcUrl }) }],
    // Le plafond $1 par défaut bloquerait les recharges > $1 ; l'opérateur décide
    // (c'est son propre wallet). On verrouille plutôt le destinataire via `policies`.
    spendControls: { maxAmountPerPayment: false },
    policies: config.trustedPayTo
      ? [(version, reqs) => reqs.filter((r) => r.payTo === config.trustedPayTo)]
      : [],
  });
  clientHttp = new x402HTTPClient(coreClient);
  return clientHttp;
}

export function modePaiement() {
  if (config.creditToken) return 'credit';
  if (config.payerKeyB64) return 'wallet';
  return 'aucun';
}

// Appelle un endpoint payant et retourne un résultat normalisé.
//   { status, paye, challenge, body, settlement, transaction }
export async function appeler({ chemin, methode = 'POST', corps = null }) {
  const url = config.baseUrl + chemin;
  const entetes = {
    'content-type': 'application/json',
    'user-agent': 'testraptor-x402-mcp/0.1.0',
  };
  if (config.creditToken) entetes['x402-credit'] = config.creditToken;

  let reponse = await fetch(url, {
    method: methode,
    headers: entetes,
    body: corps != null ? JSON.stringify(corps) : undefined,
  });

  // 402 sans moyen de payer → on renvoie le challenge DÉCODÉ (payTo, montant, réseau…)
  // pour que l'agent comprenne ce qui est demandé, plutôt qu'un simple 402 opaque.
  if (reponse.status === 402 && !clientHttp) {
    const body = await reponse.json().catch(() => ({}));
    const entete =
      reponse.headers.get('payment-required') ||
      reponse.headers.get('x-payment-required') ||
      reponse.headers.get('payment');
    let challenge = body;
    if (entete) {
      try { challenge = decodePaymentRequiredHeader(entete); } catch { challenge = body; }
    }
    return { status: 402, paye: false, challenge: true, body: challenge, settlement: null, transaction: null };
  }

  // 402 avec wallet → on crée le payload de paiement, on signe, on re-appelle.
  if (reponse.status === 402 && clientHttp) {
    const analyse = await clientHttp.processResponse(reponse);
    const exigences = analyse.header; // PaymentRequired décodé depuis PAYMENT-REQUIRED
    if (exigences) {
      const payload = await clientHttp.createPaymentPayload(exigences);
      const entetesPaiement = clientHttp.encodePaymentSignatureHeader(payload);
      reponse = await fetch(url, {
        method: methode,
        headers: { ...entetes, ...entetesPaiement },
        body: corps != null ? JSON.stringify(corps) : undefined,
      });
      const settlement = clientHttp.getPaymentSettleResponse((n) => reponse.headers.get(n));
      const body = await reponse.json().catch(() => ({}));
      return {
        status: reponse.status,
        paye: true,
        challenge: false,
        body,
        settlement,
        transaction: settlement?.transaction || null,
      };
    }
  }

  const body = await reponse.json().catch(() => ({}));
  return {
    status: reponse.status,
    paye: !!config.creditToken,
    challenge: false,
    body,
    settlement: null,
    transaction: null,
  };
}
