import { WorkspaceRepo } from '@optra/core/workspaces';
import { ApiRepo } from '@optra/core/apis';
import { ClientRepo } from '@optra/core/clients';
import { ClientSecretRepo } from '@optra/core/client-secrets';
import { SigningSecretRepo } from '@optra/core/signing-secrets';
import { TokenGenerationRepo } from '@optra/core/token-generations';
import { TokenVerificationRepo } from '@optra/core/token-verifications';

export type Db = {
	workspaces: WorkspaceRepo;
	apis: ApiRepo;
	clients: ClientRepo;
	clientSecrets: ClientSecretRepo;
	signingSecrets: SigningSecretRepo;
	tokenGenerations: TokenGenerationRepo;
	tokenVerifications: TokenVerificationRepo;
};
