export const DEFAULT_RELEASE_LABEL_NAME = "Parallax Music"

export function hasLabelSubscription(subscriptionName?: string | null): boolean {
  return subscriptionName === "Label"
}

export function getEffectiveReleaseLabelName(
  requestedLabelName: unknown,
  subscriptionName?: string | null
): string {
  if (!hasLabelSubscription(subscriptionName)) {
    return DEFAULT_RELEASE_LABEL_NAME
  }
  const trimmed = typeof requestedLabelName === "string" ? requestedLabelName.trim() : ""
  return trimmed || DEFAULT_RELEASE_LABEL_NAME
}
