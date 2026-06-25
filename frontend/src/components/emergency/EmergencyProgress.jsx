export default function EmergencyProgress() {
  return (
    <div className="text-center mt-16">
      <div className="animate-pulse text-3xl">🚑</div>
      <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">
        Searching Nearby Ambulance...
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2">
        Hospitals & Police are being alerted
      </p>
    </div>
  );
}
