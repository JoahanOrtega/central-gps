import { useState } from "react";
import { CalendarClock, CalendarRange, FolderOpen } from "lucide-react";
import { ItinerariesCatalogView } from "./ItinerariesCatalogView";
import { ItineraryGroupsView } from "./groups/ItineraryGroupsView";
import { ItineraryRolesView } from "./groups/ItineraryRolesView";


type Tab = "itineraries" | "groups" | "roles";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "itineraries", label: "Itinerarios", icon: <CalendarClock className="h-4 w-4" /> },
    { id: "groups", label: "Grupos", icon: <FolderOpen className="h-4 w-4" /> },
    { id: "roles", label: "Roles", icon: <CalendarRange className="h-4 w-4" /> },
];

export const ItineraryOperationPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>("itineraries");

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#f5f6f8]">
            {/* Barra de tabs */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-3 md:px-6">
                <nav className="flex gap-1" aria-label="Secciones de itinerarios">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={[
                                "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                                activeTab === tab.id
                                    ? "border border-b-white border-slate-200 bg-white text-slate-800 -mb-px"
                                    : "text-slate-500 hover:text-slate-700",
                            ].join(" ")}
                            aria-selected={activeTab === tab.id}
                        >
                            <span className={activeTab === tab.id ? "text-sky-600" : "text-slate-400"}>
                                {tab.icon}
                            </span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenido del tab activo */}
            <div className="min-h-0 flex-1 overflow-hidden">
                {activeTab === "itineraries" && <ItinerariesCatalogView />}
                {activeTab === "groups" && <ItineraryGroupsView />}
                {activeTab === "roles" && <ItineraryRolesView />}
            </div>
        </div>
    );
};