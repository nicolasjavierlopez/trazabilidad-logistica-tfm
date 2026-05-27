"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Locale = "en" | "es";

const translations = {
  en: {
    // Nav
    navProducts: "Products",
    navAbout: "About us",
    navFaqs: "FAQs",
    langEn: "English",
    langEs: "Español",
    // Auth
    signIn: "Sign in",
    signOut: "Disconnect",
    cart: "Cart",
    copyAddress: "Copy address",
    copied: "Copied!",
    network: "Network",
    // Home
    storeSubtitle: "Certified products, traceable on the blockchain from origin to your hands.",
    productsAvailable: "{{count}} product{{plural}} available",
    noProducts: "No products available right now. Check back soon.",
    loadingMore: "Loading more...",
    allLoaded: "All products loaded",
    searchPlaceholder: "Search products...",
    viewGrid: "Grid view",
    viewList: "List view",
    filterResults: "{{count}} result{{plural}} for \"{{term}}\"",
    noResults: "No products match your search.",
    // Product card
    addToCart: "Add to cart",
    noImage: "No image available",
    soldBy: "Sold by",
    details: "Details",
    // Product dialog
    attributes: "Attributes",
    characteristics: "Characteristics",
    close: "Close",
    attrTokenId: "Token ID",
    attrSupply: "Supply",
    attrSoldBy: "Sold by",
    attrListed: "Listed",
    noCharacteristics: "No characteristics defined.",
    // Checkout
    checkout: "Checkout",
    backToStore: "Back to store",
    stepPurchaseDetails: "Purchase details",
    stepAddress: "Shipping address",
    stepPayment: "Payment",
    continue: "Continue",
    back: "Back",
    placeOrder: "Place order",
    finalizeOrder: "Finalizar compra",
    processing: "Processing…",
    done: "Done",
    orderConfirmed: "Order confirmed! Below is your invoice.",
    reviewItems: "Review the items in your order before continuing.",
    enterAddress: "Enter your shipping address for this order.",
    paymentMethod: "Payment method",
    payWithWallet: "Wallet",
    payWithCard: "Credit Card",
    walletPayInfo: "Your connected MetaMask wallet will sign a transaction to confirm the purchase.",
    walletNotConnected: "Connect your wallet (Sign in) to use this payment method.",
    txPending: "Waiting for MetaMask...",
    txConfirming: "Confirming on chain...",
    paymentSimulated: "Enter your payment details. This is a simulation — no real charge will be made.",
    invoicePreview: "Invoice Preview",
    printSavePdf: "Print / Save PDF",
    billTo: "Bill to",
    product: "Product",
    qty: "Qty",
    totalItems: "Total items:",
    totalProducts: "Products:",
    clearCart: "Clear cart",
    fullName: "Full name",
    streetAddress: "Street address",
    city: "City",
    postalCode: "Postal code",
    country: "Country",
    cardholderName: "Cardholder name",
    cardNumber: "Card number",
    expiry: "Expiry",
    cvv: "CVV",
    // Footer
    footerText: "Proyecto Ethereum — PFM CodeCrypto 2026",
    // About
    aboutHeroTitle: "Traceable health products, powered by Ethereum",
    aboutHeroSubtitle: "FarmaPlus is a blockchain-based marketplace that guarantees the authenticity and traceability of every product from producer to consumer.",
    aboutMissionTitle: "Our Mission",
    aboutMissionText: "To democratize access to certified pharmaceutical products through transparent, decentralised supply chains.",
    aboutVisionTitle: "Our Vision",
    aboutVisionText: "A world where every health product carries an immutable digital history verifiable by anyone.",
    aboutTechTitle: "The Technology",
    aboutTechText: "Every product listed on FarmaPlus corresponds to a token on the Ethereum blockchain. Its journey — from raw material to factory to retailer — is permanently recorded and auditable.",
    aboutBlockchainTitle: "Why Ethereum?",
    aboutBlockchainText: "Ethereum provides a public, censorship-resistant ledger. Smart contracts eliminate intermediaries, reducing fraud and ensuring that product data cannot be altered retroactively.",
    // FAQs
    faqsHeroTitle: "Frequently Asked Questions",
    faqsHeroSubtitle: "Everything you need to know about FarmaPlus and blockchain-backed products.",
    faq1Q: "What is FarmaPlus?",
    faq1A: "FarmaPlus is a demo e-commerce platform built on Ethereum. Every product is backed by a blockchain token that records its full supply-chain history.",
    faq2Q: "Do I need a wallet to browse products?",
    faq2A: "No. You can browse the catalogue freely. A wallet (MetaMask) is only required when you want to check out using Wallet payment.",
    faq3Q: "How is product authenticity guaranteed?",
    faq3A: "Each product originates from a verified Producer, is processed by an approved Factory, and listed by a registered Retailer. Every step is recorded on-chain and cannot be modified.",
    faq4Q: "What is a blockchain token?",
    faq4A: "A token is a unique digital asset registered on Ethereum that represents a batch of physical goods. It carries metadata such as origin, quality certifications, and processing history.",
    faq5Q: "Is my payment secure?",
    faq5A: "Credit card payments in this demo are purely simulated. Wallet payments trigger a real MetaMask transaction signing so you can experience the flow — no funds leave your account beyond gas fees.",
    faq6Q: "Can I return or cancel an order?",
    faq6A: "This is a demo environment. In a production version, return policies would be handled off-chain by the retailer, while the token transfer would be reversed via a smart-contract call.",
    faq7Q: "What networks are supported?",
    faq7A: "The app can connect to a local Anvil development chain or to the Sepolia test network via Alchemy. Mainnet deployment is planned for future iterations.",
    // Traceability
    viewTraceability: "View traceability",
    traceabilityTitle: "Product Traceability",
    traceabilityEmpty: "No traceability data found.",
  },
  es: {
    // Nav
    navProducts: "Productos",
    navAbout: "Nosotros",
    navFaqs: "FAQs",
    langEn: "English",
    langEs: "Español",
    // Auth
    signIn: "Ingresar",
    signOut: "Desconectar",
    cart: "Carrito",
    copyAddress: "Copiar dirección",
    copied: "¡Copiado!",
    network: "Red",
    // Home
    storeSubtitle: "Productos certificados, trazables en blockchain desde el origen hasta tus manos.",
    productsAvailable: "{{count}} producto{{plural}} disponible{{plural}}",
    noProducts: "Sin productos disponibles por ahora. Volvé pronto.",
    loadingMore: "Cargando más...",
    allLoaded: "Todos los productos cargados",
    searchPlaceholder: "Buscar productos...",
    viewGrid: "Vista en grilla",
    viewList: "Vista en lista",
    filterResults: "{{count}} resultado{{plural}} para \"{{term}}\"",
    noResults: "Ningún producto coincide con tu búsqueda.",
    // Product card
    addToCart: "Agregar al carrito",
    noImage: "Sin imagen disponible",
    soldBy: "Vendido por",
    details: "Detalles",
    // Product dialog
    attributes: "Atributos",
    characteristics: "Características",
    close: "Cerrar",
    attrTokenId: "ID Token",
    attrSupply: "Suministro",
    attrSoldBy: "Vendido por",
    attrListed: "Publicado",
    noCharacteristics: "Sin características definidas.",
    // Checkout
    checkout: "Pagar",
    backToStore: "Volver a la tienda",
    stepPurchaseDetails: "Detalles de compra",
    stepAddress: "Dirección",
    stepPayment: "Pago",
    continue: "Continuar",
    back: "Volver",
    placeOrder: "Realizar pedido",
    finalizeOrder: "Finalizar compra",
    processing: "Procesando…",
    done: "Listo",
    orderConfirmed: "¡Pedido confirmado! A continuación tu factura.",
    reviewItems: "Revisá los productos de tu pedido antes de continuar.",
    enterAddress: "Ingresá tu dirección de envío para este pedido.",
    paymentMethod: "Método de pago",
    payWithWallet: "Wallet",
    payWithCard: "Tarjeta de crédito",
    walletPayInfo: "Tu wallet MetaMask conectada firmará una transacción para confirmar la compra.",
    walletNotConnected: "Conectá tu wallet (Ingresar) para usar este método de pago.",
    txPending: "Esperando MetaMask...",
    txConfirming: "Confirmando en la red...",
    paymentSimulated: "Ingresá tus datos de pago. Es una simulación — no se realizará ningún cobro real.",
    invoicePreview: "Vista previa de factura",
    printSavePdf: "Imprimir / Guardar PDF",
    billTo: "Facturar a",
    product: "Producto",
    qty: "Cant.",
    totalItems: "Total items:",
    totalProducts: "Productos:",
    clearCart: "Vaciar carrito",
    fullName: "Nombre completo",
    streetAddress: "Dirección",
    city: "Ciudad",
    postalCode: "Código postal",
    country: "País",
    cardholderName: "Nombre en la tarjeta",
    cardNumber: "Número de tarjeta",
    expiry: "Vencimiento",
    cvv: "CVV",
    // Footer
    footerText: "Proyecto Ethereum — PFM CodeCrypto 2026",
    // About
    aboutHeroTitle: "Productos de salud trazables, impulsados por Ethereum",
    aboutHeroSubtitle: "FarmaPlus es un marketplace basado en blockchain que garantiza la autenticidad y trazabilidad de cada producto desde el productor hasta el consumidor.",
    aboutMissionTitle: "Nuestra Misión",
    aboutMissionText: "Democratizar el acceso a productos farmacéuticos certificados a través de cadenas de suministro transparentes y descentralizadas.",
    aboutVisionTitle: "Nuestra Visión",
    aboutVisionText: "Un mundo donde cada producto de salud lleva un historial digital inmutable verificable por cualquier persona.",
    aboutTechTitle: "La Tecnología",
    aboutTechText: "Cada producto listado en FarmaPlus corresponde a un token en la blockchain de Ethereum. Su recorrido — desde la materia prima hasta la fábrica y el minorista — queda registrado de forma permanente y auditable.",
    aboutBlockchainTitle: "¿Por qué Ethereum?",
    aboutBlockchainText: "Ethereum proporciona un registro público y resistente a la censura. Los contratos inteligentes eliminan intermediarios, reducen el fraude y garantizan que los datos no puedan alterarse retroactivamente.",
    // FAQs
    faqsHeroTitle: "Preguntas Frecuentes",
    faqsHeroSubtitle: "Todo lo que necesitás saber sobre FarmaPlus y los productos respaldados por blockchain.",
    faq1Q: "¿Qué es FarmaPlus?",
    faq1A: "FarmaPlus es una plataforma de e-commerce demo construida sobre Ethereum. Cada producto está respaldado por un token blockchain que registra su historial completo en la cadena de suministro.",
    faq2Q: "¿Necesito una wallet para ver los productos?",
    faq2A: "No. Podés explorar el catálogo libremente. Una wallet (MetaMask) solo es necesaria si querés pagar con Wallet al hacer el checkout.",
    faq3Q: "¿Cómo se garantiza la autenticidad del producto?",
    faq3A: "Cada producto proviene de un Productor verificado, es procesado por una Fábrica aprobada y listado por un Minorista registrado. Cada paso queda registrado on-chain y no puede modificarse.",
    faq4Q: "¿Qué es un token blockchain?",
    faq4A: "Un token es un activo digital único registrado en Ethereum que representa un lote de bienes físicos. Contiene metadatos como origen, certificaciones de calidad e historial de procesamiento.",
    faq5Q: "¿Es seguro mi pago?",
    faq5A: "Los pagos con tarjeta en este demo son simulados. Los pagos con Wallet activan una firma real de transacción en MetaMask para que puedas experimentar el flujo — no se transfieren fondos más allá del gas.",
    faq6Q: "¿Puedo devolver o cancelar un pedido?",
    faq6A: "Este es un entorno demo. En producción, las devoluciones serían gestionadas off-chain por el minorista, mientras que la transferencia del token se revertiría mediante un contrato inteligente.",
    faq7Q: "¿Qué redes están soportadas?",
    faq7A: "La app puede conectarse a una cadena de desarrollo Anvil local o a la red de prueba Sepolia via Alchemy. El despliegue en Mainnet está planificado para futuras iteraciones.",
    // Traceability
    viewTraceability: "Ver trazabilidad",
    traceabilityTitle: "Trazabilidad del Producto",
    traceabilityEmpty: "No se encontraron datos de trazabilidad.",
  },
} as const;

type TranslationDict = typeof translations.en;
type TranslationKey = keyof TranslationDict;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
  formatDate: (ts: bigint) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const saved = localStorage.getItem("fp-locale") as Locale | null;
    if (saved === "en" || saved === "es") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("fp-locale", l);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string>): string => {
      const dict = translations[locale] as Record<string, string>;
      let str = dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{{${k}}}`, v); });
      }
      return str;
    },
    [locale]
  );

  const formatDate = useCallback((ts: bigint): string => {
    const ms = Number(ts) * 1000;
    return new Date(ms).toLocaleString(locale === "es" ? "es-AR" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }, [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, t, formatDate }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
