/** Thrown when content holds something other than plain data (a class instance, a function…). */
export class ContentValueError extends Error {
  constructor(readonly path: string) {
    super(`content value at "${path}" is not plain data (expected JSON-like values only)`);
    this.name = 'ContentValueError';
  }
}

function isPlainObject(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function copyAt<T>(value: T, path: string): T {
  if (typeof value === 'function' || typeof value === 'symbol') {
    throw new ContentValueError(path);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((item: unknown, index) => copyAt(item, `${path}[${index}]`)),
    ) as T;
  }
  if (!isPlainObject(value)) {
    throw new ContentValueError(path);
  }
  // fromEntries defines own properties, so a "__proto__" key from parsed JSON stays plain data
  // instead of replacing the copy's prototype.
  const copy = Object.fromEntries(
    Object.entries(value).map(([key, item]: [string, unknown]) => [
      key,
      copyAt(item, `${path}.${key}`),
    ]),
  );
  return Object.freeze(copy) as T;
}

/**
 * Returns a deeply frozen copy of JSON-like content. The caller's value is left untouched, so
 * later edits to it can never reach the copy, and nobody can edit the copy either.
 *
 * @param label names the value in error messages
 */
export function frozenCopy<T>(value: T, label: string): T {
  return copyAt(value, label);
}
