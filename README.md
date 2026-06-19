# E2E Encrypted GPU Inference — From First Principles

A hands-on learning repo that builds up to **end-to-end encrypted GPU inference** step by step, starting from basic cryptographic primitives.

The goal: understand how systems like NVIDIA's H100 Confidential Computing and confidential AI inference platforms process sensitive data (e.g. screen captures) inside a hardware-isolated **Trusted Execution Environment (TEE)** — where not even the host operating system can see the plaintext.

> **Reverse-engineering note:** this crypto core is the *verifiable spine* of a
> real product (Alexandria / Ambient) that records desktop work, redacts PII
> locally, and replays it as agentic clones. For an outside-in teardown of how
> that whole system most likely works — and how `src/01`–`src/06` map onto its
> "auditable open-source core" — see **[`TEARDOWN.md`](./TEARDOWN.md)**.

## What's inside

Each file builds on the previous one. Run them in order.

| File | Concept | What you learn |
|---|---|---|
| `src/01-symmetric.ts` | AES-256-GCM | Fast encryption with a shared key. Problem: how do you share the key? |
| `src/02-asymmetric.ts` | RSA | Public/private key pairs solve the key-sharing problem, but RSA is slow. |
| `src/03-hybrid.ts` | RSA + AES | Use RSA to exchange a session key, then AES for fast bulk encryption. This is how TLS works. |
| `src/04-dh-key-exchange.ts` | Diffie-Hellman | Create a shared secret without ever exchanging private keys. The foundation of GPU TEE secure channels. |
| `src/05-attestation.ts` | Remote Attestation | Verify that a remote GPU is genuinely running in secure TEE mode before sending any data. |
| `src/06-tee-inference.ts` | **Full E2E simulation** | All pieces combined: attestation → DH key exchange → encrypted screen data → AI inference inside TEE → encrypted result. |

## How it maps to real hardware

```
Your Laptop                    Cloud Server
┌──────────┐                   ┌─────────────────────────┐
│ Screen    │                   │  Host OS (CANNOT see    │
│ capture   │──── encrypted ───▶│  plaintext)             │
│           │    (AES-256-GCM)  │         │               │
│           │                   │    ┌────▼─────────────┐ │
│           │                   │    │ GPU TEE (H100)   │ │
│           │                   │    │ - Decrypt data   │ │
│           │                   │    │ - Run AI model   │ │
│           │                   │    │ - Encrypt result │ │
│           │◀── encrypted ─────│    └──────────────────┘ │
│ AI result │                   └─────────────────────────┘
└──────────┘
```

Key hardware facts:
- The GPU's private key is **burned into silicon fuses** at manufacturing — it can never be extracted
- NVIDIA signs a certificate for each GPU's public key, creating a hardware root of trust
- During **remote attestation**, the GPU proves its identity and firmware integrity before any data is sent
- **Diffie-Hellman** key exchange establishes a session key that only exists inside the TEE and on your device
- The host OS, cloud provider, and hypervisor only ever see encrypted blobs

## Run it

```bash
npm install
npx tsx src/01-symmetric.ts
npx tsx src/02-asymmetric.ts
npx tsx src/03-hybrid.ts
npx tsx src/04-dh-key-exchange.ts
npx tsx src/05-attestation.ts
npx tsx src/06-tee-inference.ts
```

## Requirements

- Node.js 18+
- TypeScript (included as dev dependency)
