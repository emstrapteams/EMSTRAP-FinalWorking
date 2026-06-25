import { Outlet } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";

export default function HospitalLayout() {
    return (
        <div className="bg-gray-50 dark:bg-[#0d1326] text-gray-900 dark:text-white min-h-screen font-sans selection:bg-red-600 selection:text-white transition-colors">
            <Navbar />
            
            <main className="transition-all duration-300 min-h-screen" style={{ paddingLeft: 'var(--sidebar-width)', paddingTop: '4rem' }}>
                <div className="p-6 md:p-8 min-h-[calc(100vh-4rem)] mx-auto w-full flex flex-col">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
