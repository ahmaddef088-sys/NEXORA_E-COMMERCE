/**
 * Application base error class.
 * All custom errors extend this for instanceof checks.
 */
export class AppError extends Error {
  public readonly name: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain (needed for instanceof checks in transpiled code)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
