export default function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-lg">Loading TransiGenius Dashboard...</p>
        <p className="text-sm text-gray-500 mt-2">Initializing transport network analysis tools</p>
      </div>
    </div>
  )
}
