# CLAUDE.md — Logistics PFM

Contexto de proyecto para sesiones de Claude Code. Contiene decisiones de arquitectura,
patrones clave y retrospectiva de lo implementado. Leer antes de hacer cambios.

---

## Estructura del monorepo

```
sc/          Smart contracts Solidity (Foundry)
web/supply-chain/   App de gestion de cadena de suministro (Next.js, puerto 3000)
web/ecommerce/      Tienda FarmaPlus (Next.js, puerto 3001)
docs/        Manual de usuario
```

Cada subproyecto tiene su propio `.gitignore` y `.env.local`. El `.gitignore` raiz
cubre artefactos globales (node_modules, .next, out/, cache/, broadcast/, .env).

---

## Contratos inteligentes

**Tres contratos principales en `sc/src/`:**

| Contrato | Responsabilidad |
|---|---|
| `UserRegistry.sol` | Registro de wallets con roles y aprobacion por admin |
| `RawMaterial.sol` | Tokens de producto, transferencias de dos pasos, multi-parent |
| `LogisticsTracking.sol` | Envios, checkpoints geograficos, incidentes, cadena de frio |

**Roles de usuario (enum UserRole):** None=0, Admin=1, Producer=2, Factory=3, Retailer=4, Consumer=5

**Patron de transferencia en RawMaterial:**
- Emisor llama `createTransferRequest` → unidades reservadas inmediatamente del balance
- Receptor llama `acceptTransfer` o `rejectTransfer`; emisor puede `cancelTransfer`
- Titulares no-creadores tienen su balance en `receivedBalance[tokenId][holder]`

**Multi-parent (Factory / Retailer):**
- `createToken` acepta un solo `parentId` (contrato no cambia)
- Parents adicionales se inyectan en el campo `features` como JSON: `{"_parentIds":["2","3"]}`
- El frontend reconstruye el grafo completo leyendo `parentId` + `_parentIds` via BFS

**Tests:** 114 tests totales con Forge. Fuzz tests con prefijo `testFuzz_`.
Archivos: `UserRegistry.t.sol` (31), `RawMaterial.t.sol` (35), `LogisticsTracking.t.sol` (46).
Helper interno `_getTransfer(txId)` en RawMaterial tests porque los mappings publicos retornan tupla, no struct.

---

## Supply Chain — decisiones de arquitectura

### Login y routing (web/supply-chain/src/app/page.tsx)

Problema historico: al cambiar de cuenta en MetaMask, wagmi tenia datos cacheados de la cuenta anterior mientras `address` ya habia cambiado, causando routing incorrecto.

**Solucion implementada:**
- Usar `isFetching` de `useIsRegistered` y `useUserByWallet` como guard en los effects
- `useEffect([address])` resetea `showRoleSelect` e `isPending` en cada cambio de cuenta
- Tres estados de UI: `isPending` (tarjeta con HourglassEmptyIcon), `showRoleSelect` (RoleSelector), default (conectar wallet)
- Cuentas Anvil de prueba se auto-registran via un segundo `useEffect` separado

### Creacion de tokens (web/supply-chain/src/app/tokens/create/page.tsx)

Componente unificado `CreateTokenForm({ role: UserRole })` para Producer, Factory y Retailer.
El formulario adapta sus campos segun el rol (parents solo para Factory/Retailer).

**Carga masiva CSV:**
- Input file oculto activado via `useRef` para controlar el estilo del boton
- Parser CSV propio `parseCSVRow` que maneja campos entre comillas y escaping de `""` → `"` (necesario para features JSON)
- Procesamiento secuencial con patron imperativo wagmi:
  ```
  publicClient.simulateContract → walletClient.writeContract → publicClient.waitForTransactionReceipt
  ```
  MetaMask muestra un popup por cada fila. Se detiene en el primer error.
- Preview con `LinearProgress` y estado por fila: idle / processing / success / error

### Trazabilidad (web/supply-chain/src/components/shared/TraceabilityDialog.tsx)

BFS sobre tokens on-chain usando `usePublicClient` para lecturas imperativas.
El grafo es SVG puro: nodos circulares, aristas bezier cubicas punteadas, layout por niveles.
Constantes de layout: `NODE_R=28`, `ROW_H=155`, `PAD_X=70`, `PAD_Y=60`.
Marcador de flecha SVG con id `sc-arr` (el ecommerce usa `fp-arr` para evitar conflictos de DOM).

Colores por rol: Producer `#2e7d32`, Factory `#1565c0`, Retailer `#e65100`, Consumer `#6a1b9a`.

---

## Ecommerce — decisiones de arquitectura

### Carrito (web/ecommerce/src/context/CartContext.tsx)

Persistido en `localStorage` con clave `farmaplus-cart-{address}`.
El carrito es por wallet; cambiar de cuenta carga el carrito correspondiente.

### Checkout e invoice (web/ecommerce/src/app/checkout/page.tsx)

**Problema:** al confirmar la compra, `clear()` vaciaba el carrito y la factura quedaba en blanco.

**Solucion:** estado `frozenItems` que hace snapshot de `items` en el momento de `handleComplete`,
antes de llamar a `clear()`. `invoiceData` lee de `frozenItems`, no del carrito live.

**PaymentStep:** recibe `onComplete: () => void` (no prop `confirmed`).
Pago con wallet: transaccion de 0 ETH a la propia address como demo de firma MetaMask.
Pago con tarjeta: simulado con setTimeout de 1400ms.

**Invoice print:** el componente `Invoice.tsx` usa un logo CSS puro (Box + Typography "Fp")
en lugar de un icono SVG para evitar que el SVG escale a pagina completa al imprimir.
Print styles incluyen `svg { display: none !important; }`.

### Trazabilidad en ecommerce (web/ecommerce/src/components/products/TraceabilityDialog.tsx)

