# FUNZIONALITÀ - Supplier Platform

## Panoramica
Questa documentazione descrive in dettaglio le funzionalità implementate per l'integrazione con Jaggaer e la gestione dei fornitori, incluso il processo di sincronizzazione e download degli allegati.

## 1. INTEGRAZIONE JAGGAER API

### 1.1 Client Jaggaer Robusto (`JaggaerAPIClient`)
**File**: `lib/jaggaer-client.ts`

#### Funzionalità principali:
- **Autenticazione OAuth2**: Gestione automatica dei token di accesso con refresh
- **Gestione rate limiting**: Controllo delle richieste per evitare sovraccarico API
- **Retry logic**: Tentativo automatico di riconnessione in caso di errori temporanei
- **Estrazione dati strutturati**: Parsing intelligente delle risposte Jaggaer

#### Metodi chiave:
- `getAccessToken()`: Ottiene e mantiene il token di autenticazione
- `getAllCompanyProfiles()`: Recupera tutti i profili aziendali con paginazione
- `extractCompanyInfo()`: Estrae informazioni base dell'azienda
- `extractCertifications()`: Estrae certificazioni e allegati
- `extractDebasicAnswers()`: Estrae risposte dal questionario deBasic

### 1.2 Client Download Allegati (`JaggaerAttachmentClient`)
**File**: `lib/jaggaer-client.ts` (classe separata)

#### Funzionalità avanzate:
- **Retry con backoff esponenziale**: Fino a 3 tentativi con delay crescente
- **Mascheramento token**: Log sicuri che nascondono token sensibili
- **Risoluzione filename**: Parsing intelligente degli header Content-Disposition
- **Gestione content-type**: Mappatura automatica estensioni file
- **Download multipli**: Supporto sia secureToken che fileId+fileName

#### Metodi disponibili:
- `downloadBySecureToken()`: Metodo preferito secondo specifiche Jaggaer
- `downloadByFileId()`: Metodo fallback con ID file e nome
- `downloadRobust()`: Wrapper intelligente che prova entrambi i metodi

## 2. PROCESSO DI SINCRONIZZAZIONE FORNITORI

### 2.1 Endpoint di Sincronizzazione
**Endpoint**: `POST /api/suppliers/sync`
**File**: `app/api/suppliers/sync/route.ts`

### 2.2 Flusso di Sincronizzazione Completo

#### Fase 1: Configurazione e Preparazione
1. **Caricamento credenziali**: Priorità variabili ambiente, fallback database
2. **Creazione tabelle**: Verifica/creazione tabelle `supplier_debasic_answers` e `supplier_attachments`
3. **Inizializzazione client**: Setup `JaggaerAPIClient` e `JaggaerAttachmentClient`
4. **Logging**: Inserimento log di sincronizzazione con stato "running"

#### Fase 2: Recupero Dati da Jaggaer
1. **Chiamata API**: `getAllCompanyProfiles()` con componenti configurabili
2. **Componenti richiesti**:
   - `companyMaster`: Dati base azienda
   - `companyDEBasic`: Questionario deBasic con allegati
3. **Paginazione**: Gestione automatica di grandi dataset
4. **Filtri**: Supporto filtri per data ultima modifica

#### Fase 3: Elaborazione Dati Fornitori
Per ogni fornitore ricevuto da Jaggaer:

1. **Estrazione informazioni base**:
   ```typescript
   const info = api.extractCompanyInfo(profile)
   ```
   - Bravo ID, nome azienda, codice fiscale, P.IVA
   - Indirizzo completo, contatti, forma giuridica
   - Date registrazione e ultima modifica

2. **Mapping campi database**:
   - `bravoId` → `bravo_id`
   - `euVat` → `vat_number`
   - `zip` → `postal_code`
   - `isoCountry` → `country`

3. **Upsert database**:
   - **UPDATE**: Se `bravo_id` esiste, aggiorna dati esistenti
   - **INSERT**: Se nuovo fornitore, crea record
   - **RETURNING id**: Recupera UUID per linking allegati

#### Fase 4: Gestione Risposte deBasic
1. **Estrazione risposte**:
   ```typescript
   const allAnswers = api.extractDebasicAnswers(profile)
   ```

2. **Filtro chiavi target**: Solo domande specifiche configurate:
   - Dati anagrafici: `Q1_LEGALE_RAPPRESENTANTE`, `Q1_FIRMA_DIGITALE`
   - Economico-finanziari: `Q1_FATTURATO`, `Q1_CAPITALE_SOCIALE`
   - Conformità: `Q1_CODICE_ETICO`, `Q1_MODELLO_231`
   - Certificazioni: `Q1_ISO_*`, `Q1_SOA`, `Q1_CCIAA`
   - Allegati: `Q0_DURC_ALLEGATO`, `Q0_ASSICURAZIONE_ALLEGATO`

