import { useEffect, useMemo, useState } from "react";
import SparkleButton from "./SparkleButton";

type FinalRevelationProps = {
    isHost?: boolean;
    onReveal?: () => void;
    gender: string | undefined;
}

function FinalRevelation({ isHost, onReveal, gender }: FinalRevelationProps) {
    const [revealStarted, setRevealStarted] = useState(false);
    const [revealCountdown, setRevealCountdown] = useState(10);
    const revealSteps = [
        "Coletando pistas…",
        "Analisando palpites…",
        "Conferindo evidências…",
        "Decifrando o enigma…",
        "Preparando a revelação…",
    ];

    const stepIndex = useMemo(
        () => Math.min(revealSteps.length - 1, Math.floor((10 - revealCountdown) / 2)),
        [revealCountdown, revealSteps.length]
    );

    // Contagem da revelação final
    useEffect(() => {
        if (!revealStarted) return;
        if (revealCountdown <= 0) return;
        const id = setInterval(() => setRevealCountdown((v) => v - 1), 1000);
        return () => clearInterval(id);
    }, [revealStarted, revealCountdown]);

    const revealSecret = () => {
        setRevealStarted(true);
        setRevealCountdown(10);
        localStorage.clear();
        if (onReveal) onReveal();
    }

    return (
      <section className="w-full max-w-2xl mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center shadow">
        {!revealStarted ? (
            <>
            <p className="text-slate-700">
                Com todas as pistas coletadas, estamos prontos para o grande momento.
            </p>
            <p className="text-slate-600 text-sm mt-1">
                Iniciaremos a contagem para revelar o segredo!
            </p>
            <div className="mt-4">
                {isHost && <SparkleButton onClick={revealSecret}>Revelar segredo</SparkleButton>}
            </div>
            </>
        ) : revealCountdown > 0 ? (
            <>
            <p className="text-slate-800 font-extrabold text-3xl">{revealCountdown}</p>
            <p className="text-slate-700 mt-2">{revealSteps[stepIndex]}</p>
            <div className="mt-3 h-2 w-full rounded bg-slate-200 overflow-hidden">
                <div
                className="h-2 bg-emerald-400 transition-[width] duration-1000"
                style={{ width: `${((10 - revealCountdown) / 10) * 100}%` }}
                />
            </div>
            </>
        ) : (
            <>
              {gender === 'boy' ? (
                <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6">
                <p className="text-4xl md:text-5xl font-black text-emerald-600">É um MENINO! 💚🎉</p>
                <p className="mt-2 text-slate-700">Parabéns! Obrigado por brincar com a gente.</p>
                </div>
            ) : (
                <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-6">
                <p className="text-4xl md:text-5xl font-black text-violet-600">É uma MENINA! 💜🎉</p>
                <p className="mt-2 text-slate-700">Parabéns! Obrigado por brincar com a gente.</p>
                </div>
            )}
            </>
        )}
        </section>
    );
}

export default FinalRevelation;
