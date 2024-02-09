type ApiPageProps = {
  params: { apiId: string };
};

export default function Api(props: ApiPageProps) {
  return <div>Api {props.params.apiId}</div>;
}
