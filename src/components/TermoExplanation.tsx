import React from 'react';

const TermoExplanation: React.FC = () => {
    return (
      <div className="w-full max-w-2xl p-4 border rounded-2xl bg-neutral-900/60">
          <p className="mb-2 font-semibold">Como funciona</p>
          <ul className="list-disc pl-6 space-y-1 text-white/80">
            <li>
              Você terá 60 segundos para adivinhar uma palavra de 5 letras.
            </li>
            <li>
              As cores indicam:
              <span className="text-green-500 font-semibold"> verde</span> (letra certa no lugar certo),
              <span className="text-yellow-500 font-semibold"> amarelo</span> (letra existe, lugar errado) e
              <span className="text-gray-400 font-semibold"> cinza</span> (letra não existe).
            </li>
            <li>Sua pontuação aumenta quanto mais rápido você acertar.</li>
          </ul>
          <p className="mt-3 text-sm text-white/60">Aguarde o host iniciar.</p>
        </div>
    );
};

export default TermoExplanation;