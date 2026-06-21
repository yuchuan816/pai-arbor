'use client';

import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClassName =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      className="z-[60] flex items-center justify-center p-4"
      panelClassName="relative w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <h2 id="confirm-dialog-title" className="text-base font-semibold text-zinc-900">
        {title}
      </h2>
      <p id="confirm-dialog-description" className="mt-2 text-sm text-zinc-600">
        {description}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-md px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`min-h-10 rounded-md px-4 text-sm font-medium transition-colors ${confirmClassName}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
