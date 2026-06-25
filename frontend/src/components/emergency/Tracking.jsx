import Navbar from "../../components/layout/Navbar";
import Container from "../../components/layout/Container";
import MapSection from "../../components/map/MapSection";
import TrackingInfoCard from "../../components/map/TrackingInfoCard";

export default function Tracking() {
  return (
    <>
      <Navbar />
      <Container>
        <div className="relative mt-6">
          <MapSection />
          <TrackingInfoCard />
        </div>
      </Container>
    </>
  );
}
