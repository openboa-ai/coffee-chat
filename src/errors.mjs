export class CoffeeChatError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CoffeeChatError";
    this.code = code;
    this.details = details;
  }
}

/** @returns {never} */
export function fail(code, message, details = {}) {
  throw new CoffeeChatError(code, message, details);
}
