'use client';

import { User } from '@prisma/client';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import SparkleButton from '@/components/SparkleButton';

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

function pickAvatarTheme(seed?: string | null) {
  const themes = [
    { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200' },
    { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
    { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200' },
  ] as const;
  let h = 0;
  const s = seed || 'seed';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return themes[h % themes.length];
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
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' }, // QR escuro sobre card branco
        });
        if (!cancelled) setQrDataUrl(url);
      } catch (e) {
        if (!cancelled) setQrErr('Falha ao gerar o QR Code.');
        console.error('QR error:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionLink]);

  const usersCount = users?.length ?? 0;
  const sortedUsers = useMemo(
    () => [...(users || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [users]
  );

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Sala aberta ✅</h2>
        <p className="text-sm text-slate-600">Compartilhe o link ou escaneie o QR para entrar.</p>
      </div>

      {/* QR centralizado */}
      <div className="w-full flex flex-col items-center">
        <div className="rounded-3xl bg-white/90 backdrop-blur-md p-4 shadow-xl ring-1 ring-slate-200">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              width={320}
              height={320}
              alt="QR Code do link da sessão"
              className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] object-contain rounded-xl"
            />
          ) : (
            <div className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-xl bg-slate-200 animate-pulse" />
          )}
        </div>

        <div className="mt-3">
          {qrErr ? (
            <p className="text-amber-600 text-sm">{qrErr}</p>
          ) : (
            qrDataUrl && (
              <a
                href={qrDataUrl}
                download="session-qr.png"
                className="text-sm rounded-lg border border-slate-200 bg-white/80 backdrop-blur px-3 py-1.5 hover:bg-white transition shadow-sm"
              >
                Baixar QR (PNG)
              </a>
            )
          )}
        </div>
      </div>

      {/* Link da sessão + copiar */}
      <div className="mt-6 w-full max-w-xl mx-auto">
        <label className="sr-only" htmlFor="session-link">
          Link da sessão
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="session-link"
            readOnly
            value={sessionLink}
            className="flex-1 rounded-xl border border-white/80 bg-white/80 backdrop-blur-md px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 shadow"
          />
          <button
            onClick={copyToClipboard}
            className="rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-800 px-3 py-2 text-sm font-semibold transition shadow"
            aria-live="polite"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Botão iniciar centralizado */}
      <div className="mt-8 flex justify-center">
        <SparkleButton onClick={goToNextPhase} disabled={advancingRef.current}>
          {advancingRef.current ? 'Iniciando…' : 'Iniciar Jogo'}
        </SparkleButton>
      </div>

      {/* Jogadores abaixo do botão */}
      <section className="mt-8 rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-800">Jogadores na sessão</h3>
          <span className="inline-flex items-center gap-2 text-xs font-medium rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
            <span className="block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {usersCount} participante{usersCount === 1 ? '' : 's'}
          </span>
        </div>

        {usersCount === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-600">
            Nenhum jogador entrou ainda…
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sortedUsers.map((u) => {
              const theme = pickAvatarTheme(u.name);
              return (
                <li
                  key={u.id}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow transition"
                >
                  <div
                    className={`h-11 w-11 grid place-items-center rounded-full ${theme.bg} ${theme.text} ring-2 ${theme.ring} font-bold`}
                  >
                    <span className="text-xs">{getInitials(u.name)}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{u.name || 'Jogador'}</p>
                    <p className="text-xs text-slate-500 group-hover:text-slate-600">Conectado</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
};

export default WaitingForPlayers;
