"use client";

type Props = {
  user: {
    id: string;
    email: string;
  };
};

export function MemberItem(props: Props) {
  return (
    <div className="m-1 rounded-sm hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <p className="text-sm">{props.user.email}</p>
      </div>
    </div>
  );
}
