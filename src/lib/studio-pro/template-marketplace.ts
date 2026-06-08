import "server-only";

import type { Prisma, StudioTemplateListingStatus } from "@prisma/client";
import type Stripe from "stripe";

import { getStripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";
import {
  getStudioFlowForUser,
  normalizeFlowNodes,
  parseFlowSnapshot,
  type StudioViewport,
} from "@/lib/studio-pro/flows";
import {
  parseSampleOutputs,
  templateSampleCoverUrl,
  type TemplateSampleOutput,
} from "@/lib/studio-pro/template-sample-types";
import type { StudioEdge, StudioNode, StudioNodeData } from "@/lib/studio-pro/types";

export type { TemplateSampleOutput };

const RUNTIME_FIELDS: (keyof StudioNodeData)[] = [
  "output",
  "scriptText",
  "imageUrl",
  "videoUrl",
  "audioUrl",
  "jobId",
  "error",
];

export type TemplateListingSnapshot = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: StudioViewport;
};

export function extractFlowSampleOutputs(nodes: StudioNode[]): TemplateSampleOutput[] {
  const samples: TemplateSampleOutput[] = [];

  for (const node of nodes) {
    if (node.type === "image") {
      const url = node.data.imageUrl?.trim();
      if (url) {
        samples.push({
          id: `${node.id}:image`,
          nodeId: node.id,
          nodeTitle: node.title,
          type: "image",
          url,
        });
      }
    }

    if (node.type === "video") {
      const url = node.data.videoUrl?.trim();
      if (url) {
        samples.push({
          id: `${node.id}:video`,
          nodeId: node.id,
          nodeTitle: node.title,
          type: "video",
          url,
        });
      }
    }
  }

  return samples;
}

export async function getFlowTemplateSamples(flowId: string, workspaceId: string) {
  const flow = await getStudioFlowForUser(flowId, workspaceId);
  if (!flow) {
    throw new Error("Source flow not found.");
  }

  const snapshot = parseFlowSnapshot(flow.nodes, flow.edges, flow.viewport);
  return extractFlowSampleOutputs(snapshot.nodes);
}

function resolveSelectedSampleOutputs(
  available: TemplateSampleOutput[],
  selectedIds: string[],
): TemplateSampleOutput[] {
  const allowed = new Map(available.map((sample) => [sample.id, sample]));
  const selected = selectedIds
    .map((id) => allowed.get(id))
    .filter((sample): sample is TemplateSampleOutput => Boolean(sample));

  const seen = new Set<string>();
  return selected.filter((sample) => {
    if (seen.has(sample.id)) {
      return false;
    }
    seen.add(sample.id);
    return true;
  });
}

export type PublicTemplateListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  previewImageUrl: string | null;
  sampleOutputs: TemplateSampleOutput[];
  priceCents: number;
  currency: string;
  status: StudioTemplateListingStatus;
  category: string | null;
  tags: string[];
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
  publisher: {
    name: string | null;
    workspaceName: string;
  };
};

function slugifyTitle(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "template";
}

function parseTags(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}

function sanitizeNodeData(data: StudioNodeData): StudioNodeData {
  const next: StudioNodeData = { ...data };

  for (const field of RUNTIME_FIELDS) {
    delete next[field];
  }

  if (next.status === "running") {
    next.status = "idle";
  }

  return next;
}

export function sanitizeTemplateSnapshot(snapshot: TemplateListingSnapshot): TemplateListingSnapshot {
  const nodes = normalizeFlowNodes(snapshot.nodes).map((node) => ({
    ...node,
    data: sanitizeNodeData(node.data),
  }));

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = snapshot.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  );

  return {
    nodes,
    edges,
    viewport: snapshot.viewport,
  };
}

export function validateTemplateSnapshot(snapshot: TemplateListingSnapshot) {
  if (snapshot.nodes.length < 1) {
    throw new Error("Template must include at least one node.");
  }

  const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
  const orphanEdge = snapshot.edges.find(
    (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target),
  );

  if (orphanEdge) {
    throw new Error("Template contains connections to missing nodes.");
  }
}

