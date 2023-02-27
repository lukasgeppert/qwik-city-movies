import { component$, useSignal, useStore, useTask$ } from "@builder.io/qwik";
import {
  loader$,
  server$,
  useLocation,
  z,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { MediaGrid } from "~/modules/MediaGrid/MediaGrid";
import { search } from "~/services/tmdb";
import type { ProductionMedia } from "~/services/types";
import { paths } from "~/utils/paths";

export const useSearchLoader = loader$(async (event) => {
  const query = event.url.searchParams.get("query");

  if (!query) {
    return null;
  }

  const result = await search({ page: 1, query });

  return { query, ...result };
});

export const getMore = server$(async (event, query: string, page: number) => {
  const parseResult = z
    .object({
      page: z.coerce.number().min(1).int().default(1),
      query: z.string().optional().default(""),
    })
    .safeParse({ page, query });

  if (!parseResult.success) {
    throw event.redirect(302, paths.notFound);
  }

  const result = await search(parseResult.data);

  return { query: parseResult.data.query, ...result };
});

export default component$(() => {
  const location = useLocation();

  const containerRef = useSignal<Element | null>(null);

  const resource = useSearchLoader();

  const currentPage = useSignal(1);
  const store = useStore<ProductionMedia[]>([]);

  useTask$(() => {
    const results = resource.value?.results || [];
    store.push(...results);
  });

  return (
    <div
      class="flex max-h-screen flex-col overflow-y-scroll"
      ref={(e) => (containerRef.value = e)}
    >
      <form class="flex flex-row justify-start gap-4 bg-base-300 p-4">
        <img
          src="/images/magnifier.svg"
          width={24}
          height={24}
          alt="search"
          aria-label="Search"
        />
        <input
          class="input"
          name="query"
          id="query"
          aria-label="query"
          value={location.url.searchParams.get("query") || ""}
        />
        <button class="btn" type="submit">
          Search
        </button>
      </form>

      {resource.value ? (
        <MediaGrid
          collection={store}
          currentPage={currentPage.value}
          pageCount={resource.value.total_pages || 1}
          parentContainer={containerRef.value}
          onMore$={async () => {
            const query = location.url.searchParams.get("query") || "";
            const data = await getMore(query, currentPage.value + 1);
            const newMedia = data.results || [];
            store.push(...newMedia);
            currentPage.value += 1;
          }}
        />
      ) : (
        <span class="w-full py-40 text-center text-4xl opacity-80">
          Type something to search...
        </span>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Search - Qwik City Movies",
};
