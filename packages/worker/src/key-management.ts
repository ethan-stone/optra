import { KMSClient, GenerateDataKeyCommand, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

export interface KeyManagementService {
	generateDataKey: () => Promise<{ plaintext: Uint8Array; ciphertext: Uint8Array }>;
	encrypt: (plaintext: Uint8Array) => Promise<Uint8Array>;
	decrypt: (ciphertext: Uint8Array) => Promise<Uint8Array>;
}

export class AWSKeyManagementService implements KeyManagementService {
	constructor(private client: KMSClient, private keyId: string) {}

	public async generateDataKey(): Promise<{ plaintext: Uint8Array; ciphertext: Uint8Array }> {
		const command = new GenerateDataKeyCommand({
			KeyId: this.keyId,
			KeySpec: 'AES_256',
		});

		const result = await this.client.send(command);

		if (!result.Plaintext || !result.CiphertextBlob) {
			throw new Error('Plaintext or Ciphertext is missing from KMS response');
		}

		return {
			plaintext: result.Plaintext,
			ciphertext: result.CiphertextBlob,
		};
	}

	public async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
		const command = new EncryptCommand({
			KeyId: this.keyId,
			Plaintext: plaintext,
		});

		const result = await this.client.send(command);

		if (!result.CiphertextBlob) {
			throw new Error('Ciphertext is missing from KMS response');
		}

		return result.CiphertextBlob;
	}

	public async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
		const command = new DecryptCommand({
			KeyId: this.keyId,
			CiphertextBlob: ciphertext,
		});

		const result = await this.client.send(command);

		if (!result.Plaintext) {
			throw new Error('Plaintext is missing from KMS response');
		}

		return result.Plaintext;
	}
}
