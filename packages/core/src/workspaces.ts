import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { uid } from "./uid";

export type WorkspaceBillingInfo =
  typeof schema.workspaceBillingInfo.$inferSelect;

export type Workspace = typeof schema.workspaces.$inferSelect & {
  billingInfo: WorkspaceBillingInfo;
};

export type CreateWorkspaceParams = Omit<
  typeof schema.workspaces.$inferInsert,
  "id"
>;

export interface WorkspaceRepo {
  create(params: CreateWorkspaceParams): Promise<{ id: string }>;
  getById(id: string): Promise<Workspace | null>;
  getBillableWorkspaces(): Promise<WorkspaceBillingInfo[]>;
  getByTenantId(tenantId: string): Promise<Workspace | null>;
}

export class DrizzleWorkspaceRepo implements WorkspaceRepo {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

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
}
