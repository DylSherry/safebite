export default function Home() {
  return (
    <>
      {/* Left Sidebar for filters */}
      <aside className="w-64 flex-shrink-0 border-r border-zinc-200 bg-white p-6 overflow-y-auto hidden md:block">
        <h2 className="text-lg font-semibold mb-4 text-zinc-900">Filters</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-sm text-zinc-800 mb-2">
              Allergens
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-zinc-700">Peanuts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-zinc-700">Dairy</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-zinc-700">Gluten</span>
              </label>
            </div>
          </div>
        </div>
      </aside>

      {/* Main middle section for recommended items */}
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 text-zinc-900">
          Recommended for You
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Example product card */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-full h-32 bg-zinc-200 rounded-md mb-4"></div>
              <h3 className="font-semibold text-zinc-900">Product Name</h3>
              <p className="text-sm text-zinc-600 mt-1">R99.99</p>
              <button className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700">
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Right Sidebar for safety monitor */}
      <aside className="w-72 flex-shrink-0 border-l border-zinc-200 bg-white p-6 overflow-y-auto hidden lg:block">
        <h2 className="text-lg font-semibold mb-4 text-zinc-900">
          Safety Monitor
        </h2>
        <div className="space-y-4">
          <div className="rounded-lg bg-green-100 p-4">
            <h3 className="font-semibold text-green-800">All Good!</h3>
            <p className="text-sm text-green-700">
              Your cart items are safe for your profile.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
