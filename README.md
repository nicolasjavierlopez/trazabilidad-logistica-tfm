# Logistics PFM — Trazabilidad de Cadena de Suministro

MVP de trazabilidad blockchain para cadena de suministro farmacéutica. Contratos inteligentes en Solidity (Foundry) y dos aplicaciones web Next.js: una app de gestión de supply chain y una tienda ecommerce (FarmaPlus).

---

## Stack

| Capa | Tecnologia |
|---|---|
| Smart contracts | Solidity 0.8.24 - Foundry (Forge + Anvil) |
| Frontend | Next.js 15 - React 19 - TypeScript |
| UI | Material UI v9 - Tailwind CSS |
| Web3 | wagmi v2 - viem - MetaMask |
| Testnet publica | Alchemy (Sepolia) |
| Visualizacion | SVG puro (sin libreria externa) |
| i18n | Sistema propio con useContext + localStorage |

---

## Estructura de carpetas

```
logistics-pfm/
|
+-- sc/                                   # Smart contracts (Foundry)
|   +-- src/
|   |   +-- UserRegistry.sol              # Roles y aprobacion de usuarios
|   |   +-- RawMaterial.sol               # Tokens y transferencias
|   |   +-- LogisticsTracking.sol         # Envios, checkpoints e incidentes
|   +-- test/
|   |   +-- UserRegistry.t.sol            # 31 tests
|   |   +-- RawMaterial.t.sol             # 35 tests (incl. fuzz)
|   |   +-- LogisticsTracking.t.sol       # 46 tests
|   +-- script/
|   |   +-- Deploy.s.sol                  # Deploy de los tres contratos
|   +-- foundry.toml                      # Config Forge + endpoints RPC
|   +-- Makefile                          # Atajos: test, deploy, anvil
|
+-- web/
|   +-- supply-chain/                     # App de gestion (puerto 3000)
|   |   +-- src/
|   |       +-- app/
|   |       |   +-- page.tsx              # Login / registro con MetaMask
|   |       |   +-- tokens/
|   |       |   |   +-- page.tsx          # Lista de tokens del usuario
|   |       |   |   +-- create/page.tsx   # Crear token + carga CSV por lotes
|   |       |   +-- transfers/page.tsx    # Historial de transferencias
|   |       |   +-- admin/page.tsx        # Panel de aprobacion de usuarios
|   |       +-- components/
|   |       |   +-- shared/
|   |       |   |   +-- MyTokensView.tsx        # Tabla de tokens con menu
|   |       |   |   +-- TraceabilityDialog.tsx  # Arbol SVG de ancestros
|   |       |   |   +-- TransferHistoryView.tsx
|   |       |   +-- auth/RoleSelector.tsx
|   |       |   +-- layout/AppToolbar.tsx
|   |       +-- hooks/
|   |       |   +-- useRawMaterial.ts     # Hooks wagmi para RawMaterial
|   |       |   +-- useUserRegistry.ts    # Hooks wagmi para UserRegistry
|   |       +-- lib/
|   |       |   +-- constants.ts          # Direcciones, roles, rutas
|   |       |   +-- i18n.tsx              # Sistema de traduccion EN/ES
|   |       |   +-- wagmi.ts              # Configuracion wagmi + chains
|   |       +-- abi/
|   |           +-- RawMaterial.json
|   |           +-- UserRegistry.json
|   |
|   +-- ecommerce/                        # Tienda FarmaPlus (puerto 3001)
|       +-- src/
|           +-- app/
|           |   +-- page.tsx              # Catalogo de productos
|           |   +-- checkout/page.tsx     # Proceso de compra (3 pasos)
|           |   +-- about/page.tsx
|           |   +-- faqs/page.tsx
|           +-- components/
|           |   +-- products/
|           |   |   +-- ProductCard.tsx         # Card con enlace trazabilidad
|           |   |   +-- ProductListItem.tsx
|           |   |   +-- ProductToolbar.tsx      # Busqueda + toggle vista
|           |   |   +-- TraceabilityDialog.tsx  # Arbol SVG de trazabilidad
|           |   +-- checkout/
|           |   |   +-- PaymentStep.tsx   # Pago wallet/tarjeta + MetaMask
|           |   |   +-- Invoice.tsx       # Factura imprimible / PDF
|           |   |   +-- AddressStep.tsx
|           |   |   +-- PurchaseDetailsStep.tsx
|           |   +-- layout/
|           |       +-- AppToolbar.tsx
|           |       +-- CartDrawer.tsx
|           |       +-- Footer.tsx
|           +-- context/
|           |   +-- CartContext.tsx       # Carrito persistido por wallet
|           +-- hooks/
|           |   +-- useProducts.ts        # Lee tokens desde el contrato
|           +-- lib/
|               +-- i18n.tsx
|               +-- wagmi.ts
|
+-- docs/
|   +-- manual-usuario.md                 # Manual completo en espanol
|   +-- diagramas.md                      # Diagramas Mermaid del proyecto
+-- screenshots/                          # Capturas de pantalla
+-- batch-tokens-example.csv              # Plantilla CSV de ejemplo
```