3. **Supporto wildcards**: Pattern `Q1_ALLEGATO_ISO_*` per matching multipli

4. **Storage JSON**: Salvataggio in `supplier_debasic_answers.answers` come JSONB

#### Fase 5: Download e Storage Allegati
**IMPORTANTE**: Gli allegati vengono scaricati DURANTE la sincronizzazione e salvati nel database.

1. **Estrazione certificazioni**:
   ```typescript
   const certifications = api.extractCertifications(profile)
   ```

2. **Per ogni allegato trovato**:
   - Verifica esistenza in `supplier_attachments`
   - Skip se già scaricato con successo
   - Estrazione metadati: `file_id`, `secure_token`, `filename`, `cert_type`

3. **Download robusto**:
   ```typescript
   // Preferenza secureToken
   if (secure_token) {
     blob = await attachmentClient.downloadBySecureToken(secure_token, filename)
   } else if (file_id && filename) {
     blob = await attachmentClient.downloadByFileId(file_id, filename)
   }
   ```

4. **Conversione e storage**:
   ```typescript
   const arrayBuffer = await blob.arrayBuffer()
   const buffer = Buffer.from(arrayBuffer)
   ```

5. **Salvataggio database**:
   - `file_data`: Contenuto binario del file (BYTEA)
   - `content_type`: MIME type del file
   - `file_size`: Dimensione in bytes
   - `download_status`: 'success', 'failed', 'pending'
   - `download_error`: Messaggio errore se fallito

### 2.3 Gestione Errori
- **Errori per fornitore**: Non bloccano sincronizzazione generale
- **Errori per allegato**: Non bloccano elaborazione fornitore
- **Logging dettagliato**: Tracciamento errori specifici
- **Status tracking**: Monitoraggio stato download per allegato

## 3. VISUALIZZAZIONE ALLEGATI NEL FRONTEND

### 3.1 API Dettagli Fornitore
**Endpoint**: `GET /api/suppliers/[id]`
**File**: `app/api/suppliers/[id]/route.ts`

#### Dati restituiti:
- Informazioni base fornitore
- Risposte deBasic (`debasic_answers`)
- Lista allegati (`attachments`) con metadati completi

### 3.2 Interfaccia Utente
**File**: `components/supplier-detail-view.tsx`

#### Tab "Documents":
- **Lista allegati**: Visualizzazione allegati scaricati durante sync
- **Informazioni dettagliate**:
  - Nome file originale
  - Tipo certificazione (SOA, ISO, DURC, etc.)
  - Dimensione file in KB
  - Data download
  - Question code di provenienza
  - Content-type

#### Indicatori di stato:
- 🟢 **Downloaded**: File disponibile per visualizzazione/download
- 🔴 **Failed**: Errore durante download (tooltip con dettagli)
- 🟡 **Pending**: Download in corso o in attesa

#### Azioni disponibili:
- **👁️ Preview**: Visualizzazione inline nel browser
- **⬇️ Download**: Download del file sul dispositivo

### 3.3 Servizio Download Diretto
**Endpoint**: `GET /api/attachments/[id]`
**File**: `app/api/attachments/[id]/route.ts`

#### Funzionamento:
1. **Query database**: Recupero file da `supplier_attachments.file_data`
2. **Headers appropriati**:
   - `Content-Type`: Tipo MIME originale
   - `Content-Disposition`: `inline` per preview, nome file corretto
   - `Content-Length`: Dimensione esatta
3. **Streaming**: Invio diretto del contenuto binario

## 4. ARCHITETTURA STORAGE ALLEGATI

### 4.1 Strategia Implementata: DATABASE STORAGE
Gli allegati vengono:
- ✅ **Scaricati durante la sincronizzazione**
- ✅ **Salvati nel database** come BYTEA in `supplier_attachments.file_data`
- ✅ **Serviti direttamente** dal database quando richiesti

### 4.2 Vantaggi di questa Architettura:
- **Performance**: Accesso immediato senza re-download
- **Affidabilità**: Indipendenza da disponibilità API Jaggaer
- **Consistenza**: Allegati sempre allineati con dati fornitore
- **Backup**: Inclusi automaticamente nel backup database
- **Sicurezza**: Controllo accessi tramite logica applicazione

### 4.3 Schema Database

