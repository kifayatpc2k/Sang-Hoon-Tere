import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Game = lazy(() => import("@/game/Game"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mahinoor — Chapter One" },
      {
        name: "description",
        content:
          "A quiet 3D story on an Istanbul waterfront: meet a boy with a kitten and share the view across the Bosphorus.",
      },
      { property: "og:title", content: "Mahinoor — Chapter One" },
      {
        property: "og:description",
        content: "Walk the Istanbul waterfront, adopt a kitten, and sit together by the water.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Fallback() {
  return (
    <div className="screen-cover">
      <h1 className="font-display text-5xl">Mahinoor</h1>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <Game />
      </Suspense>
    </ClientOnly>
  );
}
