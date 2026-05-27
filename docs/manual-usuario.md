# Manual de Usuario — Logistics PFM

## Índice

1. [Descripción general](#1-descripción-general)
2. [Requisitos previos](#2-requisitos-previos)
3. [Aplicación Supply Chain](#3-aplicación-supply-chain)
   - 3.1 [Inicio de sesión y registro](#31-inicio-de-sesión-y-registro)
   - 3.2 [Roles del sistema](#32-roles-del-sistema)
   - 3.3 [Panel de Administrador](#33-panel-de-administrador)
   - 3.4 [Crear token (un producto)](#34-crear-token-un-producto)
   - 3.5 [Carga masiva por CSV](#35-carga-masiva-por-csv)
   - 3.6 [Transferir tokens](#36-transferir-tokens)
   - 3.7 [Ver trazabilidad](#37-ver-trazabilidad)
4. [Aplicación Ecommerce (FarmaPlus)](#4-aplicación-ecommerce-farmaplus)
   - 4.1 [Explorar el catálogo](#41-explorar-el-catálogo)
   - 4.2 [Carrito de compras](#42-carrito-de-compras)
   - 4.3 [Proceso de pago (Checkout)](#43-proceso-de-pago-checkout)
   - 4.4 [Ver trazabilidad desde el ecommerce](#44-ver-trazabilidad-desde-el-ecommerce)
5. [Idioma](#5-idioma)
6. [Glosario](#6-glosario)

---

## 1. Descripción general

**Logistics PFM** es una plataforma de trazabilidad de cadena de suministro basada en blockchain (Ethereum / Anvil). Está compuesta por dos aplicaciones web:

| Aplicación | Puerto | Descripción |
|---|---|---|
| **Supply Chain** | 3000 | Gestión de tokens, transferencias y aprobación de usuarios |
| **Ecommerce (FarmaPlus)** | 3001 | Tienda online que consume los tokens del Supply Chain |

Toda la información de tokens y transferencias se almacena en contratos inteligentes (Solidity). No existe base de datos centralizada.

---

## 2. Requisitos previos

- **MetaMask** instalado en el navegador (extensión Chrome/Firefox).
- Red configurada apuntando al nodo local Anvil (`localhost:8545`, Chain ID `31337`) o a la red de destino.
- Saldo de ETH de prueba para pagar el gas (en Anvil todas las cuentas de prueba tienen saldo).

### Importar cuenta de prueba en MetaMask

1. Abrir MetaMask → menú de cuenta → **Importar cuenta**.
2. Pegar la clave privada de la cuenta Anvil (disponible al correr `anvil` en terminal).
3. Cambiar la red a **Localhost 8545**.

---

## 3. Aplicación Supply Chain

### 3.1 Inicio de sesión y registro

1. Ingresar a `http://localhost:3000`.
2. Hacer clic en **Conectar MetaMask**.
3. MetaMask pedirá autorización; aceptar.

**Flujos posibles al conectar:**

| Situación | Pantalla que aparece |
|---|---|
| Wallet nunca registrada | Selector de rol (registro) |
| Registro enviado, esperando aprobación | Tarjeta "Cuenta pendiente de aprobación" |
| Usuario aprobado | Redirección automática al panel del rol |
| Cuenta Anvil de prueba (auto-registro) | Redirección directa |

> **Nota:** Al cambiar de cuenta en MetaMask la app detecta el cambio automáticamente y muestra la pantalla correcta sin necesidad de recargar.

### 3.2 Roles del sistema

| Rol | Color en trazabilidad | Descripción |
|---|---|---|
| **Admin** | — | Aprueba/rechaza usuarios, ve todos los registros |
| **Producer** | Verde `#2e7d32` | Crea tokens de materia prima (sin parent) |
| **Factory** | Azul `#1565c0` | Crea tokens procesados a partir de uno o más parents |
| **Retailer** | Naranja `#e65100` | Crea tokens finales listos para venta |
| **Consumer** | Violeta `#6a1b9a` | Solo puede ver y comprar en el ecommerce |

### 3.3 Panel de Administrador

- **Usuarios**: lista completa de registros con estado (Pendiente / Aprobado / Rechazado).
- Botones **Aprobar** y **Rechazar** disponibles por usuario.
- **Todos los tokens**: vista global de tokens creados en el sistema.

### 3.4 Crear token (un producto)

1. Ir al panel del rol (Producer / Factory / Retailer).
2. Hacer clic en **Crear token** o en el botón `+` de la barra.
3. Completar el formulario:

| Campo | Descripción |
|---|---|
| **Nombre** | Nombre descriptivo del producto |
| **Supply** | Cantidad inicial de unidades |
| **Parent token(s)** | *(Solo Factory y Retailer)* ID(s) del token origen. Usar el botón **+** para agregar más de un parent. |
| **Características** | JSON libre con atributos adicionales, p. ej. `{"origin":"ARG","quality":"A"}` |

4. Hacer clic en **Crear**. MetaMask pedirá confirmar la transacción.

#### Multi-parent (Factory y Retailer)

- El primer parent seleccionado es el parent principal del contrato.
- Los parents adicionales se almacenan dentro del campo `features` como `_parentIds`, lo que permite reconstruir el árbol de trazabilidad completo.

### 3.5 Carga masiva por CSV

Desde el formulario de creación, hacer clic en **Subir CSV** para cargar múltiples tokens en una sola sesión.

#### Columnas por rol

**Producer:**
```
name,supply,features
```

**Factory / Retailer:**
```
name,supply,parentId,additionalParentIds,features
```

#### Reglas de formato

| Regla | Detalle |
|---|---|
| `additionalParentIds` | Múltiples IDs separados por `\|` (pipe), p. ej. `2\|3\|4` |
| `features` | JSON válido entre comillas dobles; escapar `"` internos como `""` |
| Filas vacías o con errores | Se omiten con indicador de error en la vista previa |

#### Descargar plantilla

Hacer clic en **Descargar plantilla** para obtener un CSV de ejemplo con el formato correcto para el rol activo.

#### Proceso de envío

1. Cargar el CSV → se muestra una tabla de previsualización.
2. Revisar errores de validación (columna Estado).
3. Hacer clic en **Crear todos**. MetaMask solicitará confirmación **por cada fila** de forma secuencial.
4. Una barra de progreso indica el avance. Las filas se marcan ✓ o ✗ en tiempo real.

### 3.6 Transferir tokens

1. En "Mis tokens", seleccionar un token → menú de opciones (⋮).
2. Elegir **Transferir**.
3. Ingresar la dirección del destinatario y la cantidad.
4. El destinatario debe **aceptar** la transferencia desde su panel.

Estados posibles de una transferencia:

| Estado | Descripción |
|---|---|
| Pendiente | Creada, esperando respuesta |
| Aceptada | El destinatario recibió los fondos |
| Cancelada | El emisor canceló antes de la respuesta |
| Rechazada | El destinatario rechazó |

### 3.7 Ver trazabilidad

1. En "Mis tokens" o "Todos los tokens", abrir el menú (⋮) de cualquier token.
2. Seleccionar **Ver trazabilidad**.
3. Se abre un diálogo con el árbol de ancestros del token dibujado como grafo SVG.

**Interacción en el grafo:**

- Cada nodo es un token, con color según el rol que lo creó.
- Las líneas punteadas (bezier) conectan tokens con sus parents.
- **Hover** sobre un nodo → muestra detalle (nombre, fecha, rol, ID).
- **Click** sobre un nodo → selecciona el nodo con detalle fijo debajo del grafo.
- Leyenda de colores en el pie del diálogo.

> **Tecnología:** La visualización es SVG puro, sin librerías externas de gráficos.

---

## 4. Aplicación Ecommerce (FarmaPlus)

### 4.1 Explorar el catálogo

- Acceder a `http://localhost:3001`.
- Usar la barra de búsqueda para filtrar por nombre.
- Alternar entre vista **cuadrícula** y vista **lista** con los íconos del toolbar.

### 4.2 Carrito de compras

- Hacer clic en **Agregar al carrito** en cualquier producto.
- El ícono del carrito en la barra muestra la cantidad de ítems.
- Desde el carrito se puede modificar cantidades o eliminar productos.
- El carrito se mantiene por wallet conectada (`localStorage`).

### 4.3 Proceso de pago (Checkout)

El checkout tiene **3 pasos**:

#### Paso 1 — Detalles de compra
- Revisión de los ítems en el carrito con subtotales.
- No se puede continuar con el carrito vacío.

#### Paso 2 — Dirección de envío
- Completar: nombre, calle, ciudad, código postal y país.
- Todos los campos son obligatorios.

#### Paso 3 — Pago

Se ofrecen dos métodos:

**Pago con wallet (MetaMask):**
1. Conectar MetaMask si no está conectada.
2. Hacer clic en **Finalizar pedido**.
3. MetaMask solicita confirmación de transacción (0 ETH, solo demo de permiso).
4. Al confirmar, el pedido queda registrado.

**Pago con tarjeta (simulado):**
1. Completar los datos de tarjeta (número, nombre, vencimiento, CVV).
2. Hacer clic en **Realizar pedido**.
3. Procesamiento simulado de ~1.4 segundos.

#### Factura
- Después del pago se muestra una previsualización de la factura con todos los ítems comprados.
- Los productos permanecen en la factura incluso después de vaciar el carrito.
- Hacer clic en **Imprimir / Guardar PDF** para exportar (abre ventana de impresión del sistema).

### 4.4 Ver trazabilidad desde el ecommerce

En cada producto (vista cuadrícula o lista) aparece un enlace pequeño subrayado **"Ver trazabilidad"** en la parte inferior.

- Al hacer clic se abre un diálogo modal con el mismo grafo SVG del Supply Chain.
- Permite al consumidor verificar el origen completo del producto desde la materia prima hasta el retail.

---

## 5. Idioma

Ambas aplicaciones soportan **español** e **inglés**.

- Hacer clic en la bandera 🇦🇷 / 🇺🇸 en el toolbar para cambiar el idioma.
- La preferencia se guarda en `localStorage` y persiste entre sesiones.

---

## 6. Glosario

| Término | Definición |
|---|---|
| **Token** | Unidad digital que representa un producto o lote en la cadena de suministro |
| **Parent token** | Token del cual deriva otro (materia prima → producto procesado) |
| **Supply** | Cantidad total de unidades de un token al momento de su creación |
| **Balance** | Unidades disponibles actualmente en poder del creador o titular |
| **Transferencia** | Movimiento de unidades de un token entre dos wallets |
| **Trazabilidad** | Árbol completo de ancestros de un token, desde su origen hasta el estado actual |
| **Anvil** | Nodo blockchain local de prueba incluido en Foundry |
| **Forge** | Herramienta de testing y compilación de contratos Solidity (parte de Foundry) |
| **ABI** | Interfaz binaria del contrato, usada por el frontend para interactuar con él |
| **CSV** | Formato de archivo de texto separado por comas, usado para carga masiva de tokens |
