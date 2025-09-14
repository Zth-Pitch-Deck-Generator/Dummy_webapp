// src/components/outline-swot/Swot.tsx
import { Loader2 } from "lucide-react";

type SWOT = {
  strength: string[];
  weakness: string[];
  opportunities: string[];
  threats: string[];
};

interface SwotProps {
  review: SWOT | null;
  loading: boolean;
}

const Swot = ({ review, loading }: SwotProps) => {
  const hasData =
    !!review?.strength?.length ||
    !!review?.weakness?.length ||
    !!review?.opportunities?.length ||
    !!review?.threats?.length;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <div className="mt-10 border rounded-xl shadow-sm p-6 bg-gray-50 space-y-6">
        <h4 className="text-xl font-semibold text-center">SWOT Analysis</h4>

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-gray-500" />
            <span className="text-gray-600">Generating SWOT…</span>
          </div>
        )}

        {!loading && !hasData && (
          <p className="text-sm text-center text-gray-500">
            Switching to this tab starts generation automatically.
          </p>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <h5 className="font-bold text-green-800 mb-2">Strengths</h5>
              <ul className="list-disc pl-5 text-sm space-y-1 text-green-700">
                {review?.strength?.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <h5 className="font-bold text-red-800 mb-2">Weaknesses</h5>
              <ul className="list-disc pl-5 text-sm space-y-1 text-red-700">
                {review?.weakness?.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="font-bold text-blue-800 mb-2">Opportunities</h5>
              <ul className="list-disc pl-5 text-sm space-y-1 text-blue-700">
                {review?.opportunities?.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h5 className="font-bold text-yellow-800 mb-2">Threats</h5>
              <ul className="list-disc pl-5 text-sm space-y-1 text-yellow-700">
                {review?.threats?.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Swot;
