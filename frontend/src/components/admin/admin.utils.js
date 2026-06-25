export const roleOptions = [
  { value: "user", label: "User" },
  { value: "ambulance", label: "Ambulance" },
  { value: "ambulance_driver", label: "Ambulance Driver" },
  { value: "private_driver", label: "Private Driver" },
  { value: "admin", label: "Admin" },
  { value: "police", label: "Police" },
  { value: "police_hq", label: "Police HQ" },
  { value: "hospital", label: "Hospital" },
  { value: "hospital_admin", label: "Hospital Admin" }
];

export const bookingStatusOptions = ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
export const emergencyStatusOptions = [
  "PENDING",
  "AMBULANCE_ACCEPTED",
  "ARRIVED_AT_LOCATION",
  "EN_ROUTE_TO_HOSPITAL",
  "COMPLETED",
  "CANCELLED"
];

export function formatDate(date) {
  if (!date) return "N/A";

  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function getStatusBadgeClasses(status) {
  switch (status) {
    case "AVAILABLE":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "BUSY":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "OFFLINE":
    case "MAINTENANCE":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "CANCELLED":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "ACCEPTED":
    case "AMBULANCE_ACCEPTED":
    case "ARRIVED":
    case "ARRIVED_AT_LOCATION":
    case "EN_ROUTE_TO_HOSPITAL":
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  }
}
