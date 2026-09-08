import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";

interface GenerateRouteModalProps {
    open: boolean;
    onClose: () => void;
    onGenerate: (options: {
        useStops: boolean;
        useEngineOff: boolean;
    }) => void;
}

export const GenerateRouteModal = ({
    open,
    onClose,
    onGenerate,
}: GenerateRouteModalProps) => {

    const [useStops, setUseStops] = useState(true);
    const [useEngineOff, setUseEngineOff] = useState(false);

    return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Generar ruta</DialogTitle>

                <DialogDescription>
                    Seleccione los eventos del recorrido que desea usar
                    para crear una nueva ruta.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={useStops}
                        onChange={(e) => setUseStops(e.target.checked)}
                    />
                    Usar eventos de parada
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={useEngineOff}
                        onChange={(e) => setUseEngineOff(e.target.checked)}
                    />
                    Usar apagados de motor
                </label>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    onClick={onClose}
                    className="rounded border px-4 py-2"
                >
                    Cancelar
                </button>

                <button
                    onClick={() => {
                        onGenerate({
                            useStops,
                            useEngineOff,
                        });

                        onClose();
                    }}
                    className="rounded bg-cyan-600 px-4 py-2 text-white"
                >
                    Generar Ruta
                </button>
            </div>
        </DialogContent>
    </Dialog>
);
};