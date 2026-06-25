export default function TrackingInfoCard() {
  return (
    <div className="
      absolute bottom-5 left-1/2 -translate-x-1/2
      bg-white shadow-xl rounded-2xl p-4
      w-[92%] sm:w-100
    ">
      <h3 className="font-bold text-lg">Ambulance on the way 🚑</h3>
      <p className="text-gray-500">Driver: Ravi Kumar</p>
      <p className="text-gray-500">ETA: 6 mins</p>
    </div>
  );
}
