import { Outlet } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";

export default function PoliceLayout() {
    return (
        <div className="bg-gray-50 dark:bg-[#0d1326] text-gray-900 dark:text-white min-h-screen font-sans selection:bg-[#3390ff] selection:text-white">
            <Navbar />
            
            {/* 
               The Navbar component internally renders a Fixed Header and Fixed Left Sidebar for Police mode.
               We use CSS variables passed from Navbar into the DOM to dynamically pad this wrapper. 
            */}
            <main className="transition-all duration-300 min-h-screen" style={{ paddingLeft: 'var(--sidebar-width)', paddingTop: '4rem' }}>
                <div className="p-6 md:p-8 h-[calc(100vh-4rem)] mx-auto overflow-y-auto w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
