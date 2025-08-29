'use client';

import React from 'react';

const TermoExplanation: React.FC = () => {
  return (
    <section
      className="
        w-full max-w-2xl rounded-3xl border border-white/80 bg-white/80
        backdrop-blur-md shadow-xl p-6 md:p-8 text-slate-800
      "
      aria-labelledby="termo-title"
    >
      <header className="mb-3">
        <h2 id="termo-title" className="text-xl md:text-2xl font-extrabold tracking-tight">
          TERMO — Palavras-chave do Caso
        </h2>
        <p className="text-slate-600 text-sm mt-1">
          A missão: decifrar a pista secreta do bebê. Cada detetive recebe uma palavra diferente!
        </p>
      </header>

      {/* Regras resumidas */}
      <ul className="space-y-3">
        <li className="flex gap-3">
          <span className="shrink-0 mt-1 h-2.5 w-2.5 rounded-full bg-sky-300" />
          <p className="leading-relaxed">
            Você tem <strong>2 minutos</strong> para adivinhar uma palavra de <strong>5 letras</strong>.
            As palavras giram em torno de <strong>bebê, maternidade e paternidade</strong>.
          </p>
        </li>

        <li className="flex gap-3">
          <span className="shrink-0 mt-1 h-2.5 w-2.5 rounded-full bg-amber-300" />
          <div className="flex-1">
            <p className="leading-relaxed mb-2">
              As cores revelam o quão perto você está da pista correta:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="list" aria-label="Legenda de cores">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="inline-block h-4 w-4 rounded bg-emerald-300 ring-2 ring-emerald-200" aria-hidden />
                <span className="text-sm">
                  <strong>Verde</strong> — letra certa no lugar certo
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="inline-block h-4 w-4 rounded bg-amber-300 ring-2 ring-amber-200" aria-hidden />
                <span className="text-sm">
                  <strong>Amarelo</strong> — letra existe, lugar errado
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="inline-block h-4 w-4 rounded bg-slate-300 ring-2 ring-slate-200" aria-hidden />
                <span className="text-sm">
                  <strong>Cinza</strong> — a letra não aparece na palavra
                </span>
              </div>
            </div>
          </div>
        </li>

        <li className="flex gap-3">
          <span className="shrink-0 mt-1 h-2.5 w-2.5 rounded-full bg-rose-300" />
          <p className="leading-relaxed">
            <strong>Pontuação</strong>: quanto mais rápido você acerta, mais pontos ganha. Falhou?
            Tudo bem — o caso continua e o placar atualiza a cada rodada!
          </p>
        </li>

        <li className="flex gap-3">
          <span className="shrink-0 mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <p className="leading-relaxed">
            <strong>Etiqueta de detetive</strong>: não revele sua palavra em voz alta — cada agente tem uma pista
            diferente. Compare resultados só no fim!
          </p>
        </li>
      </ul>

      {/* Box da lore/ambiente */}
      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
        <p className="text-slate-700">
          Depois do quiz, o time entrou na sala de evidências.
          Aqui, cada tentativa ilumina uma peça do mistério. Quando todas as pistas
          se encaixarem, o quadro se completa — e nos aproximamos do grande momento:
          a <em>revelação</em>!
        </p>
      </div>

      {/* Observação final */}
      <p className="mt-4 text-sm text-slate-600">
        Aguarde o host iniciar a rodada do TERMO. Boa sorte, detetive! 🕵️‍♀️🍼
      </p>
    </section>
  );
};

export default TermoExplanation;
