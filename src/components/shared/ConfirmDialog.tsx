import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  confirmButtonClassName?: string;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText = "CANCELAR",
  confirmButtonClassName = "",
  onConfirm,
}: ConfirmDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md overflow-hidden rounded-2xl p-0">
        <div className="border-t-4 border-amber-400" />

        <DialogHeader className="px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-2xl font-semibold text-slate-800">
            {title}
          </DialogTitle>

          <DialogDescription className="pt-4 text-base leading-relaxed text-slate-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={handleConfirm}
            className={`w-full rounded-md px-4 py-3 font-medium ${confirmButtonClassName}`}
          >
            {confirmText}
          </button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-3 w-full rounded-md bg-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-300"
          >
            {cancelText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};