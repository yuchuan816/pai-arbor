export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success || json.data === undefined) {
    throw new Error(json.error ?? '请求失败');
  }
  return json.data;
}
