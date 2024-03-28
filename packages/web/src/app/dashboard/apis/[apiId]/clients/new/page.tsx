import { NewClientForm } from "./new-client-form";

export default function NewClient() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl">New Client</h2>
      </div>
      <NewClientForm />
    </div>
  );
}
