export const startEmergency = async () => {
  // later → API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: "Emergency request sent to nearby ambulances 🚑"
      });
    }, 1000);
  });
};