Copia directa del componente de supply-chain con dos diferencias:
- ABI path: `@/abi/RawMaterial.json` y `@/abi/UserRegistry.json` (no `@/lib/`)
- Marker SVG id: `fp-arr` (no `sc-arr`)

Enlace "Ver trazabilidad" en `ProductCard` (centrado, parte inferior) y `ProductListItem`
(alineado a izquierda, debajo de "Sold by"). Solo carga el dialog cuando `traceOpen=true`
pasando `tokenId={traceOpen ? BigInt(product.tokenId) : null}`.

---

## i18n

Sistema propio con `createContext` + `useCallback` + persistencia en `localStorage`.
Un archivo por app: `web/supply-chain/src/lib/i18n.tsx` y `web/ecommerce/src/lib/i18n.tsx`.
El hook expone `{ t, locale, setLocale, formatDate }`.
`formatDate` convierte `bigint` (timestamp Unix) a string localizado segun el locale activo.

Cambiar de idioma: bandera en el AppToolbar de ambas apps.

---

## Errores encontrados y sus soluciones

| Error | Causa | Solucion |
|---|---|---|
| `Module not found: @mui/icons-material/HelpOutline` | Nombre incorrecto del icono | Cambiar a `HelpOutlined` (con 'd') |
| `Module not found: @mui/icons-material/RemoveCircleOutline` | Nombre incorrecto | Cambiar a `RemoveCircleOutlined` |
| Icono SVG ocupa toda la pagina al imprimir | `LocalPharmacyIcon` sin CSS de MUI en ventana de impresion | Reemplazar con Box+Typography CSS puro |
| `transferRequests(txId)` en tests retorna tupla no struct | Mapping publico en Solidity devuelve tupla | Helper interno `_getTransfer(txId)` en el test |
| Routing incorrecto al cambiar cuenta MetaMask | Datos cacheados de wagmi con address ya actualizada | Guard con `isFetching` + reset effect en `[address]` |

---

## Convenciones del proyecto

- **MUI v9:** Grid usa prop `size` (no `xs`, `sm`). `slotProps` en lugar de `InputProps`.
- **wagmi v2:** hooks de escritura exponen `isPending` (no `isLoading`). Para operaciones batch usar patron imperativo (`publicClient.simulateContract` + `walletClient.writeContract`) en lugar de encadenar hooks.
- **TypeScript:** verificar con `npx tsc --noEmit` antes de dar una tarea por terminada.
- **Comentarios en codigo:** solo cuando el WHY no es obvio. Sin docstrings de descripcion obvia.
- **Sin librerias de graficos externas:** la visualizacion SVG es intencional para evitar dependencias y tener control total del layout.

---

## Retrospectiva — funcionalidades implementadas

### 1. Fix PaymentStep / CheckoutPage
Refactor del componente `PaymentStep` para usar callback `onComplete` en lugar de prop `confirmed`.
Eliminacion del estado `placing` y del `setTimeout` de simulacion que existian previamente.

### 2. Multi-parent para Factory y Retailer
Boton "+" en el formulario de creacion para agregar tokens parent adicionales.
Los IDs adicionales se serializan en el campo `features` del contrato como `_parentIds`.
El `TraceabilityDialog` los deserializa y los incluye en el BFS para reconstruir el grafo completo.

### 3. Visualizacion de trazabilidad (supply-chain)
Dialogo con grafo SVG de ancestros de un token. Nodos coloreados por rol, aristas bezier punteadas,
hover con detalle y click para seleccion fija. Accesible desde el menu de contexto de cada token.

### 4. Trazabilidad en ecommerce
Copia del `TraceabilityDialog` adaptada para el ecommerce (paths de ABI y marker id distintos).
Enlace "Ver trazabilidad" en `ProductCard` y `ProductListItem`.

### 5. Fix login y mensajes de registro
Guard de `isFetching` para evitar routing con datos cacheados al cambiar cuenta MetaMask.
Pantalla de bienvenida para wallets nuevas (rol selector).
Pantalla "pendiente de aprobacion" con `HourglassEmptyIcon` para usuarios recien registrados.

### 6. Persistencia de items en factura tras compra
Estado `frozenItems` en `CheckoutPage` que captura el carrito antes de vaciarlo.
La factura renderiza desde `frozenItems`, no desde el carrito live.

### 7. Carga masiva por CSV
Seccion de batch upload en la pagina de creacion de tokens.
Parser CSV propio con soporte de comillas y escaping.
Preview con tabla scrollable, estado por fila e indicador de progreso.
Procesamiento secuencial imperativo con confirmacion MetaMask por token.
Descarga de plantilla CSV especifica por rol.

### 8. Documentacion de contratos (NatSpec)
Comentarios `///` en todas las funciones publicas/externas de los tres contratos.
Documentacion de parametros, retornos, restricciones de acceso y efectos secundarios.

### 9. Tests de contratos (114 tests)
`UserRegistry.t.sol`: registro, roles invalidos, approve/reject/setPending, conteo, log de transacciones, fuzz de roles validos.
`RawMaterial.t.sol`: createToken con y sin parent, transferencias completas (create/accept/cancel/reject), balances, queries batch, fuzz de supply y cancel.
`LogisticsTracking.t.sol`: actores, desactivacion, envios, actualizacion de estado por rol, confirmacion/cancelacion, checkpoints, incidentes, resolucion, compliance de temperatura.

### 10. README, manual y archivos de soporte
README reescrito con arbol ASCII de carpetas, stack, entornos, comandos y descripcion de funcionalidades.
`docs/manual-usuario.md`: manual completo en espanol para usuarios finales.
`batch-tokens-example.csv`: plantilla con ejemplos para los tres roles.
`.gitignore` raiz creado.
