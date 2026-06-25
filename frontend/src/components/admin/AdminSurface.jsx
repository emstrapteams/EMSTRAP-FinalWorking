export default function AdminSurface({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
