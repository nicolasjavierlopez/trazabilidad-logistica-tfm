# Diagramas — Logistics PFM

Colección de diagramas Mermaid del proyecto. Cubren arquitectura lógica,
flujo de transferencia de tokens, interacción entre capas y ciclo de vida de un producto.

---

## 1. Arquitectura lógica

```mermaid
flowchart LR
    subgraph LEGEND["📋 Roles"]
        direction LR
        L1["🟤 Admin"]:::admin ~~~ L2["🟢 Producer"]:::producer ~~~ L3["🔵 Factory"]:::factory ~~~ L4["🟠 Retailer"]:::retailer ~~~ L5["🟣 Consumer"]:::consumer
    end

    subgraph PORT3000["🖥️ :3000 — Supply Chain"]
        A1["🟤 Admin"]:::admin --> P1["🟢 Producer\nCrea token"]:::producer
        P1 --> F1["🔵 Factory\nProcesa"]:::factory
        F1 --> R1["🟠 Retailer\nPublica"]:::retailer
    end

    subgraph PORT3001["🛒 :3001 — Ecommerce"]
        E1["🟠 Retailer\nCatálogo"]:::retailer --> E2["🟣 Consumer\nCompra"]:::consumer
        E2 --> E3["✅ TX on-chain"]:::consumer
    end

    R1 -->|"token listado"| E1

    classDef admin    fill:#795548,color:#fff,stroke:#5d4037
    classDef producer fill:#2e7d32,color:#fff,stroke:#1b5e20
    classDef factory  fill:#1565c0,color:#fff,stroke:#0d47a1
    classDef retailer fill:#e65100,color:#fff,stroke:#bf360c
    classDef consumer fill:#6a1b9a,color:#fff,stroke:#4a148c

    style PORT3000 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style PORT3001 fill:#ede7f6,stroke:#6a1b9a,stroke-width:2px
    style LEGEND   fill:#fafafa,stroke:#bdbdbd,stroke-width:1px
```

Vista general del sistema. Muestra los dos entornos web (`:3000` Supply Chain y `:3001` Ecommerce),
los roles involucrados en cada uno y cómo el token fluye desde el Retailer en la gestión interna
hasta el catálogo público de FarmaPlus.

---

## 2. Flujo de transferencia de tokens por rol

```mermaid
flowchart TB
    subgraph LEGEND["📋 Roles"]
        direction TB
        L1["🟤 Admin"]:::admin ~~~ L2["🟢 Producer"]:::producer ~~~ L3["🔵 Factory"]:::factory ~~~ L4["🟠 Retailer"]:::retailer ~~~ L5["🟣 Consumer"]:::consumer
    end

    subgraph ENVS[" "]
        direction LR
        subgraph PORT3000["🖥️  Supply Chain — :3000"]
            direction TB
            A1["🟤 Admin\nAprueba usuarios"]:::admin
            P1["🟢 Producer\nCrea token\nRawMaterial"]:::producer
            F1["🔵 Factory\nAcepta & procesa\nbatch/token"]:::factory
            R1["🟠 Retailer\nAcepta &\ncrea producto"]:::retailer
            A1 --> P1 -->|"createTransferRequest"| F1 -->|"createTransferRequest"| R1
        end

        subgraph PORT3001["🛒  Ecommerce — :3001"]
            direction TB
            E1["🟠 Retailer\nProducto en\ncatálogo"]:::retailer
            E2["🟣 Consumer\nCarrito &\ncheckout"]:::consumer
            E3{"💳 Pago"}
            E4["✅ TX firmada\non-chain"]:::consumer
            E1 --> E2 --> E3
            E3 -->|"Wallet"| E4
            E3 -->|"Tarjeta"| E4
        end

        R1 -->|"token listado"| E1
    end

    LEGEND ~~~ ENVS

    classDef admin    fill:#795548,color:#fff,stroke:#5d4037
    classDef producer fill:#2e7d32,color:#fff,stroke:#1b5e20
    classDef factory  fill:#1565c0,color:#fff,stroke:#0d47a1
    classDef retailer fill:#e65100,color:#fff,stroke:#bf360c
    classDef consumer fill:#6a1b9a,color:#fff,stroke:#4a148c

    style PORT3000 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b5e20
    style PORT3001 fill:#ede7f6,stroke:#6a1b9a,stroke-width:2px,color:#4a148c
    style LEGEND   fill:#fafafa,stroke:#bdbdbd,stroke-width:1px
    style ENVS     fill:transparent,stroke:transparent
```

Detalla paso a paso cómo un token recorre los roles desde su creación. El Admin habilita a los
actores, el Producer origina el token, la Factory lo procesa y el Retailer lo publica. En `:3001`
el Consumer puede pagar con wallet MetaMask o tarjeta simulada.

---

## 3. Flujo de proceso con actores y capas técnicas

```mermaid
flowchart LR
    U(["👤 Usuario"])

    F["🖥️ Frontend\nNext.js"]

    MM{{"🦊 MetaMask\nFirma TX"}}

    RPC[("🔗 Nodo RPC\nAnvil / Alchemy")]

    SC[["📄 Smart Contract\nValida & escribe estado"]]

    BC(["⛓️ Bloque confirmado\nEthereum / Sepolia"])

    U -->|"interactúa"| F
    F -->|"writeContract"| MM
    MM -->|"TX firmada"| RPC
    RPC -->|"broadcast"| SC
    SC -->|"evento emitido"| BC
    BC -->|"receipt"| F

    style U   fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style F   fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style MM  fill:#fff8e1,stroke:#f9a825,stroke-width:2px
    style RPC fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style SC  fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style BC  fill:#fbe9e7,stroke:#bf360c,stroke-width:2px
```

