// LYD-96: origen del lead (fuente + campana/anuncio) -- helpers puros para la
// ficha y los filtros del inbox. Sin imports con alias "@/" para que
// tests/*.test.mjs lo pueda importar.

export interface LeadAttribution {
  source: "Meta" | "TikTok";
  platform: string;
  campaign: string;
  adId?: string;
  headline?: string;
  ctwaClid?: string;
  sourceUrl?: string;
  ref?: string;
  capturedAt: string;
}

interface WithOrigin {
  agentTags?: Record<string, string> | null;
  attribution?: LeadAttribution | null;
}

export interface CampaignOption {
  campaign: string;
  label: string;
  total: number;
}

// Lo que ve la asesora: el titular del anuncio si Meta lo mando, si no el
// codigo (TT-ING01) o el id del anuncio.
export function campaignLabel(attribution: LeadAttribution): string {
  return attribution.headline?.trim() || attribution.campaign;
}

export function sourceOf(conversation: WithOrigin): string | undefined {
  return conversation.agentTags?.fuente || conversation.attribution?.source;
}

export function matchesOrigin(conversation: WithOrigin, source: string, campaign: string): boolean {
  if (source !== "todas" && sourceOf(conversation) !== source) return false;
  if (campaign !== "todas" && conversation.attribution?.campaign !== campaign) return false;
  return true;
}

// Campanas presentes en las conversaciones cargadas, mas usadas primero.
export function campaignOptions(conversations: WithOrigin[], source: string = "todas"): CampaignOption[] {
  const byCampaign = new Map<string, CampaignOption>();
  for (const conversation of conversations) {
    const attribution = conversation.attribution;
    if (!attribution?.campaign) continue;
    if (source !== "todas" && sourceOf(conversation) !== source) continue;
    const current = byCampaign.get(attribution.campaign);
    if (current) {
      current.total += 1;
    } else {
      const label = campaignLabel(attribution);
      byCampaign.set(attribution.campaign, {
        campaign: attribution.campaign,
        label: label === attribution.campaign ? label : `${label} (${attribution.campaign})`,
        total: 1,
      });
    }
  }
  return [...byCampaign.values()].sort((a, b) => b.total - a.total || a.campaign.localeCompare(b.campaign));
}
