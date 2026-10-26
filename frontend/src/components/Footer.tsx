interface FooterProps {
  endpoint: string;
}

export function Footer({ endpoint }: FooterProps) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Bakmon · Backup monitor</p>
        <p
          className="truncate font-mono text-[11px]"
          title={`WebSocket endpoint: ${endpoint}`}
        >
          WebSocket · {endpoint}
        </p>
      </div>
    </footer>
  );
}
