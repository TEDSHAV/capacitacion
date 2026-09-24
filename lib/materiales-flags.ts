/**
 * Feature flag for Didactic Materials & PPT Presentation Optimizer.
 * In development (or when NEXT_PUBLIC_ENABLE_MATERIALES is set to 'true'),
 * the feature is fully active for testing.
 * In production, it is completely hidden and disabled so real users cannot see or access it.
 */
export function isMaterialesEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_MATERIALES === "true"
  );
}