---

## Requisitos previos

- **Node.js** >= 20
- **Foundry** — instalar con: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **MetaMask** — extension del navegador
- **Alchemy** — cuenta gratuita en alchemy.com (solo para Sepolia)

---

## Entornos

El proyecto soporta dos entornos: **local con Anvil** y **testnet publica Sepolia via Alchemy**.

### Entorno local — Anvil

Anvil es el nodo blockchain local incluido en Foundry. No requiere ETH real ni internet. Las cuentas de prueba tienen saldo predefinido y claves conocidas.

| Indice | Rol | Direccion |
|---|---|---|
| 0 | Admin | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| 1 | Producer | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| 2 | Factory | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| 3 | Retailer | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |
| 4 | Consumer | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` |

Chain ID: `31337` - RPC: `http://127.0.0.1:8545`

### Entorno Sepolia — Alchemy

Red de pruebas publica de Ethereum. Requiere API key de Alchemy y ETH de faucet.

- Faucet: https://sepoliafaucet.com
- Explorer: https://sepolia.etherscan.io
- Chain ID: `11155111`

---

## Configuracion de variables de entorno

### Smart contracts (`sc/.env`)

```bash
cp sc/.env.example sc/.env
```

```env
ALCHEMY_API_KEY=tu_api_key_de_alchemy
PRIVATE_KEY=0x_tu_clave_privada_de_testnet
```

> IMPORTANTE: No se encuentra el arhivo `sc/.env` en el repositorio por seguridad.

### Supply Chain (`web/supply-chain/.env.local`)

```bash
cp web/supply-chain/.env.local.example web/supply-chain/.env.local
```

**Local (Anvil):**
```env
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_USER_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RAW_MATERIAL_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_EXPLORER_URL=http://127.0.0.1:8545
```

**Sepolia (Alchemy):**
```env
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_USER_REGISTRY_ADDRESS=0x_direccion_tras_deploy
NEXT_PUBLIC_RAW_MATERIAL_ADDRESS=0x_direccion_tras_deploy
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.etherscan.io
```

### Ecommerce (`web/ecommerce/.env.local`)

```bash
cp web/ecommerce/.env.local.example web/ecommerce/.env.local
```

Mismas variables que supply-chain (sin `NEXT_PUBLIC_EXPLORER_URL`).

---

## Comandos de ejecucion

### 1. Smart contracts

#### Terminal 1 — Levantar nodo Anvil

```bash
cd sc && anvil
# alternativa con Makefile:
cd sc && make anvil
```

Anvil queda escuchando en `http://127.0.0.1:8545` e imprime las cuentas y claves privadas de prueba.

#### Compilar contratos

```bash
cd sc && forge build
```

#### Terminal 2 — Deploy en local (Anvil)

La clave privada `0xac09...f80` corresponde a la cuenta 0 de Anvil (Admin). Es una clave de prueba conocida publicamente, no contiene fondos reales.

```bash
cd sc && forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# alternativa con Makefile:
cd sc && make deploy
```

Tras el deploy, copiar las direcciones impresas en consola a los `.env.local` de ambas apps web.

#### Deploy en Sepolia (Alchemy)

```bash
cd sc && forge script script/Deploy.s.sol \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key TU_ETHERSCAN_API_KEY
```

> Requiere `ALCHEMY_API_KEY` y `PRIVATE_KEY` en `sc/.env`.
> El flag `--verify` publica el codigo fuente en Etherscan automaticamente.

---

### 2. Supply Chain (puerto 3000)

```bash
cd web/supply-chain
npm install          # solo la primera vez
npm run dev          # inicia en http://localhost:3000
```

**Build de produccion:**
```bash
npm run build && npm run start
```

**Verificacion de tipos:**
```bash
npx tsc --noEmit
```

---

### 3. Ecommerce FarmaPlus (puerto 3001)

```bash
cd web/ecommerce
npm install          # solo la primera vez
npm run dev          # inicia en http://localhost:3001
```

---

## Tests de contratos

