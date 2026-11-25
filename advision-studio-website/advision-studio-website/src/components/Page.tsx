import type { ReactNode } from "react";

export default function Page({
  title,
  intro,
  children,
  wide = false,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex-1 w-full mx-auto px-5 md:px-10 pt-4 md:pt-6 pb-6 flex flex-col ${
        wide ? "max-w-6xl" : "max-w-4xl"
      }`}
    >
      <h1 className="font-heading italic text-4xl md:text-5xl tracking-tight leading-[0.9] text-white">
        {title}
      </h1>
      {intro && (
        <p className="mt-2 text-white/55 font-body font-light text-sm md:text-base max-w-2xl">
          {intro}
        </p>
      )}
      <div className="mt-5 md:mt-7 flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}
