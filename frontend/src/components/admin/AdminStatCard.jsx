export default function AdminStatCard({ title, value, accent, helper }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
      <div className={`w-12 h-2 rounded-full ${accent}`} />
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-4">{title}</p>
      <p className="text-5xl font-black text-gray-900 dark:text-white mt-3 tracking-tighter">{value}</p>
      {helper ? <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{helper}</p> : null}
    </div>
  );
}
