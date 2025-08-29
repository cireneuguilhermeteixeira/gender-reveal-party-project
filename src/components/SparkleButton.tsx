function SparkleButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      {...props}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 px-5 py-3 font-semibold text-slate-800 shadow-lg shadow-rose-200/50 transition active:scale-[0.98] hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/0 [mask-image:radial-gradient(60%_40%_at_30%_-20%,#000_20%,transparent_60%)]" />
      {children}
    </button>
  )
}

export default SparkleButton;