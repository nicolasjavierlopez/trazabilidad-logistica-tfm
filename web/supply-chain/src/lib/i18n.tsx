"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { UserRole, UserStatus } from "@/lib/constants";

export type Locale = "en" | "es";

const translations = {
  en: {
    // Toolbar
    signIn: "Sign in",
    signOut: "Sign out",
    langEnglish: "English",
    langSpanish: "Español",

    // Common
    back: "Back",
    cancel: "Cancel",
    processing: "Processing...",
    retry: "Retry",
    perPage: "Per page:",
    optional: "Optional",
    available: "available",

    // Login
    welcome: "Welcome",
    connectMetaMask: "Connect your MetaMask wallet to access the platform.",
    welcomeNewUser: "New here? Select a role below to register your account.",
    registrationSuccess: "Registration submitted. An administrator will approve your access shortly.",
    pendingApprovalTitle: "Account pending approval",
    pendingApprovalDesc: "Your registration has been received. Please wait for an administrator to approve your account before you can access the platform.",
    sessionStarted: "Session started",

    // RoleSelector
    selectYourRole: "Select your role",
    selectRoleDesc: "Choose the role you want to register with.",
    roleLbl: "Role",
    register: "Register",

    // Admin stats
    totalUsers: "Total users",
    statsPending: "Pending",
    statsApproved: "Approved",
    statsRejected: "Rejected",
    registeredUsers: "Registered users",
    approveAction: "Approve",
    rejectAction: "Reject",
    setPending: "Set Pending",
    viewUser: "View user",
    operationCompleted: "Operation completed",

    // Admin user detail
    userDetail: "User Details",
    registeredAt: "Registered:",
    roleDetail: "Role:",
    totalTransactions: "Total transactions:",
    history: "History",
    noTransactions: "No transactions",

    // Dashboard nav
    myTokens: "My Tokens",
    createToken: "Create Token",
    transfer: "Transfer",
    profileNav: "Profile",

    // Dashboard titles
    producerDashboard: "Producer Dashboard",
    factoryDashboard: "Factory Dashboard",
    retailerDashboard: "Retailer Dashboard",

    // Pending incoming transfers (factory/retailer home)
    pendingIncomingTransfers: "Pending Incoming Transfers",
    noCheckableItems: "No checkeable items at the moment.",
    couldNotLoadTransfers: "Could not load transfers.",
    acceptTransfer: "Accept",
    rejectTransfer: "Reject",

    // Table columns
    colId: "ID",
    colToken: "Token",
    colFrom: "From",
    colAmount: "Amount",
    colDate: "Date",
    colActions: "Actions",
    colStatus: "Status",
    colRecipient: "Recipient",
    colContractNo: "Contract #",
    colName: "Name",
    colSupply: "Supply",
    colBalance: "Balance",
    colCreatedAt: "Created At",

    // Create token — common fields
    tokenName: "Token Name",
    enterTokenName: "Enter the token name",
    totalSupply: "Total Supply",
    enterTotalSupply: "Enter total supply",
    featuresJson: "Features (JSON)",
    invalidJsonFormat: "Invalid JSON format",
    createTokenBtn: "Create Token",

    // Producer create
    createRawMaterialTitle: "Create Raw Material Token",
    createRawMaterialDesc: "Register a new raw material on the blockchain",
    creatingAsProducer: "Creating as Producer",
    producerCreateInfo: "You can create raw material tokens and transfer them to factories.",
    tokenCreatedSuccess: 'Token "{{name}}" created successfully',

    // Factory create
    createProcessedTitle: "Create Token",
    createProcessedDesc: "Create a processed token linked to a raw material",
    parentToken: "Parent Token",
    noAcceptedTransfers: "No accepted incoming transfers yet. Accept a transfer first.",
    tokenBaseFromAccepted: "Token base from accepted incoming transfers",
    creatingAsFactory: "Creating as Factory",
    factoryCreateInfo: "You can create processed tokens linked to raw materials and transfer them to retailers.",
    noAcceptedTransfersAvailable: "No accepted transfers available",

    // Retailer create
    creatingAsRetailer: "Creating as Retailer",
    retailerCreateInfo: "You can create product tokens linked to received factory goods and transfer them to consumers.",

    // MyTokensView
    myTokensSubtitle: "Raw material tokens created by your account",
    createTokenShort: "+ Create Token",
    couldNotLoadTokens: "Could not load tokens. Make sure Anvil is running.",
    noTokensYet: "No tokens created yet.",
    createFirstToken: "Create first token",
    goToEtherscan: "Go to Etherscan",
    transferTokenMenu: "Transfer Token",
    parentLabel: "Parent:",
    viewDetail: "View Detail",
    close: "Close",
    tokenAttributes: "Attributes",
    characteristics: "Characteristics",
    attrId: "ID",
    attrCreator: "Creator",
    featKey: "Key",
    featValue: "Value",
    noCharacteristics: "No characteristics defined.",
    externalSource: "External source",
    receivedBalanceLbl: "Received balance",

    // TransferHistoryView
    transfersTitle: "Transfers",
    transfersSentDesc: "Transfer requests sent by your account",
    noTransfersYet: "No transfers created yet.",
    viewMyTokens: "View my tokens",
    cancelTransferBtn: "Cancel",
    transferCancelled: "Transfer cancelled",

    // Transfer statuses
    statusPending: "Pending",
    statusAccepted: "Accepted",
    statusCancelled: "Cancelled",
    statusRejected: "Rejected",

    // User statuses
    userStatusNone: "None",
    userStatusPending: "Pending",
    userStatusApproved: "Approved",
    userStatusRejected: "Rejected",

    // TransferRequestFormView
    transferTokenTitle: "Transfer Token",
    transferRules: "Transfer Rules",
    youCanTransferTo: "You can transfer to:",
    availableBalance: "Available balance:",
    tokenLbl: "Token:",
    sendTransferRequest: "Send Transfer Request",
    recipientMustAccept: "The recipient will need to accept the transfer.",
    amountLabel: "Amount",
    enterAmount: "Enter amount",
    maximum: "Maximum:",
    importantTitle: "Important",
    importantWarning:
      "This will create a transfer request. The recipient must accept the transfer before the tokens are actually moved. You can cancel the transfer if needed.",
    sendRequestBtn: "Send Request",
    transferCreatedSuccess: "Transfer request created successfully",

    // Profile
    profileTitle: "Profile",
    roleProfile: "Role",
    walletLabel: "Wallet",

    // Multi-parent create
    addParent: "Add parent",
    parentTokens: "Parent tokens",

    // Batch CSV upload
    batchUpload: "Batch upload",
    uploadCsv: "Upload CSV",
    downloadTemplate: "Download template",
    batchPreview: "CSV preview",
    batchCreateAll: "Create {{count}} tokens",
    batchClear: "Clear",
    batchComplete: "Batch complete — {{count}} tokens created",
    batchProgress: "{{done}} / {{total}} processed",
    batchRowsLoaded: "{{count}} rows loaded",
    batchValidationErrors: "{{count}} rows with errors (will be skipped)",
    batchRunning: "Processing…",
    batchColStatus: "Status",
    batchColName: "Name",
    batchColSupply: "Supply",
    batchColParents: "Parent(s)",
    batchColFeatures: "Features",

    // Traceability
    viewTraceability: "View Traceability",
    traceabilityTitle: "Token Traceability",
    traceabilityEmpty: "No traceability data found.",
    traceDetailsLbl: "Details",

    // Role labels
    roleNone: "None",
    roleAdmin: "Admin",
    roleProducer: "Producer",
    roleFactory: "Factory",
    roleRetailer: "Retailer",
    roleConsumer: "Consumer",
  },
  es: {
    // Toolbar
    signIn: "Iniciar sesión",
    signOut: "Cerrar sesión",
    langEnglish: "English",
    langSpanish: "Español",

    // Common
    back: "Volver",
    cancel: "Cancelar",
    processing: "Procesando...",
    retry: "Reintentar",
    perPage: "Por página:",
    optional: "Opcional",
    available: "disponibles",

    // Login
    welcome: "Bienvenido",
    connectMetaMask: "Conectá tu wallet MetaMask para acceder a la plataforma.",
    welcomeNewUser: "¿Primera vez? Seleccioná un rol a continuación para registrarte.",
    registrationSuccess: "Registro enviado. Un administrador aprobará tu acceso en breve.",
    pendingApprovalTitle: "Cuenta pendiente de aprobación",
    pendingApprovalDesc: "Tu registro fue recibido. Por favor esperá a que un administrador apruebe tu cuenta antes de acceder a la plataforma.",
    sessionStarted: "Sesión iniciada",

    // RoleSelector
    selectYourRole: "Selecciona tu rol",
    selectRoleDesc: "Elige el rol con el que deseas registrarte.",
    roleLbl: "Rol",
    register: "Registrarse",

    // Admin stats
    totalUsers: "Total usuarios",
    statsPending: "Pendientes",
    statsApproved: "Aprobados",
    statsRejected: "Rechazados",
    registeredUsers: "Usuarios registrados",
    approveAction: "Aprobar",
    rejectAction: "Rechazar",
    setPending: "Marcar pendiente",
    viewUser: "Ver usuario",
    operationCompleted: "Operación completada",

    // Admin user detail
    userDetail: "Detalle de usuario",
    registeredAt: "Registro:",
    roleDetail: "Rol:",
    totalTransactions: "Total transacciones:",
    history: "Historial",
    noTransactions: "Sin transacciones",

    // Dashboard nav
    myTokens: "Mis Tokens",
    createToken: "Crear Token",
    transfer: "Transferir",
    profileNav: "Perfil",

    // Dashboard titles
    producerDashboard: "Panel del Productor",
    factoryDashboard: "Panel de Fábrica",
    retailerDashboard: "Panel del Minorista",

    // Pending incoming transfers
    pendingIncomingTransfers: "Transferencias Entrantes Pendientes",
    noCheckableItems: "No hay elementos por revisar en este momento.",
    couldNotLoadTransfers: "No se pudo cargar las transferencias.",
    acceptTransfer: "Aceptar",
    rejectTransfer: "Rechazar",

    // Table columns
    colId: "ID",
    colToken: "Token",
    colFrom: "De",
    colAmount: "Cantidad",
    colDate: "Fecha",
    colActions: "Acciones",
    colStatus: "Estado",
    colRecipient: "Destinatario",
    colContractNo: "N° Contrato",
    colName: "Nombre",
    colSupply: "Supply",
    colBalance: "Balance",
    colCreatedAt: "Fecha de creación",

    // Create token — common fields
    tokenName: "Nombre del Token",
    enterTokenName: "Ingrese el nombre del token",
    totalSupply: "Suministro Total",
    enterTotalSupply: "Ingrese el suministro total",
    featuresJson: "Características (JSON)",
    invalidJsonFormat: "Formato JSON inválido",
    createTokenBtn: "Crear Token",

    // Producer create
    createRawMaterialTitle: "Crear Token de Materia Prima",
    createRawMaterialDesc: "Registrar una nueva materia prima en la blockchain",
    creatingAsProducer: "Creando como Productor",
    producerCreateInfo: "Puedes crear tokens de materia prima y transferirlos a fábricas.",
    tokenCreatedSuccess: 'Token "{{name}}" creado correctamente',

    // Factory create
    createProcessedTitle: "Crear Token",
    createProcessedDesc: "Crear un token procesado vinculado a una materia prima",
    parentToken: "Token Padre",
    noAcceptedTransfers: "No hay transferencias aceptadas aún. Acepte una transferencia primero.",
    tokenBaseFromAccepted: "Token base de transferencias entrantes aceptadas",
    creatingAsFactory: "Creando como Fábrica",
    factoryCreateInfo:
      "Puedes crear tokens procesados vinculados a materias primas y transferirlos a minoristas.",
    noAcceptedTransfersAvailable: "No hay transferencias aceptadas disponibles",

    // Retailer create
    creatingAsRetailer: "Creando como Minorista",
    retailerCreateInfo: "Puedes crear tokens de producto vinculados a mercadería de fábrica recibida y transferirlos a consumidores.",

    // MyTokensView
    myTokensSubtitle: "Tokens de materia prima creados por tu cuenta",
    createTokenShort: "+ Crear Token",
    couldNotLoadTokens: "No se pudo cargar los tokens. Verificá que Anvil esté corriendo.",
    noTokensYet: "No tenés tokens creados todavía.",
    createFirstToken: "Crear primer token",
    goToEtherscan: "Ir a Etherscan",
    transferTokenMenu: "Transferir Token",
    parentLabel: "Padre:",
    viewDetail: "Ver detalle",
    close: "Cerrar",
    tokenAttributes: "Atributos",
    characteristics: "Características",
    attrId: "ID",
    attrCreator: "Creador",
    featKey: "Clave",
    featValue: "Valor",
    noCharacteristics: "Sin características definidas.",
    externalSource: "Fuente externa",
    receivedBalanceLbl: "Balance recibido",

    // TransferHistoryView
    transfersTitle: "Transferencias",
    transfersSentDesc: "Solicitudes de transferencia enviadas por tu cuenta",
    noTransfersYet: "No hay transferencias creadas todavía.",
    viewMyTokens: "Ver mis tokens",
    cancelTransferBtn: "Cancelar",
    transferCancelled: "Transferencia cancelada",

    // Transfer statuses
    statusPending: "Pendiente",
    statusAccepted: "Aceptado",
    statusCancelled: "Cancelado",
    statusRejected: "Rechazado",

    // User statuses
    userStatusNone: "Ninguno",
    userStatusPending: "Pendiente",
    userStatusApproved: "Aprobado",
    userStatusRejected: "Rechazado",

    // TransferRequestFormView
    transferTokenTitle: "Transferir Token",
    transferRules: "Reglas de Transferencia",
    youCanTransferTo: "Puedes transferir a:",
    availableBalance: "Balance disponible:",
    tokenLbl: "Token:",
    sendTransferRequest: "Enviar Solicitud de Transferencia",
    recipientMustAccept: "El destinatario deberá aceptar la transferencia.",
    amountLabel: "Cantidad",
    enterAmount: "Ingrese la cantidad",
    maximum: "Máximo:",
    importantTitle: "Importante",
    importantWarning:
      "Esto creará una solicitud de transferencia. El destinatario debe aceptarla antes de que los tokens sean movidos. Puedes cancelar la transferencia si es necesario.",
    sendRequestBtn: "Enviar Solicitud",
    transferCreatedSuccess: "Solicitud de transferencia creada exitosamente",

    // Profile
    profileTitle: "Perfil",
    roleProfile: "Rol",
    walletLabel: "Billetera",

    // Multi-parent create
    addParent: "Agregar parent",
    parentTokens: "Tokens padre",

    // Batch CSV upload
    batchUpload: "Carga masiva",
    uploadCsv: "Subir CSV",
    downloadTemplate: "Descargar plantilla",
    batchPreview: "Vista previa del CSV",
    batchCreateAll: "Crear {{count}} tokens",
    batchClear: "Limpiar",
    batchComplete: "Carga completa — {{count}} tokens creados",
    batchProgress: "{{done}} / {{total}} procesados",
    batchRowsLoaded: "{{count}} filas cargadas",
    batchValidationErrors: "{{count}} filas con errores (serán omitidas)",
    batchRunning: "Procesando…",
    batchColStatus: "Estado",
    batchColName: "Nombre",
    batchColSupply: "Suministro",
    batchColParents: "Parent(s)",
    batchColFeatures: "Features",

    // Traceability
    viewTraceability: "Ver Trazabilidad",
    traceabilityTitle: "Trazabilidad del Token",
    traceabilityEmpty: "No se encontraron datos de trazabilidad.",
    traceDetailsLbl: "Detalles",

    // Role labels
    roleNone: "Ninguno",
    roleAdmin: "Admin",
    roleProducer: "Productor",
    roleFactory: "Fábrica",
    roleRetailer: "Minorista",
    roleConsumer: "Consumidor",
  },
} as const;

