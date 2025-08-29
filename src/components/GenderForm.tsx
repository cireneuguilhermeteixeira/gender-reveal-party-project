'use client';

import { useState } from 'react';
import SparkleButton from '@/components/SparkleButton'; // opcional; troque por <button> se não quiser usar
import { http } from '@/lib/server/httpClient';

type GenderValue = 'boy' | 'girl';

export default function GenderForm() {
  const [value, setValue] = useState<GenderValue | ''>('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);



  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (value !== 'boy' && value !== 'girl') {
      setErr('Selecione uma opção antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const res = await http.post('/gender', { value });
      console.log('Saved', res);
      setMsg('Salvo com sucesso! 🎉');
    } catch {
      setErr('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md mx-auto rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md p-6 shadow-xl"
    >
      <h2 className="text-xl font-extrabold text-slate-800 mb-4">Revelação (Admin)</h2>

      <fieldset className="space-y-3" disabled={saving}>
        <legend className="text-sm text-slate-600 mb-1">Selecione o sexo do bebê</legend>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <input
            type="radio"
            name="gender"
            value="boy"
            checked={value === 'boy'}
            onChange={() => setValue('boy')}
            className="h-4 w-4 accent-sky-400"
          />
          <span className="text-slate-800 font-medium">Menino</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">boy</span>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <input
            type="radio"
            name="gender"
            value="girl"
            checked={value === 'girl'}
            onChange={() => setValue('girl')}
            className="h-4 w-4 accent-rose-400"
          />
          <span className="text-slate-800 font-medium">Menina</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">girl</span>
        </label>
      </fieldset>

      <div className="mt-5 flex items-center justify-between">
        <SparkleButton type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </SparkleButton>
      </div>

      {msg && <p className="mt-3 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{msg}</p>}
      {err && <p className="mt-3 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</p>}
    </form>
  );
}
