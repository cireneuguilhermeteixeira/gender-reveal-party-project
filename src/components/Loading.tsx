function Loading () {
  return (
     <div className="animate-pulse">
        <div className="h-6 w-2/3 bg-slate-200 rounded mb-4" />
        <div className="h-24 bg-slate-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded" />
        </div>
    </div>
  );
}

export default Loading;