Ciclo completo de una transacción de escritura visto desde la capa técnica. El usuario dispara
la acción en el Frontend (wagmi), MetaMask firma, el Nodo RPC hace el broadcast, el Smart Contract
valida y persiste el estado en la Blockchain, y el `receipt` regresa al Frontend para actualizar la UI.

---

## 4. Flujo simplificado de transferencia de tokens

```mermaid
flowchart LR
    subgraph LEGEND["📋 Roles"]
        direction LR
        L1["🟤 Admin"]:::admin ~~~ L2["🟢 Producer"]:::producer ~~~ L3["🔵 Factory"]:::factory ~~~ L4["🟠 Retailer"]:::retailer ~~~ L5["🟣 Consumer"]:::consumer
    end

    subgraph PORT3000["🖥️ :3000 — Supply Chain"]
        A1["🟤 Admin"]:::admin --> P1["🟢 Producer\nCrea token"]:::producer
        P1 -->|"createTransferRequest"| F1["🔵 Factory\nAcepta & procesa"]:::factory
        F1 -->|"createTransferRequest"| R1["🟠 Retailer\nPublica"]:::retailer
    end

    subgraph PORT3001["🛒 :3001 — Ecommerce"]
        E1["🟠 Retailer\nCatálogo"]:::retailer --> E2["🟣 Consumer\nCompra"]:::consumer
        E2 --> E3{"💳 Pago"}
        E3 -->|"Wallet"| E4["✅ TX on-chain"]:::consumer
        E3 -->|"Tarjeta"| E4
    end

    LEGEND ~~~ PORT3000
    R1 -->|"token listado"| E1

    classDef admin    fill:#795548,color:#fff,stroke:#5d4037
    classDef producer fill:#2e7d32,color:#fff,stroke:#1b5e20
    classDef factory  fill:#1565c0,color:#fff,stroke:#0d47a1
    classDef retailer fill:#e65100,color:#fff,stroke:#bf360c
    classDef consumer fill:#6a1b9a,color:#fff,stroke:#4a148c

    style PORT3000 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style PORT3001 fill:#ede7f6,stroke:#6a1b9a,stroke-width:2px
    style LEGEND   fill:#fafafa,stroke:#bdbdbd,stroke-width:1px
```

Versión compacta del flujo completo. Útil como referencia rápida: muestra los dos entornos,
los nombres de las funciones clave del contrato (`createTransferRequest`) y los dos métodos
de pago disponibles en el checkout.

---

## 5. Diagrama de secuencia — Vitamina B12

```mermaid
sequenceDiagram
    actor ADM as 🟤 Admin
    actor PRO as 🟢 Producer
    actor FAC as 🔵 Factory
    actor RET as 🟠 Retailer
    actor CON as 🟣 Consumer
    participant SC as 📄 Smart Contract
    participant BC as ⛓️ Blockchain

    rect rgb(240, 235, 230)
        note over ADM,SC: Registro de usuarios — :3000
        ADM->>SC: approveUser(Producer)
        ADM->>SC: approveUser(Factory)
        ADM->>SC: approveUser(Retailer)
    end

    rect rgb(232, 245, 233)
        note over PRO,BC: Materia prima — :3000
        PRO->>SC: createToken("Vitamina B12 · Materia Prima", supply=5000)
        SC->>BC: Token #1 minteado
        PRO->>SC: createTransferRequest(#1 → Factory, 4000 u.)
        FAC->>SC: acceptTransfer(txId)
        BC-->>FAC: 4000 unidades recibidas
    end

    rect rgb(227, 242, 253)
        note over FAC,BC: Procesado en cápsulas — :3000
        FAC->>SC: createToken("Vitamina B12 · Cápsulas 500mg", parentId=#1, supply=4000)
        SC->>BC: Token #2 minteado
        FAC->>SC: createTransferRequest(#2 → Retailer, 4000 u.)
        RET->>SC: acceptTransfer(txId)
        BC-->>RET: lote recibido
    end

    rect rgb(255, 243, 224)
        note over RET,BC: Publicación en ecommerce — :3000 → :3001
        RET->>SC: createToken("Vitamina B12 FarmaPlus", parentId=#2, price=12.99)
        SC->>BC: Token #3 listado
    end

    rect rgb(237, 231, 246)
        note over CON,BC: Compra — :3001
        CON->>RET: checkout (carrito + pago)
        RET->>SC: transferToken(#3 → Consumer)
        SC->>BC: TX confirmada
        BC-->>CON: ✅ Vitamina B12 adquirida
    end
```

Ciclo de vida completo de la Vitamina B12 con interacciones temporales entre actores.
Muestra el orden exacto de las llamadas al Smart Contract: aprobación de usuarios, creación
encadenada de tokens con `parentId` (trazabilidad), transferencias entre roles y compra final
por el Consumer en `:3001`. Cada bloque coloreado representa una fase del proceso.
