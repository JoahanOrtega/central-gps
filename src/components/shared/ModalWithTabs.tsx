import { useState } from "react";
import { RotateCcw, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export interface ModalTab {
  // Identificador
  id: string;
  // Texto
  label: string;
  // Contenido
  content: React.ReactNode;
}

interface ModalWithTabsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Encabezado
  title: string;
  icon: LucideIcon;

  // Tabs
  tabs: ModalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;

  // Acciones del footer
  onSave: () => void;
  onReset: () => void;
  isLoading: boolean;
  saveLabel?: string;

  // Mensaje de error global
  error?: string;

  // Texto del ConfirmDialog que aparece al intentar cerrar con datos sin guardar.
  confirmCloseDescription?: string;
}

export const ModalWithTabs = ({
  open,
  onOpenChange,
  title,
  icon: Icon,
  tabs,
  activeTab,
  onTabChange,
  onSave,
  onReset,
  isLoading,
  saveLabel = "Guardar",
  error,
  confirmCloseDescription,
}: ModalWithTabsProps) => {
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  const activeIndex  = tabs.findIndex((t) => t.id === activeTab);
  const isFirstTab   = activeIndex === 0;
  const isLastTab    = activeIndex === tabs.length - 1;

  const goToPrev = () => {
    if (!isFirstTab) onTabChange(tabs[activeIndex - 1].id);
  };

  const goToNext = () => {
    if (!isLastTab) onTabChange(tabs[activeIndex + 1].id);
  };

  // Si hay texto de confirmación, pide confirmar antes de cerrar.
  const handleRequestClose = () => {
    if (confirmCloseDescription) {
      setIsCloseConfirmOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmClose = () => {
    setIsCloseConfirmOpen(false);
    onOpenChange(false);
  };

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="h-[92dvh] max-h-[92dvh] w-[96vw] max-w-[1280px] overflow-hidden rounded-2xl p-0"
        >
          <div className="flex h-full min-h-0 flex-col">

            {/* Header */}
            <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-slate-700 md:text-2xl">
                    <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    {title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Formulario con múltiples secciones para {title.toLowerCase()}.
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-auto">
                  <button
                    type="button"
                    onClick={onReset}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    title="Restablecer formulario"
                    aria-label="Restablecer formulario"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestClose}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    title="Cerrar"
                    aria-label="Cerrar modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </DialogHeader>

            {/* Barra de tabs */}
            <div className="shrink-0 border-b border-slate-200 px-4 pt-4 md:px-6">
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`rounded-t-lg px-4 py-3 text-sm font-medium ${
                      activeTab === tab.id
                        ? "border border-b-white border-slate-200 bg-white text-slate-700"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* tab activo */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
              {activeContent}
              {error && (
                <p className="mt-6 text-sm text-rose-500">{error}</p>
              )}
            </div>

            {/* Footer con navegación */}
            <div className="shrink-0 border-t border-slate-200 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                {/* Navegación entre tabs */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={isFirstTab}
                    onClick={goToPrev}
                    className="text-slate-400 disabled:opacity-50"
                  >
                    &lt; Anterior
                  </button>
                  <button
                    type="button"
                    disabled={isLastTab}
                    onClick={goToNext}
                    className="text-slate-600 disabled:opacity-40"
                  >
                    Siguiente &gt;
                  </button>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleRequestClose}
                    className="rounded border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={isLoading}
                    className="rounded bg-cyan-500 px-5 py-2 font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {isLoading ? "Guardando..." : saveLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm al cerrar con cambios */}
      {confirmCloseDescription && (
        <ConfirmDialog
          open={isCloseConfirmOpen}
          onOpenChange={setIsCloseConfirmOpen}
          title="Cerrar formulario"
          description={confirmCloseDescription}
          confirmText="CERRAR FORMULARIO"
          confirmButtonClassName="bg-amber-400 text-white hover:bg-amber-500"
          onConfirm={handleConfirmClose}
        />
      )}
    </>
  );
};