# Vivai Cintoli — Zagreb 2026 Trade Fair App

App catalogo interattiva per la fiera internazionale di Zagabria 2026.

## Struttura

```
├── public/
│   ├── index.html       ← App principale (single-file)
│   └── catalog.json     ← Catalogo prodotti (generato da XML nopCommerce)
├── api/
│   ├── mapbox.js        ← Proxy Mapbox (token + geocoding)
│   └── openai.js        ← Proxy OpenAI gpt-image-1 (Garden Vision rendering)
└── vercel.json          ← Configurazione deploy
```

## Deploy su Vercel

### 1. Collega il repo

- Vai su [vercel.com](https://vercel.com), accedi con GitHub
- "Add New Project" → seleziona questo repo
- Framework: `Other`
- Deploy

### 2. Configura le API keys

Vai in **Settings → Environment Variables** e aggiungi:

| Nome | Valore | Dove trovi la chiave |
|------|--------|---------------------|
| `MAPBOX_TOKEN` | `pk.eyJ1Ijo...` | [mapbox.com/account](https://account.mapbox.com/access-tokens/) — piano gratuito, 50K loads/mese |
| `OPENAI_KEY` | `sk-...` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) — ~$0.08/immagine, $10 per ~125 rendering |

Dopo aver aggiunto le variabili, fai un **Redeploy** (Deployments → ultimo → "⋮" → Redeploy).

### 3. Fatto

L'app è live. Le API key restano server-side nelle serverless functions, mai esposte al browser.

## Aggiornare il catalogo

1. Esporta l'XML prodotti da nopCommerce
2. Converti in `catalog.json` con lo script Python (vedi docs)
3. Sostituisci `public/catalog.json` e fai push

## Funzionalità

- 🌿 Catalogo 433 specie con ricerca e filtri per categoria
- 📋 Wizard preventivo 4 step con export PDF e WhatsApp
- 🤖 Flora AI — assistente botanico multilingue
- 🏡 Garden Vision — rendering AI del giardino (richiede Gemini)
- 🗺️ Mappa satellitare per localizzazione progetto (richiede Mapbox)
- 🌍 4 lingue: IT, EN, HR, DE
