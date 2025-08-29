import FloatingDoodles from "./FloatingDoodles";

function AppShellKids({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-rose-50 via-sky-50 to-emerald-50 text-slate-800">
      <div className="pointer-events-none absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-pink-300/30 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[30rem] w-[30rem] rounded-full bg-sky-300/30 blur-3xl animate-pulse [animation-delay:400ms]" />
      <div className="pointer-events-none absolute top-1/3 -right-16 h-72 w-72 rounded-full bg-amber-200/50 blur-2xl animate-pulse [animation-delay:800ms]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(#0ea5e9 0.8px, transparent 0.8px), radial-gradient(#f97316 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10">{children}</div>

      <footer className="relative mx-auto max-w-6xl px-4 pt-6 pb-10 text-sm text-slate-500">
        <div className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md px-4 py-3 shadow-sm">
          Operação Berço — O Caso do Pequeno Segredo · <span className="font-medium">v1.0</span>
        </div>
      </footer>

      <FloatingDoodles />
    </main>
  )
}

export default AppShellKids;