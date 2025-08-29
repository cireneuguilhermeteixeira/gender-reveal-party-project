
function FeatureCard({
  emoji,
  title,
  desc,
  accent = 'rose',
}: {
  emoji: string
  title: string
  desc: string
  accent?: 'rose' | 'sky' | 'emerald'
}) {
  const ring =
    accent === 'rose'
      ? 'ring-rose-200/80'
      : accent === 'sky'
      ? 'ring-sky-200/80'
      : 'ring-emerald-200/80'
  return (
    <li className={`rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-sm ring-1 ${ring}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </li>
  )
}

export default FeatureCard;