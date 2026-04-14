import type { CreateUnitPayload } from "../types/unit.types"

export interface NewUnitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export type FieldError = string | undefined;

export interface NewUnitStepProps {
  form: CreateUnitPayload;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onImageChange?: (imageBase64: string) => void;
  onGroupSelectionChange?: (newSelection: number[]) => void;
  errors?: Record<string, FieldError>;
  touched?: Record<string, boolean>;
}

export interface FieldProps {
  label: string
  children: React.ReactNode
}

export interface SelectFieldProps {
  label: string
  name: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
}