'use client';

import { User } from '@prisma/client';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

type WaitingForPlayersProps = {
  sessionLink: string;
  copyToClipboard: () => void;
  copied: boolean;
  goToNextPhase: () => void;
  advancingRef: React.MutableRefObject<boolean>;
  users: User[];
};

function getInitials(name?: string | null) {
  if (!name) return '👤';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '👤';
}

const WaitingForPlayers = ({
  sessionLink,
  copyToClipboard,
  copied,
  goToNextPhase,
  advancingRef,
  users
}: WaitingForPlayersProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrErr, setQrErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionLink) {
        setQrDataUrl(null);
        return;
      }
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(sessionLink, {
          width: 320,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch (e) {
        if (!cancelled) setQrErr('Falha ao gerar o QR Code.');
        console.error('QR error:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionLink]);

  const usersCount = users?.length ?? 0;
  const sortedUsers = useMemo(
    () => [...(users || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [users]
  );

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Sessão criada ✅</h2>
        <p className="text-sm text-neutral-300">Compartilhe o link ou escaneie o QR para entrar.</p>
      </div>

      {/* QR centralizado */}
      <div className="w-full flex flex-col items-center">
        <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-neutral-200 dark:ring-white/10">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              width={320}
              height={320}
              alt="QR Code do link da sessão"
              className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] object-contain"
            />
          ) : (
            <div className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          )}
        </div>

        <div className="mt-3">
          {qrErr ? (
            <p className="text-amber-400 text-sm">{qrErr}</p>
          ) : (
            qrDataUrl && (
              <a
                href={qrDataUrl}
                download="session-qr.png"
                className="text-sm rounded-lg border border-neutral-700/60 px-3 py-1.5 hover:bg-neutral-800 transition"
              >
                Baixar QR (PNG)
              </a>
            )
          )}
        </div>
      </div>

      <div className="mt-6 w-full max-w-xl mx-auto">
        <label className="sr-only" htmlFor="session-link">Link da sessão</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="session-link"
            readOnly
            value={sessionLink}
            className="flex-1 border border-neutral-700 bg-neutral-950 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={copyToClipboard}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-medium transition"
            aria-live="polite"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Botão iniciar centralizado */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={goToNextPhase}
          disabled={advancingRef.current}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-6 py-3 font-semibold transition"
        >
          {advancingRef.current && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8v4" fill="currentColor" />
            </svg>
          )}
          Iniciar Jogo
        </button>
      </div>

      {/* Jogadores: abaixo do botão */}
      <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Jogadores na sessão</h3>
          <span className="inline-flex items-center gap-2 text-xs font-medium rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <span className="block h-2 w-2 rounded-full bg-emerald-400" />
            {usersCount} participante{usersCount === 1 ? '' : 's'}
          </span>
        </div>

        {usersCount === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-center text-neutral-300">
            Nenhum jogador entrou ainda…
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sortedUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-lg bg-neutral-950 border border-neutral-800 px-4 py-3"
              >
                <div className="h-10 w-10 grid place-items-center rounded-full bg-slate-700 text-white ring-2 ring-white/10">
                  <span className="text-xs font-bold">{getInitials(u.name)}</span>
                </div>
                

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name || 'Jogador'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export default WaitingForPlayers;
