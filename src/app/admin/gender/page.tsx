import GenderForm from '@/components/GenderForm';

export default function GenderAdminPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-rose-50 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-6">Definir Revelação</h1>
        <GenderForm />
      </div>
    </main>
  );
}
