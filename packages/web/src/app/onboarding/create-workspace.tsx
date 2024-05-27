"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateWorkspace() {
  return (
    <div className="flex w-1/2 flex-col pt-24">
      <h1 className="text-2xl font-bold">New Workspace</h1>
      <h2 className="font-medium text-stone-500">Create a new workspace</h2>
      <div className="mt-12 flex flex-col">
        <h3>Name</h3>
        <Input />
      </div>
      <Button className="mt-4">Create Workspace</Button>
    </div>
  );
}
