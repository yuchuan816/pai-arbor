import { toast } from 'sonner';

export function formatClientError(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

export function showErrorToast(message: string, id?: string): void {
  toast.error(message, { id: id ?? message });
}
