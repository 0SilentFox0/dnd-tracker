export const onboardingKeys = {
  flags: () => ["onboarding-flags"] as const,
  campaigns: () => ["campaign-onboarding"] as const,
  campaign: (campaignId: string) => [...onboardingKeys.campaigns(), campaignId] as const,
};
