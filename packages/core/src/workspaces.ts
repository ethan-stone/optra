import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { and, eq } from "drizzle-orm";
import { uid } from "./uid";
import { Resource } from "sst";

export type WorkspaceBillingInfo =
  typeof schema.workspaceBillingInfo.$inferSelect;

export type Workspace = typeof schema.workspaces.$inferSelect & {
  billingInfo: WorkspaceBillingInfo;
};

export type CreateWorkspaceParams = Omit<
  typeof schema.workspaces.$inferInsert,
  "id"
>;

export type AddMemberResult =
  | {
      success: true;
      memberId: string;
    }
  | {
      success: false;
      error:
        | "user_already_in_workspace"
        | "workspace_not_paid"
        | "workspace_not_found";
    };

export type AddBillingInfoParams = Omit<
  typeof schema.workspaceBillingInfo.$inferInsert,
  "id" | "subscriptions"
>;

// TODO: edit this with final pricing
const proSubscription: schema.Subscriptions = {
  plan: {
    tier: "pro",
    productId: Resource.StripeProProductId.value,
    cents: "1000",
  },
  tokens: {
    productId: Resource.StripeGenerationsProductId.value,
    pricing: [
      {
        minUnits: 1,
        maxUnits: null,
        centsPerUnit: "10",
      },
    ],
  },
  verifications: {
    productId: Resource.StripeVerificationsProductId.value,
    pricing: [
      {
        minUnits: 1,
        maxUnits: null,
        centsPerUnit: "10",
      },
    ],
  },
};

export interface WorkspaceRepo {
  create(params: CreateWorkspaceParams): Promise<{ id: string }>;
  getById(id: string): Promise<Workspace | null>;
  getBillableWorkspaces(): Promise<WorkspaceBillingInfo[]>;
  getByTenantId(tenantId: string): Promise<Workspace | null>;
  addMember(workspaceId: string, userId: string): Promise<AddMemberResult>;
  addBillingInfo(billingInfo: AddBillingInfoParams): Promise<void>;
  changePlan(workspaceId: string, plan: "pro" | "free"): Promise<void>;
  requestPlanChange(workspaceId: string, plan: "pro" | "free"): Promise<void>;
  cancelPlanChange(workspaceId: string): Promise<void>;
}

export class DrizzleWorkspaceRepo implements WorkspaceRepo {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async create(params: CreateWorkspaceParams): Promise<{ id: string }> {
    const workspaceId = uid("ws");

    await this.db.insert(schema.workspaces).values({
      id: workspaceId,
      ...params,
    });

    return { id: workspaceId };
  }

  async getById(id: string): Promise<Workspace | null> {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, id),
      with: {
        billingInfo: true,
      },
    });

    if (!workspace) return null;

    // validate the subscriptions field since it is just a JSON column
    if (workspace.billingInfo?.subscriptions)
      schema.Subscriptions.parse(workspace.billingInfo.subscriptions);

    return workspace;
  }

  async getBillableWorkspaces(): Promise<WorkspaceBillingInfo[]> {
    return this.db.query.workspaceBillingInfo.findMany({
      where: (table, { and, not, eq, isNotNull }) =>
        and(not(eq(table.plan, "free")), isNotNull(table.subscriptions)),
    });
  }

  async getByTenantId(tenantId: string): Promise<Workspace | null> {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(schema.workspaces.tenantId, tenantId),
      with: {
        billingInfo: true,
      },
    });

    if (!workspace) return null;

    // validate the subscriptions field since it is just a JSON column
    if (workspace.billingInfo?.subscriptions)
      schema.Subscriptions.parse(workspace.billingInfo.subscriptions);

    return workspace;
  }

  async addMember(
    workspaceId: string,
    userId: string
  ): Promise<AddMemberResult> {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    });

    if (!workspace) return { success: false, error: "workspace_not_found" };

    if (workspace.type === "free")
      return { success: false, error: "workspace_not_paid" };

    const existingMember = await this.db.query.workspaceMembers.findFirst({
      where: and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId)
      ),
    });

    if (existingMember)
      return { success: false, error: "user_already_in_workspace" };

    const now = new Date();

    const memberId = uid("wsm");

    await this.db.insert(schema.workspaceMembers).values({
      id: memberId,
      workspaceId,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, memberId: memberId };
  }

  async getAccessibleWorkspaces(userId: string): Promise<Workspace[]> {
    const personalWorkspace = await this.db.query.workspaces.findFirst({
      where: eq(schema.workspaces.tenantId, userId),
      with: { billingInfo: true },
    });

    const paidWorkspaces = await this.db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
      with: { workspace: { with: { billingInfo: true } } },
    });

    return personalWorkspace
      ? [personalWorkspace, ...paidWorkspaces.map((p) => p.workspace)]
      : paidWorkspaces.map((p) => p.workspace);
  }

  async addBillingInfo(billingInfo: AddBillingInfoParams) {
    await this.db.insert(schema.workspaceBillingInfo).values({
      id: uid(),
      ...billingInfo,
      subscriptions: proSubscription,
    });
  }

  async changePlan(workspaceId: string, plan: "pro" | "free") {
    await this.db
      .update(schema.workspaceBillingInfo)
      .set({
        plan,
        planChangedAt: new Date(),
        subscriptions: plan === "pro" ? proSubscription : null,
        updatedAt: new Date(),
        requestedPlanChangeAt: null,
        requestedPlanChangeTo: null,
      })
      .where(eq(schema.workspaceBillingInfo.workspaceId, workspaceId));
  }

  async requestPlanChange(workspaceId: string, plan: "pro" | "free") {
    await this.db
      .update(schema.workspaceBillingInfo)
      .set({
        requestedPlanChangeAt: new Date(),
        requestedPlanChangeTo: plan,
      })
      .where(eq(schema.workspaceBillingInfo.workspaceId, workspaceId));
  }

  async cancelPlanChange(workspaceId: string) {
    await this.db
      .update(schema.workspaceBillingInfo)
      .set({
        requestedPlanChangeAt: null,
        requestedPlanChangeTo: null,
      })
      .where(eq(schema.workspaceBillingInfo.workspaceId, workspaceId));
  }
}
