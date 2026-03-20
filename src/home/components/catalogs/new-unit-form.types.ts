import type { CreateUnitPayload } from "../../types/unit.types"

export interface NewUnitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export interface NewUnitStepProps {
  form: CreateUnitPayload
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void
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