#### Tabella `supplier_attachments`:
```sql
CREATE TABLE supplier_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  file_id TEXT,                    -- ID file Jaggaer
  secure_token TEXT,               -- Token sicuro Jaggaer
  filename TEXT NOT NULL,          -- Nome file
  original_filename TEXT,          -- Nome originale
  question_code TEXT,              -- Codice domanda deBasic
  cert_type TEXT,                  -- Tipo certificazione
  content_type TEXT,               -- MIME type
  file_size BIGINT,               -- Dimensione in bytes
  file_data BYTEA,                -- CONTENUTO BINARIO FILE
  download_status TEXT DEFAULT 'pending',
  download_error TEXT,
  downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, file_id, secure_token)
);
```

## 5. CONFIGURAZIONE E DEPLOYMENT

### 5.1 Variabili Ambiente Richieste:
```env
JAGGAER_BASE_URL=https://your-jaggaer-instance.com
JAGGAER_CLIENT_ID=your_client_id
JAGGAER_CLIENT_SECRET=your_client_secret
```

### 5.2 Configurazione Database:
Le credenziali possono essere salvate anche in `system_settings`:
```sql
INSERT INTO system_settings (setting_key, setting_value) VALUES 
('jaggaer', '{"baseUrl": "https://...", "clientId": "...", "clientSecret": "..."}');
```

### 5.3 Configurazione Integrazione:
```sql
INSERT INTO system_settings (setting_key, setting_value) VALUES 
('jaggaer_integration', '{
  "selectedComponents": ["companyMaster", "companyDEBasic"],
  "batchSize": 100,
  "maxTotal": null
}');
```

## 6. MONITORAGGIO E LOGGING

### 6.1 Log Sincronizzazione:
Tabella `supplier_sync_logs` traccia:
- Tipo sincronizzazione
- Stato (running, completed, failed)
- Timestamp inizio/fine
- Contatori (creati, aggiornati, falliti)
- Dettagli configurazione

### 6.2 Log Applicazione:
- Download allegati con dimensioni
- Errori specifici per fornitore/allegato
- Performance API Jaggaer
- Credenziali mancanti/invalide

## 7. SICUREZZA

### 7.1 Gestione Credenziali:
- Mascheramento token nei log
- Fallback sicuro env → database
- Validazione URL per prevenire placeholder

### 7.2 Controllo Accessi:
- Allegati legati a fornitore specifico
- Validazione UUID attachment ID
- Headers sicuri per download

### 7.3 Gestione Errori:
- Nessuna esposizione credenziali in errori
- Logging dettagliato per debugging
- Graceful degradation per errori parziali

## 8. PERFORMANCE E SCALABILITÀ

### 8.1 Ottimizzazioni:
- Paginazione automatica chiamate Jaggaer
- Deduplicazione allegati (no re-download)
- Streaming file per download
- Indici database su chiavi di ricerca

### 8.2 Limiti Attuali:
- Storage database per allegati (considerare file system per volumi molto grandi)
- Sincronizzazione sincrona (considerare job asincroni per dataset enormi)

## 9. ESTENSIONI FUTURE

### 9.1 Possibili Miglioramenti:
- **File system storage**: Per allegati molto grandi
- **CDN integration**: Per distribuzione globale allegati
- **Sync incrementale**: Solo fornitori modificati
- **Webhook support**: Aggiornamenti real-time da Jaggaer
- **Bulk operations**: Gestione massive di fornitori

### 9.2 Monitoraggio Avanzato:
- Dashboard sync status
- Metriche performance API
- Alert per errori ricorrenti
- Report utilizzo storage

## 10. ANALISI DOCUMENTI (OCR MISTRAL)

### 10.1 Panoramica
Il sistema consente l’estrazione di dati strutturati dai documenti (CCIAA, DURC, ISO, SOA, VISURA) tramite OCR Mistral e la loro revisione/validazione nel frontend.

Componenti principali:
- Frontend: `components/document-analysis-dialog.tsx`
- API: `app/api/documents/analyze/route.ts` (GET/POST), `app/api/documents/validate/route.ts` (POST/GET)
- DB: Tabella `document_analysis` (schema in `scripts/03_document_analysis_schema.sql`)
- Client OCR: `lib/mistral-client.ts`
- Schemi/validazione: `lib/document-schemas.ts`

### 10.2 Flusso Utente (UI)
1. Apertura dialog da `SupplierDetailView` (tab Documents), pulsante “Analyze” per ogni allegato.
2. Selezione automatica del tipo documento nel dropdown in base a `attachment.cert_type` (auto-fill non invasivo, case-insensitive). È possibile cambiarlo manualmente.
3. Avvio analisi (POST `/api/documents/analyze`). Stato mostrato in UI, al termine lo step passa automaticamente alla tab “Review & Validate”.
4. Visualizzazione campi estratti in base al tipo documento, con editor inline e note di validazione.
5. Validazione (POST `/api/documents/validate`) con stati: `approved`, `rejected`, `needs_review`.
6. Nessun reload di pagina: la dialog rimane aperta; la pagina padre aggiorna i dati in-place.

