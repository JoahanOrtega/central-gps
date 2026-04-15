// Layout base del panel admin ERP.
// Sidebar izquierdo con navegación + área de contenido.
// Completamente separado del HomeLayout del sistema principal.

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

// Ítems del menú del panel ERP
const NAV_ITEMS = [
    { path: "/home/admin-erp/empresas", label: "Empresas", icon: "🏢" },
    { path: "/home/admin-erp/permisos", label: "Permisos", icon: "🔑" },
    { path: "/home/admin-erp/auditoria", label: "Auditoría", icon: "📋" },
];

export const ErpLayout = () => {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>

            {/* ── Sidebar ── */}
            <aside style={{
                width: 220, flexShrink: 0,
                background: "#0f172a", color: "#e2e8f0",
                display: "flex", flexDirection: "column",
                padding: "24px 0",
            }}>
                {/* Logo / título */}
                <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1e293b" }}>
                    <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>
                        Panel Admin
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
                        CentralGPS ERP
                    </p>
                </div>

                {/* Navegación */}
                <nav style={{ flex: 1, padding: "16px 12px" }}>
                    {NAV_ITEMS.map(({ path, label, icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            style={({ isActive }) => ({
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "9px 12px", borderRadius: 8, marginBottom: 4,
                                textDecoration: "none", fontSize: 13,
                                background: isActive ? "#1e40af" : "transparent",
                                color: isActive ? "#fff" : "#94a3b8",
                                fontWeight: isActive ? 500 : 400,
                                transition: "all .15s",
                            })}
                        >
                            <span style={{ fontSize: 16 }}>{icon}</span>
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Usuario + logout */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b" }}>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
                        {user?.nombre || user?.username}
                    </p>
                    <p style={{ fontSize: 11, color: "#475569", marginBottom: 12 }}>
                        Administrador ERP
                    </p>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: "100%", padding: "7px 12px", borderRadius: 6,
                            border: "1px solid #334155", background: "transparent",
                            color: "#94a3b8", fontSize: 12, cursor: "pointer",
                            transition: "all .15s",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#1e293b")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* ── Contenido principal ── */}
            <main style={{
                flex: 1, overflow: "auto",
                background: "#f8fafc", padding: "32px",
            }}>
                <Outlet />
            </main>
        </div>
    );
};