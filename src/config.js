// Configuration du serveur MCP x402.

const CAIP2 = {
  mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
};

const reseau = process.env.X402_NETWORK || 'mainnet';

export const config = {
  reseau,
  reseauCaip: CAIP2[reseau] || CAIP2.mainnet,
  baseUrl: (process.env.X402_BASE_URL || 'https://testraptor.com').replace(/\/+$/, ''),
  rpcUrl: process.env.X402_RPC_URL || 'https://api.mainnet-beta.solana.com',
  facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://x402.dexter.cash',
  payerKeyB64: (process.env.X402_PAYER_KEY_B64 || '').trim(),
  creditToken: (process.env.X402_CREDIT_TOKEN || '').trim(),
  // Si défini, le wallet ne paie QUE ce destinataire (anti-détournement).
  trustedPayTo: (process.env.X402_TRUSTED_PAYTO || '').trim(),
};

// Prix unitaires en USDC (chaîne décimale, dollars).
export const PRIX = {
  certs: '0.002',
  heartbeat: '0.003',
  pixeldrift: '0.005',
  bundle: '0.008',
};
