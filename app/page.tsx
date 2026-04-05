import Categories from "@/components/home/Categories";
import CoinOverview from "@/components/home/CoinOverview";
import TrendingCoins from "@/components/home/TrendingCoins";
import { Divide } from "lucide-react";
import React, { Suspense } from "react";

const page = async () => {
  // waterfall - when data requests happens one after another
  // Promise all - JS fires all requests at once and wait for group to complete. Both requests happen at the same time
  // Suspense - allows to render page in chunks - > need to wrap data fetching in suspense boundary and provide fall back with no data

  return (
    <main className="main-container">
      <section className="home-grid">
        <Suspense fallback={<div> Loading Overview... </div>}>
          <CoinOverview />
        </Suspense>

        <Suspense fallback={<div> Loading Trending... </div>}>
          <TrendingCoins />
        </Suspense>
      </section>

      <section className="w-full mt-7 space-y-4">
        <Suspense fallback={<p> Loading Categories...</p>}>
          <Categories />
        </Suspense>
      </section>
    </main>
  );
};

export default page;
