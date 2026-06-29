export class AppError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }

  static badRequest(message: string) {
    return new AppError(400, message);
  }

  static notFound(message: string) {
    return new AppError(404, message);
  }

  static internal(message: string) {
    return new AppError(500, message);
  }
}
