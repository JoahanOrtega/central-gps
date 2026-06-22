import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Satellite } from "lucide-react";
import { UnitTokenTab } from "./UnitTokenTab";

interface UnitTokenModalProps {
    // Datos mínimos de la unidad. Quien abre el modal (card del catálogo o
    // marcador del mapa) ya los tiene, así evitamos un fetch extra solo para
    // el header. Cuando idUnidad es null el modal está cerrado.
    idUnidad: number | null;
    numero?: string;
    marca?: string;
    modelo?: string | null;
    idEmpresa: number | null;
    canEdit?: boolean;
    onClose: () => void;
}

// Modal independiente del token de rastreo. Envuelve a UnitTokenTab (el cuerpo
// reutilizable) en su propio diálogo, para abrirlo desde donde sea sin depender
// del modal de editar unidad. Mismo patrón visual que EditUnitModal.
export const UnitTokenModal = ({
    idUnidad,
    numero,
    marca,
    modelo,
    idEmpresa,
    canEdit = false,
    onClose,
}: UnitTokenModalProps) => {
    const isOpen = idUnidad !== null;

    // Subtítulo con la identidad de la unidad, igual que el modal de editar.
    const subtitulo =
        numero || marca
            ? `${numero ?? ""}${marca ? ` · ${marca}` : ""}${modelo ? ` ${modelo}` : ""}`.trim()
            : "Rastreo público";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl gap-0 p-0">
                <DialogHeader className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                            <Satellite className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-slate-800">
                                Token de Rastreo
                            </DialogTitle>
                            <DialogDescription className="text-sm text-slate-500">
                                {subtitulo}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                    {idUnidad !== null && (
                        <UnitTokenTab
                            idUnidad={idUnidad}
                            idEmpresa={idEmpresa}
                            canEdit={canEdit}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};