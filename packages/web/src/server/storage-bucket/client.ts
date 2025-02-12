import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";

type UploadArgs = {
  key: string;
  contentType: string;
  body: string;
};

export interface StorageBucket {
  publicUrl: string;

  upload(args: UploadArgs): Promise<void>;
}

export class S3StorageBucket implements StorageBucket {
  constructor(
    private readonly s3Client: S3Client,
    private readonly bucket: string,
    public publicUrl: string,
  ) {}

  async upload(args: UploadArgs): Promise<void> {
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    });

    await this.s3Client.send(putCommand);
  }
}
