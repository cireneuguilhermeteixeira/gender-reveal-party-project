import React from 'react';


type WaitingForPlayersProps = {
  sessionLink: string;
  copyToClipboard: () => void;
  copied: boolean;
  goToNextPhase: () => void;
  advancingRef: React.MutableRefObject<boolean>;
};

const WaitingForPlayers = ({
    sessionLink,
    copyToClipboard,
    copied,
    goToNextPhase,
    advancingRef
} : WaitingForPlayersProps) => {
    return (
        <>
            <h2 className="text-xl font-semibold mb-2">Sessão criada ✅</h2>
            <p className="text-sm text-neutral-300 mb-4">Compartilhe o link com os participantes para eles entrarem:</p>

            <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly value={sessionLink} className="flex-1 border border-neutral-700 bg-neutral-950 rounded-lg px-3 py-2 text-sm" />
            <button onClick={copyToClipboard} className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-medium transition">
                {copied ? 'Copiado!' : 'Copiar'}
            </button>
            </div>

            <div className="mt-6">
            <button onClick={goToNextPhase} disabled={advancingRef.current} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-5 py-3 font-semibold transition">
                {advancingRef.current && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" d="M4 12a8 8 0 018-8v4" fill="currentColor" />
                </svg>
                )}
                Iniciar Jogo
            </button>
            </div>
        </>
      
    );
};

export default WaitingForPlayers;