async function uniqueSlugForTitle(title: string) {
  const base = slugifyTitle(title);
  let slug = base;
  let attempt = 0;

  while (attempt < 20) {
    const existing = await prisma.studioTemplateListing.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
}

function toPublicListing(
  listing: {
    id: string;
    slug: string;
    title: string;
    description: string;
    previewImageUrl: string | null;
    sampleOutputs?: Prisma.JsonValue;
    priceCents: number;
    currency: string;
    status: StudioTemplateListingStatus;
    category: string | null;
    tags: Prisma.JsonValue;
    useCount: number;
    createdAt: Date;
    updatedAt: Date;
    publisherUser: { name: string | null };
    publisherWorkspace: { name: string };
  },
): PublicTemplateListing {
  const sampleOutputs = parseSampleOutputs(listing.sampleOutputs);
  const previewImageUrl = listing.previewImageUrl ?? templateSampleCoverUrl(sampleOutputs);

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    previewImageUrl,
    sampleOutputs,
    priceCents: listing.priceCents,
    currency: listing.currency,
    status: listing.status,
    category: listing.category,
    tags: parseTags(listing.tags),
    useCount: listing.useCount,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    publisher: {
      name: listing.publisherUser.name,
      workspaceName: listing.publisherWorkspace.name,
    },
  };
}

const listingSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  previewImageUrl: true,
  sampleOutputs: true,
  priceCents: true,
  currency: true,
  status: true,
  category: true,
  tags: true,
  useCount: true,
  createdAt: true,
  updatedAt: true,
  publisherUser: { select: { name: true } },
  publisherWorkspace: { select: { name: true } },
} as const;

export async function workspaceOwnsListing(workspaceId: string, listingId: string) {
  const listing = await prisma.studioTemplateListing.findFirst({
    where: { id: listingId, publisherWorkspaceId: workspaceId },
    select: { id: true },
  });

  return Boolean(listing);
}

export async function workspacePurchasedListing(workspaceId: string, listingId: string) {
  const purchase = await prisma.studioTemplatePurchase.findUnique({
    where: {
      workspaceId_listingId: {
        workspaceId,
        listingId,
      },
    },
    select: { id: true },
  });

  return Boolean(purchase);
}

export async function workspaceCanUseListing(
  workspaceId: string,
  listing: { id: string; priceCents: number; publisherWorkspaceId?: string },
) {
  if (listing.publisherWorkspaceId === workspaceId) {
    return true;
  }

  if (listing.priceCents <= 0) {
    return true;
  }

  return workspacePurchasedListing(workspaceId, listing.id);
}

