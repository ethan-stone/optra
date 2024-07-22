import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type PutArgs = {
	content: string;
	key: string;
};

export interface Storage {
	publicUrl: string;

	put(args: PutArgs): Promise<void>;
}

export class AWSS3Storage implements Storage {
	constructor(
		private client: S3Client,
		private bucketArn: string,
		public publicUrl: string,
	) {}

	public async put(args: PutArgs): Promise<void> {
		const putObjCommand = new PutObjectCommand({
			Bucket: this.bucketArn,
			Key: args.key,
			Body: args.content,
		});

		await this.client.send(putObjCommand);
	}
}
