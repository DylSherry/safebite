export default function Home() {
  return (
    <>
      {/* Left Sidebar for filters */}
      <aside className="w-64 flex-shrink-0 border-r border-emerald-800 bg-emerald-900 p-6 overflow-y-auto hidden md:block">
        <h2 className="text-lg font-semibold mb-4 text-white">Filters</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-sm text-emerald-100 mb-2">
              Allergens
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-emerald-600 bg-emerald-800 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-emerald-200">Peanuts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-emerald-600 bg-emerald-800 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-emerald-200">Dairy</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-emerald-600 bg-emerald-800 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-emerald-200">Gluten</span>
              </label>
            </div>
          </div>
        </div>
      </aside>

      {/* Main middle section for recommended items */}
      <main className="flex-1 p-6 overflow-y-auto bg-emerald-950">
        <h1 className="text-2xl font-bold mb-6 text-white">
          Recommended for You
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Example product card */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border border-emerald-800 rounded-lg p-4 bg-emerald-900 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-full h-32 bg-emerald-800 rounded-md mb-4"></div>
              <h3 className="font-semibold text-white">Product Name</h3>
              <p className="text-sm text-emerald-200 mt-1">R99.99</p>
              <button className="mt-4 w-full rounded bg-emerald-600 px-4 py-2 text-sm text-white font-medium hover:bg-emerald-700">
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Right Sidebar for safety monitor */}
      <aside className="w-72 flex-shrink-0 border-l border-emerald-800 bg-emerald-900 p-6 overflow-y-auto hidden lg:block">
        <h2 className="text-lg font-semibold mb-4 text-white">
          Safety Monitor
        </h2>
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-800 p-4">
            <h3 className="font-semibold text-white">All Good!</h3>
            <p className="text-sm text-emerald-200">
              Your cart items are safe for your profile.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
