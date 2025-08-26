interface ImportMetaEnv {
    readonly VITE_IP_SERVER: string;
    readonly VITE_PORT: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
