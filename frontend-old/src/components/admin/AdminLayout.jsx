import AdminSidebar from "../layout/AdminSidebar";

export default function AdminLayout({ title, description, actions, children }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden md:block shadow-2xl z-10">
        <AdminSidebar />
      </div>

      <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h1>
            {description ? <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">{description}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>

        {children}
      </div>
    </div>
  );
}