type TranslationDict = typeof translations.en;
type TranslationKey = keyof TranslationDict;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
  formatDate: (ts: bigint) => string;
  getRoleLabel: (role: UserRole) => string;
  getTransferStatusLabel: (status: number) => string;
  getUserStatusLabel: (status: UserStatus) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved === "en" || saved === "es") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string>): string => {
      const dict = translations[locale] as Record<string, string>;
      let str = dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{{${k}}}`, v);
        });
      }
      return str;
    },
    [locale]
  );

  const formatDate = useCallback(
    (ts: bigint) =>
      new Date(Number(ts) * 1000).toLocaleString(locale === "en" ? "en-US" : "es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [locale]
  );

  const getRoleLabel = useCallback(
    (role: UserRole): string => {
      const map: Record<UserRole, TranslationKey> = {
        [UserRole.None]: "roleNone",
        [UserRole.Admin]: "roleAdmin",
        [UserRole.Producer]: "roleProducer",
        [UserRole.Factory]: "roleFactory",
        [UserRole.Retailer]: "roleRetailer",
        [UserRole.Consumer]: "roleConsumer",
      };
      return t(map[role] ?? "roleNone");
    },
    [t]
  );

  const getTransferStatusLabel = useCallback(
    (status: number): string => {
      const map: Record<number, TranslationKey> = {
        0: "statusPending",
        1: "statusAccepted",
        2: "statusCancelled",
        3: "statusRejected",
      };
      return t(map[status] ?? "statusPending");
    },
    [t]
  );

  const getUserStatusLabel = useCallback(
    (status: UserStatus): string => {
      const map: Record<UserStatus, TranslationKey> = {
        [UserStatus.None]: "userStatusNone",
        [UserStatus.Pending]: "userStatusPending",
        [UserStatus.Approved]: "userStatusApproved",
        [UserStatus.Rejected]: "userStatusRejected",
      };
      return t(map[status] ?? "userStatusNone");
    },
    [t]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, formatDate, getRoleLabel, getTransferStatusLabel, getUserStatusLabel }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