Los tests usan [Forge](https://book.getfoundry.sh/forge/tests) con el framework `forge-std`.

### Ejecutar todos los tests

```bash
cd sc && forge test
# o con Makefile:
cd sc && make test
```

### Tests con detalle de logs

```bash
cd sc && forge test -vv    # logs de eventos
cd sc && forge test -vvv   # trazas completas por transaccion
cd sc && forge test -vvvv  # trazas + setup
```

### Tests de un contrato especifico

```bash
cd sc && forge test --match-contract RawMaterialTest
cd sc && forge test --match-contract UserRegistryTest
cd sc && forge test --match-contract LogisticsTrackingTest
```

### Tests de una funcion especifica

```bash
cd sc && forge test --match-test test_AcceptTransfer_UpdatesReceivedBalance -vvv
```

### Reporte de gas

```bash
cd sc && forge test --gas-report
```

### Reporte de cobertura

```bash
cd sc && forge coverage
cd sc && forge coverage --report lcov   # genera lcov.info para visualizar en IDE
```

### Fuzz testing

Los tests prefijados con `testFuzz_` corren con 256 iteraciones aleatorias por defecto.

```bash
# Aumentar iteraciones para mayor cobertura:
cd sc && forge test --fuzz-runs 10000 --match-test testFuzz_
```

### Resumen de tests por contrato

| Contrato | Tests | Cubre |
|---|---|---|
| `UserRegistry` | 31 | Registro, roles, aprobacion/rechazo, historial de transacciones |
| `RawMaterial` | 35 | Crear tokens, transferencias, balances, fuzz |
| `LogisticsTracking` | 46 | Actores, envios, checkpoints, incidentes, temperatura |
| **Total** | **114** | |

---

## Pruebas end-to-end por entorno

### Local (Anvil)

1. Levantar Anvil: `cd sc && make anvil`
2. Deploy: `cd sc && make deploy`
3. Copiar las direcciones impresas en consola a los `.env.local` de ambas apps
4. Iniciar supply-chain: `cd web/supply-chain && npm run dev`
5. Iniciar ecommerce: `cd web/ecommerce && npm run dev`
6. En MetaMask: agregar red **Localhost 8545** (Chain ID 31337, RPC http://127.0.0.1:8545)
7. Importar cuentas de prueba usando las claves privadas que imprime Anvil al arrancar
8. Conectar la cuenta 0 (Admin) y aprobar las demas cuentas desde el panel de admin

### Sepolia (Alchemy)

1. Obtener ETH de prueba en https://sepoliafaucet.com
2. Configurar `sc/.env` con `ALCHEMY_API_KEY` y `PRIVATE_KEY`
3. Deploy: `forge script script/Deploy.s.sol --rpc-url sepolia --broadcast`
4. Copiar las direcciones desplegadas a los `.env.local` de ambas apps (seccion Sepolia)
5. En MetaMask: cambiar a la red **Sepolia Testnet**
6. Iniciar las apps web y probar con la wallet real

---

## Funcionalidades principales

### Tokens multi-parent (Factory / Retailer)

Factory y Retailer pueden crear un token derivado de **mas de un token origen**.

- El primer parent se almacena en el campo `parentId` del contrato.
- Los parents adicionales se codifican en el campo `features` como `_parentIds: ["2","3"]`.
- El `TraceabilityDialog` los lee y reconstruye el grafo completo mediante BFS.

```
[Token 1: Cotton] + [Token 2: Hemp]
         \                /
          v              v
     [Token 3: Blend]  (parentId=1, features._parentIds=["2"])
```

### Carga masiva por CSV

Desde la pantalla de creacion de tokens, cualquier rol puede cargar un CSV para crear multiples tokens en una sesion. MetaMask solicita confirmacion **por cada fila** de forma secuencial.

**Columnas por rol:**

| Rol | Columnas del CSV |
|---|---|
| Producer | `name, supply, features` |
| Factory / Retailer | `name, supply, parentId, additionalParentIds, features` |

**Reglas de formato:**
- `additionalParentIds`: IDs separados por `|` — ej. `2|3|4`
- `features`: JSON valido entre comillas dobles; escapar `"` internos con `""`
- Las filas con errores se omiten y se marcan en la previsualizacion

Descargar la plantilla desde el boton "Descargar plantilla" en la interfaz.

### Visualizacion de trazabilidad (arbol de tokens)

Desde el menu de cualquier token (supply-chain) o el enlace "Ver trazabilidad" en cada producto (ecommerce), se abre un dialogo con el arbol completo de ancestros.

**Colores por rol:**

| Rol | Color |
|---|---|
| Producer | `#2e7d32` (verde) |
| Factory | `#1565c0` (azul) |
| Retailer | `#e65100` (naranja) |
| Consumer | `#6a1b9a` (violeta) |

---

## Libreria de visualizacion

> No se utiliza ninguna libreria externa de graficos.

La visualizacion del arbol de trazabilidad esta implementada con **SVG nativo** en React:

- Nodos: `<circle>` + `<text>` con color segun el rol creador
- Aristas: `<path>` con curvas bezier cubicas y `strokeDasharray` para efecto punteado
- Marcador de flecha: `<marker>` con `<path>` SVG reutilizable
- Layout de niveles calculado con BFS en JavaScript puro
- Interactividad via `onMouseEnter` y `onClick` en los elementos SVG

Esta decision evita dependencias de terceros, reduce el bundle size y permite control total del layout para estructuras tipo commit-graph.

---

## Documentacion adicional

- [docs/manual-usuario.md](docs/manual-usuario.md) — Manual completo de uso en espanol
- [batch-tokens-example.csv](batch-tokens-example.csv) — Plantilla CSV de ejemplo para los tres roles
