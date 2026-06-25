import { createContext, useContext, useState } from "react";

const EmergencyContext = createContext();

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error("useEmergency must be used inside EmergencyProvider");
  }
  return context;
};

export function EmergencyProvider({ children }) {
  const [location, setLocationState] = useState(() => {
    const saved = sessionStorage.getItem("emergency_location");
    try {
      return saved && saved !== "undefined" ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [photo, setPhotoState] = useState(() => {
    return sessionStorage.getItem("emergency_photo") || null;
  });

  const setLocation = (newLoc) => {
    if (newLoc && newLoc !== undefined) {
      sessionStorage.setItem("emergency_location", JSON.stringify(newLoc));
    } else {
      sessionStorage.removeItem("emergency_location");
    }
    setLocationState(newLoc);
  };

  const setPhoto = (newPhoto) => {
    if (newPhoto) {
      sessionStorage.setItem("emergency_photo", newPhoto);
    } else {
      sessionStorage.removeItem("emergency_photo");
    }
    setPhotoState(newPhoto);
  };

  return (
    <EmergencyContext.Provider value={{
      location,
      setLocation,
      photo,
      setPhoto
    }}>
      {children}
    </EmergencyContext.Provider>
  );
}
