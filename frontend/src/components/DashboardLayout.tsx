import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-950 p-8">
                {children}
            </main>
        </div>
    );
}
