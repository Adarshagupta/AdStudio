import { prisma } from "@/lib/db";

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  category: string;
  isPremium: boolean;
  usesIncludedQuota: boolean;
  cost: number;
  isActive: boolean;
  isSystem: boolean;
}

export async function getModelConfig(provider: string): Promise<ModelConfig | null> {
  const model = await prisma.model.findUnique({
    where: { provider },
  });

  if (!model) return null;

  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    category: model.category,
    isPremium: model.isPremium,
    usesIncludedQuota: model.usesIncludedQuota,
    cost: model.cost,
    isActive: model.isActive,
    isSystem: model.isSystem,
  };
}

export async function getActiveModels(category?: string): Promise<ModelConfig[]> {
  const models = await prisma.model.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return models.map((model) => ({
    id: model.id,
    name: model.name,
    provider: model.provider,
    category: model.category,
    isPremium: model.isPremium,
    usesIncludedQuota: model.usesIncludedQuota,
    cost: model.cost,
    isActive: model.isActive,
    isSystem: model.isSystem,
  }));
}

/**
 * Determine if a model should consume included quota or premium credits.
 * Returns: { type: "quota", quotaType: "image" | "video" | "audio" } | { type: "premium", cost: number }
 */
export async function resolveModelBilling(
  provider: string,
  category: "image" | "video" | "audio",
): Promise<
  | { type: "quota"; quotaType: "image" | "video" | "audio"; cost: number }
  | { type: "premium"; cost: number }
  | { type: "unknown"; cost: number }
> {
  const config = await getModelConfig(provider);

  if (!config) {
    // Fallback: if provider starts with known prefixes, use included quota
    if (provider.startsWith("@cf/") || provider.startsWith("sylicaai/")) {
      return { type: "quota", quotaType: category, cost: 1 };
    }
    // OpenAI models default to premium
    if (provider.startsWith("openai/")) {
      return { type: "premium", cost: 1 };
    }
    return { type: "unknown", cost: 1 };
  }

  if (!config.isActive) {
    return { type: "unknown", cost: 1 };
  }

  if (config.usesIncludedQuota) {
    return { type: "quota", quotaType: category, cost: config.cost };
  }

  return { type: "premium", cost: config.cost };
}
