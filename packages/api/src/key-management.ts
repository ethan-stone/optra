import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import * as schema from '@optra/db/schema';
import { eq } from '@/db';
import { Buffer } from '@/buffer';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface KeyManagementService {
	encryptWithCustomerKey: (plaintext: Uint8Array) => Promise<Uint8Array>;
	decryptWithCustomerKey: (ciphertext: Uint8Array) => Promise<Uint8Array>;
	encryptWithDataKey: (keyId: string, plaintext: Uint8Array) => Promise<{ encryptedData: Uint8Array; iv: Uint8Array }>;
	decryptWithDataKey: (keyId: string, ciphertext: Uint8Array, iv: Uint8Array) => Promise<{ decryptedData: Uint8Array }>;
}

export class AWSKeyManagementService implements KeyManagementService {
	constructor(
		private client: KMSClient,
		private db: NodePgDatabase<typeof schema>,
		private customerKeyId: string,
	) {}

	public async encryptWithCustomerKey(plaintext: Uint8Array): Promise<Uint8Array> {
		const command = new EncryptCommand({
			KeyId: this.customerKeyId,
			Plaintext: plaintext,
		});

		const result = await this.client.send(command);

		if (!result.CiphertextBlob) {
			throw new Error('Ciphertext is missing from KMS response');
		}

		return result.CiphertextBlob;
	}

	public async decryptWithCustomerKey(ciphertext: Uint8Array): Promise<Uint8Array> {
		const command = new DecryptCommand({
			KeyId: this.customerKeyId,
			CiphertextBlob: ciphertext,
		});

		const result = await this.client.send(command);

		if (!result.Plaintext) {
			throw new Error('Plaintext is missing from KMS response');
		}

		return result.Plaintext;
	}

	public async encryptWithDataKey(keyId: string, plaintext: Uint8Array): Promise<{ encryptedData: Uint8Array; iv: Uint8Array }> {
		const dek = await this.db.query.dataEncryptionKeys.findFirst({
			where: eq(schema.dataEncryptionKeys.id, keyId),
		});

		if (!dek) {
			throw new Error(`Could not find data encryption key ${keyId}`);
		}

		// decrypt the data encryption key

		const command = new DecryptCommand({
			KeyId: this.customerKeyId,
			CiphertextBlob: Buffer.from(dek.key, 'base64'),
		});

		const result = await this.client.send(command);

		if (!result.Plaintext) {
			throw new Error('Plaintext is missing from KMS response');
		}

		const plaintextDek = result.Plaintext;

		// import the key
		const importedKey = await crypto.subtle.importKey('raw', plaintextDek, 'AES-GCM', true, ['encrypt', 'decrypt']);

		// generate an initialization vector
		const iv = crypto.getRandomValues(new Uint8Array(16));

		// encrypt the plaintext with the data encryption key
		const encryptedData = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: iv,
			},
			importedKey,
			plaintext,
		);

		return {
			encryptedData: new Uint8Array(encryptedData),
			iv: iv,
		};
	}

	public async decryptWithDataKey(keyId: string, ciphertext: Uint8Array, iv: Uint8Array): Promise<{ decryptedData: Uint8Array }> {
		const dek = await this.db.query.dataEncryptionKeys.findFirst({
			where: eq(schema.dataEncryptionKeys.id, keyId),
		});

		if (!dek) {
			throw new Error(`Could not find data encryption key ${keyId}`);
		}

		const command = new DecryptCommand({
			KeyId: this.customerKeyId,
			CiphertextBlob: Buffer.from(dek.key, 'base64'),
		});

		const result = await this.client.send(command);

		if (!result.Plaintext) {
			throw new Error('Plaintext is missing from KMS response');
		}

		const plaintextDek = result.Plaintext;

		const importedKey = await crypto.subtle.importKey('raw', plaintextDek, 'AES-GCM', true, ['encrypt', 'decrypt']);

		const decryptedData = await crypto.subtle.decrypt(
			{
				iv: iv,
				name: 'AES-GCM',
			},
			importedKey,
			ciphertext,
		);

		return {
			decryptedData: new Uint8Array(decryptedData),
		};
	}
}
