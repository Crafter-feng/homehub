/**
 * Pick only the fields from a DTO that are explicitly defined (not undefined).
 * Used for partial-update operations where only provided fields should be updated.
 *
 * @param dto - The partial DTO containing potential updates
 * @param allowedFields - Whitelist of field names that are allowed to be picked
 * @returns A Partial<T> containing only the defined & allowed fields
 */
export function pickDefined<T extends Record<string, unknown>>(
  dto: Partial<T>,
  allowedFields: (keyof T)[],
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of allowedFields) {
    if (dto[key] !== undefined) {
      result[key] = dto[key];
    }
  }
  return result;
}
