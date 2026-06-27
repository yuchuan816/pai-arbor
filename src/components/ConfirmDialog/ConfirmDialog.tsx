'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/client/cn';

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
  return (
    <Modal
      open={open}
      onClose={onCancel}
      panelClassName={cn(
        'fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
        'rounded-lg bg-white p-5 shadow-xl focus:outline-none',
      )}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <Dialog.Title
        id="confirm-dialog-title"
        className={cn('text-base font-semibold text-zinc-900')}
      >
        {title}
      </Dialog.Title>
      <Dialog.Description
        id="confirm-dialog-description"
        className={cn('mt-2 text-sm text-zinc-600')}
      >
        {description}
      </Dialog.Description>
      <div className={cn('mt-5 flex justify-end gap-2')}>
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'min-h-10 rounded-md px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors',
          )}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            'min-h-10 rounded-md px-4 text-sm font-medium transition-colors',
            variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white',
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
