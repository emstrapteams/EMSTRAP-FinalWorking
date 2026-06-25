import LiveTrackingMap from "./LiveTrackingMap";

export default function MapSection() {
  return (
    <div className="w-full h-[65vh] sm:h-[70vh] lg:h-[75vh] rounded-2xl overflow-hidden shadow-xl">
      <LiveTrackingMap />
    </div>
  );
}
