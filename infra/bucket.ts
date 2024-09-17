export const bucket = new sst.aws.Bucket("JwksBucket", {
  public: true,
});

export const outputs = {
  BucketDomain: bucket.domain,
};