export async function listPublishedTemplateListings(options?: {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 24));
  const search = options?.search?.trim();
  const category = options?.category?.trim();

  const where: Prisma.StudioTemplateListingWhereInput = {
    status: "PUBLISHED",
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [listings, total] = await Promise.all([
    prisma.studioTemplateListing.findMany({
      where,
      orderBy: [{ useCount: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: listingSelect,
    }),
    prisma.studioTemplateListing.count({ where }),
  ]);

  return {
    listings: listings.map(toPublicListing),
    total,
    page,
    pageSize,
  };
}

export async function listMyTemplateListings(workspaceId: string) {
  const listings = await prisma.studioTemplateListing.findMany({
    where: { publisherWorkspaceId: workspaceId },
    orderBy: { updatedAt: "desc" },
    select: {
      ...listingSelect,
      publisherWorkspaceId: true,
      sourceFlowId: true,
    },
  });

  return listings.map(toPublicListing);
}

export async function getTemplateListingBySlug(slug: string) {
  return prisma.studioTemplateListing.findUnique({
    where: { slug },
    include: {
      publisherUser: { select: { name: true } },
      publisherWorkspace: { select: { name: true } },
    },
  });
}

export async function getTemplateListingById(listingId: string) {
  return prisma.studioTemplateListing.findUnique({
    where: { id: listingId },
    include: {
      publisherUser: { select: { name: true } },
      publisherWorkspace: { select: { name: true } },
    },
  });
}

export async function getTemplateListingByIdOrSlug(identifier: string) {
  const bySlug = await getTemplateListingBySlug(identifier);
  if (bySlug) {
    return bySlug;
  }

  return getTemplateListingById(identifier);
}

export async function findPublishedListingForSourceFlow(
  workspaceId: string,
  sourceFlowId: string,
) {
  const listing = await prisma.studioTemplateListing.findFirst({
    where: {
      publisherWorkspaceId: workspaceId,
      sourceFlowId,
      status: "PUBLISHED",
    },
    select: listingSelect,
  });

  return listing ? toPublicListing(listing) : null;
}

export async function findDraftListingForSourceFlow(workspaceId: string, sourceFlowId: string) {
  const listing = await prisma.studioTemplateListing.findFirst({
    where: {
      publisherWorkspaceId: workspaceId,
      sourceFlowId,
      status: "DRAFT",
    },
    select: listingSelect,
  });

  return listing ? toPublicListing(listing) : null;
}

export async function getSourceFlowPublishState(workspaceId: string, sourceFlowId: string) {
  const published = await findPublishedListingForSourceFlow(workspaceId, sourceFlowId);
  if (published) {
    return {
      canPublish: false,
      listing: published,
      reason: "This flow is already published to the marketplace.",
    } as const;
  }

  const draft = await findDraftListingForSourceFlow(workspaceId, sourceFlowId);
  return {
    canPublish: true,
    listing: draft,
    reason: null,
  } as const;
}

async function assertNoDuplicatePublishedListing(
  workspaceId: string,
  sourceFlowId: string | null | undefined,
  excludeListingId?: string,
) {
  if (!sourceFlowId) {
    return;
  }

  const conflict = await prisma.studioTemplateListing.findFirst({
    where: {
      publisherWorkspaceId: workspaceId,
      sourceFlowId,
      status: "PUBLISHED",
      ...(excludeListingId ? { id: { not: excludeListingId } } : {}),
    },
    select: { id: true },
  });

  if (conflict) {
    throw new Error("This flow is already published to the marketplace.");
  }
}

export async function createDraftListingFromFlow(input: {
  sourceFlowId: string;
  workspaceId: string;
  userId: string;
  title?: string;
}) {
  const flow = await getStudioFlowForUser(input.sourceFlowId, input.workspaceId);

  if (!flow) {
    throw new Error("Source flow not found.");
  }

  const snapshot = parseFlowSnapshot(flow.nodes, flow.edges, flow.viewport);
  const sanitized = sanitizeTemplateSnapshot({
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    viewport: snapshot.viewport,
  });

  validateTemplateSnapshot(sanitized);

  await assertNoDuplicatePublishedListing(input.workspaceId, flow.id);

  const title = input.title?.trim() || flow.name || "Untitled template";

  const existingDraft = await findDraftListingForSourceFlow(input.workspaceId, flow.id);
  if (existingDraft) {
    const listing = await prisma.studioTemplateListing.update({
      where: { id: existingDraft.id },
      data: {
        ...(input.title !== undefined ? { title } : {}),
        nodes: sanitized.nodes as Prisma.InputJsonValue,
        edges: sanitized.edges as Prisma.InputJsonValue,
        viewport: sanitized.viewport as Prisma.InputJsonValue,
      },
      select: listingSelect,
    });

    return toPublicListing(listing);
  }

  const slug = await uniqueSlugForTitle(title);

  const listing = await prisma.studioTemplateListing.create({
    data: {
      slug,
      title,
      description: "",
      publisherUserId: input.userId,
      publisherWorkspaceId: input.workspaceId,
      sourceFlowId: flow.id,
      nodes: sanitized.nodes as Prisma.InputJsonValue,
      edges: sanitized.edges as Prisma.InputJsonValue,
      viewport: sanitized.viewport as Prisma.InputJsonValue,
      tags: [],
    },
    select: listingSelect,
  });

  return toPublicListing(listing);
}

export async function updateTemplateListing(
  listingId: string,
  workspaceId: string,
  data: {
    title?: string;
    description?: string;
    previewImageUrl?: string | null;
    sampleOutputIds?: string[];
    priceCents?: number;
    currency?: string;
    category?: string | null;
    tags?: string[];
    status?: StudioTemplateListingStatus;
  },
) {
  const existing = await prisma.studioTemplateListing.findFirst({
    where: { id: listingId, publisherWorkspaceId: workspaceId },
    select: { id: true, title: true, slug: true, sourceFlowId: true },
  });

  if (!existing) {
    throw new Error("Listing not found.");
  }

  let publishedSnapshot: TemplateListingSnapshot | undefined;

  if (data.status === "PUBLISHED") {
    await assertNoDuplicatePublishedListing(
      workspaceId,
      existing.sourceFlowId,
      listingId,
    );

    if (existing.sourceFlowId) {
      const flow = await getStudioFlowForUser(existing.sourceFlowId, workspaceId);
      if (!flow) {
        throw new Error("Source Studio session not found.");
      }

      publishedSnapshot = sanitizeTemplateSnapshot(
        parseFlowSnapshot(flow.nodes, flow.edges, flow.viewport),
      );
    } else {
      const full = await prisma.studioTemplateListing.findUnique({
        where: { id: listingId },
        select: { nodes: true, edges: true, viewport: true },
      });

      if (full) {
        publishedSnapshot = sanitizeTemplateSnapshot(
          parseFlowSnapshot(full.nodes, full.edges, full.viewport),
        );
      }
    }

    if (publishedSnapshot) {
      validateTemplateSnapshot(publishedSnapshot);
    }
  }

  let slug = existing.slug;
  if (data.title && data.title.trim() !== existing.title) {
    slug = await uniqueSlugForTitle(data.title);
  }

  let sampleOutputs: TemplateSampleOutput[] | undefined;
  let previewImageUrl = data.previewImageUrl;

  if (data.sampleOutputIds !== undefined) {
    if (!existing.sourceFlowId) {
      throw new Error("This listing has no source flow for sample outputs.");
    }

    const available = await getFlowTemplateSamples(existing.sourceFlowId, workspaceId);
    sampleOutputs = resolveSelectedSampleOutputs(available, data.sampleOutputIds);

    const publishing = data.status === "PUBLISHED";
    if (publishing && data.sampleOutputIds.length > 0) {
      if (sampleOutputs.length === 0) {
        throw new Error(
          "Selected sample outputs are unavailable. Run your flow, then pick images or videos from this session.",
        );
      }

      if (sampleOutputs.length !== data.sampleOutputIds.length) {
        throw new Error("One or more sample outputs are not from this template session.");
      }
    }

    previewImageUrl = templateSampleCoverUrl(sampleOutputs);
  }

  const listing = await prisma.studioTemplateListing.update({
    where: { id: listingId },
    data: {
      ...(publishedSnapshot
        ? {
            nodes: publishedSnapshot.nodes as Prisma.InputJsonValue,
            edges: publishedSnapshot.edges as Prisma.InputJsonValue,
            viewport: publishedSnapshot.viewport as Prisma.InputJsonValue,
          }
        : {}),
      ...(data.title !== undefined ? { title: data.title.trim() || "Untitled template" } : {}),
      ...(data.title !== undefined ? { slug } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(previewImageUrl !== undefined ? { previewImageUrl } : {}),
      ...(sampleOutputs !== undefined
        ? { sampleOutputs: sampleOutputs as Prisma.InputJsonValue }
        : {}),
      ...(data.priceCents !== undefined ? { priceCents: Math.max(0, data.priceCents) } : {}),
      ...(data.currency !== undefined ? { currency: data.currency.toLowerCase() } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: listingSelect,
  });

  return toPublicListing(listing);
}

export function listingSnapshotFromRecord(listing: {
  nodes: Prisma.JsonValue;
  edges: Prisma.JsonValue;
  viewport: Prisma.JsonValue;
}): TemplateListingSnapshot {
  const snapshot = parseFlowSnapshot(listing.nodes, listing.edges, listing.viewport);
  return {
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    viewport: snapshot.viewport,
  };
}

export function toPublicListingFromRecord(
  listing: Parameters<typeof toPublicListing>[0],
): PublicTemplateListing {
  return toPublicListing(listing);
}

export async function fulfillTemplatePurchaseCheckoutSession(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;
  const userId = session.metadata?.userId;
  const listingId = session.metadata?.listingId;

  if (!workspaceId || !userId || !listingId || !session.id) {
    throw new Error("Checkout session is missing template metadata.");
  }

  if (session.status !== "complete") {
    throw new Error("Checkout is not complete yet.");
  }

  return recordTemplatePurchase({
    workspaceId,
    listingId,
    purchasedByUserId: userId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
  });
}

export async function completeTemplatePurchaseCheckout(input: {
  sessionId: string;
  workspaceId: string;
}) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(input.sessionId);

  if (session.metadata?.workspaceId !== input.workspaceId) {
    throw new Error("Checkout session does not belong to this workspace.");
  }

  return fulfillTemplatePurchaseCheckoutSession(session);
}

export async function recordTemplatePurchase(input: {
  workspaceId: string;
  listingId: string;
  purchasedByUserId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  amountCents: number;
  currency: string;
}) {
  return prisma.studioTemplatePurchase.upsert({
    where: {
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    },
    create: {
      workspaceId: input.workspaceId,
      listingId: input.listingId,
      purchasedByUserId: input.purchasedByUserId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      amountCents: input.amountCents,
      currency: input.currency,
    },
    update: {},
  });
}

export async function incrementTemplateUseCount(listingId: string) {
  await prisma.studioTemplateListing.update({
    where: { id: listingId },
    data: { useCount: { increment: 1 } },
  });
}
