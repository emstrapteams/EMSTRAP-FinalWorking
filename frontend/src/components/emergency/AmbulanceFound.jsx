import { useEmergency } from "../../context/EmergencyContext";
import LiveTrackingMap from "../map/LiveTrackingMap";

export default function AmbulanceFound({ driverInfo, onCancel }) {
  const { location: userLocation } = useEmergency();

  return (
    <div className="flex flex-col gap-6 mt-6">
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
          Ambulance Found!
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Hang tight, help is on the way.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Map Area */}
        <div className="w-full lg:flex-1 bg-gray-100 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-inner h-[350px] sm:h-[450px] lg:h-[650px] relative z-10">
          <LiveTrackingMap
            userLocation={userLocation}
            driverLocation={driverInfo?.location}
            height="100%"
          />
        </div>

        {/* Info Panel */}
        <div className="w-full lg:w-96 space-y-4 relative z-20">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-xl border dark:border-gray-800">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <span className="text-green-500">🚑</span> Driver Details
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">🆔</div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Vehicle Number</p>
                  <p className="font-bold text-lg truncate">{driverInfo?.vehicleNumber || "Assigned"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">👤</div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Driver Name</p>
                  <p className="font-bold text-lg truncate">{driverInfo?.driverName || "On the way"}</p>
                </div>
              </div>

              {driverInfo?.driverMobile && (
                <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">📱</div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mobile Number</p>
                      <p className="font-bold text-lg truncate">{driverInfo.driverMobile}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${driverInfo.driverMobile}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center">
            <div>
              <p className="text-[10px] opacity-80 uppercase font-bold tracking-wider">Estimated Arrival</p>
              <p className="text-3xl font-black">{driverInfo?.eta || "5-8 mins"}</p>
            </div>
            <div className="text-4xl">🏁</div>
          </div>

          <button
            onClick={onCancel}
            className="w-full bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold py-4 rounded-3xl border border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all text-sm"
          >
            Cancel Emergency Request
          </button>
        </div>
      </div>
    </div>
  );
}
