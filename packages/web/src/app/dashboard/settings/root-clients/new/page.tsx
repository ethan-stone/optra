import { NewRootClientForm } from "./new-root-client-form";

export default function NewRootClientPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">New Root Client</h2>
      </div>
      <NewRootClientForm />
    </div>
  );
}