Migliorie UI implementate:
- Auto-selezione del tipo documento dal pannello “Document Information”.
- Post-analisi: popolamento immediato dei campi e passaggio alla tab “Review”.
- Rimozione del reload: aggiorna i dati del fornitore senza cambiare tab o chiudere la dialog.

### 10.3 API di Analisi (`/api/documents/analyze`)
- POST: esegue OCR su un allegato e salva/aggiorna il record in `document_analysis`.
  - Input: `{ attachmentId: UUID, docType: 'CCIAA'|'DURC'|'ISO'|'SOA'|'VISURA', pages?: number[] }`
  - Output: `{ success: true, data: { ...document_analysis, extracted_fields } }`
- GET: recupera analisi per `attachmentId` o per `supplierId`.
  - Normalizzazione retro-compatibile degli `extracted_fields` se salvati con formati legacy (es. `documentAnnotation` stringificato, `document_annotation`, `output_document_annotation`, `output_structured`).
  - I campi vengono riportati alla forma piatta attesa dalla UI tramite `DocumentValidators.normalizeFields()`.

### 10.4 API di Validazione (`/api/documents/validate`)
- POST: aggiorna `validation_status`, `validation_notes` e i campi validati; in caso di esito positivo rimuove `analysis_error` pregressi.
- GET: statistiche/aggregati di validazione (per uso futuro).

### 10.5 Schema Database (`document_analysis`)
Campi principali:
- `doc_type`: tipo documento analizzato.
- `extracted_fields`: JSONB con i campi estratti (forma piatta attesa dalla UI).
- `analysis_status`, `analysis_error`: tracking esecuzione OCR.
- `validation_status`, `validation_notes`, `validated_at/by`: tracking revisione e audit.

Vedi file: `scripts/03_document_analysis_schema.sql`.

### 10.6 Normalizzazione Campi (retro-compatibilità)
Per analisi storiche salvate con formati diversi, la GET dell’API e il componente UI eseguono una normalizzazione difensiva:
- Parsing di `documentAnnotation` se stringa JSON.
- Uso di alternative note: `document_annotation`, `output_document_annotation`, `output_structured`.
- Uniformazione tramite `DocumentValidators.normalizeFields(docType, fields)` (pulizia, formati date, CF, indirizzi, ecc.).

### 10.7 Comportamento senza Reload
In `components/supplier-detail-view.tsx` è stato rimosso il `window.location.reload()` dopo la conclusione dell’analisi. Ora:
- I dati del fornitore vengono ricaricati con una funzione riutilizzabile (`fetchSupplier`) esposta anche per debug su `window.__refreshSupplier`.
- La dialog resta aperta e l’utente rimane nella tab attuale.

## 11. EVOLUZIONI FUTURE: AVVIO AUTOMATICO ANALISI DURANTE SYNC

Obiettivo: avviare automaticamente l’analisi documentale durante il processo di sincronizzazione, appena un allegato viene scaricato con successo.

### 11.1 Requisiti/Design
- Mapping `attachment.cert_type` → `doc_type` supportato da `DOCUMENT_TYPES`.
- Creazione/aggiornamento record `document_analysis` con `analysis_status = 'pending' | 'processing'` al termine del download.
- Avvio job OCR (sincrono o, preferibilmente, asincrono tramite coda/job scheduler) per non bloccare la sync.
- Update `supplier_attachments.analysis_status` per riflettere lo stato corrente (`not_analyzed` → `pending` → `processing` → `completed/failed`).

### 11.2 Punti di Integrazione
- `app/api/suppliers/sync/route.ts` dopo il salvataggio di ogni allegato:
  1. Determinare `docType` dal `cert_type` se presente e supportato.
  2. Inserire/aggiornare `document_analysis` (attach unique su `attachment_id`).
  3. Innescare analisi:
     - Opzione A (sincrona): chiamata interna al POST `/api/documents/analyze`.
     - Opzione B (consigliata): pubblicare messaggio in coda (es. `bullmq`/`pg-boss`) e processare in worker.

### 11.3 Considerazioni Operative
- Rate limiting Mistral OCR e gestione costi: batching e retry.
- Logging dedicato per analisi automatiche.
- Notifiche/indicatori UI nel tab Documents durante la sync.

### 11.4 TODO
- Implementare orchestrazione asincrona dei job OCR.
- Mappatura robusta `cert_type` → `doc_type` (normalizzazione maiuscole, sinonimi).
- Estendere API di sync per conteggio/telemetria delle analisi lanciate.
