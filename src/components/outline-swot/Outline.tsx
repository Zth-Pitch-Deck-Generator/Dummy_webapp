// src/components/outline-swot/Outline.tsx

// REMOVED: import { useState } from "react"; // State should be managed in OutlineContainer

// NEW: Assume OutlinePoint and Slide types are imported or defined in OutlineContainer.tsx
// It's best practice to define shared types in a central file (e.g., src/types.ts) and import them.
// For now, we'll assume they are defined in OutlineContainer and passed correctly.
// If you create a types.ts file later, you would import them like:
// import { OutlinePoint, Slide } from '@/types'; // Example

// Placeholder types to avoid immediate TypeScript errors if not imported
// In a real project, these should be imported from a central types file or inherited
type OutlinePoint = {
  content: string;
  isUserAdded: boolean;
  tempId?: string;
};

type Slide = {
  title: string;
  bullet_points: OutlinePoint[];
  data_needed?: string[];
};


// UPDATED: OutlineViewProps now accepts the necessary callbacks and the correct Slide type
interface OutlineViewProps {
  slides: Slide[]; // Receives the combined outline with OutlinePoint[]
  onAddPoint: (slideIndex: number, content: string) => void; // Callback to add a point
  onDeletePoint: (slideIndex: number, tempId: string) => void; // Callback to delete a point
  // NEW: Input value and setter for the add point text area, passed from container
  newPointContent: Record<number, string>;
  setNewPointContent: React.Dispatch<React.SetStateAction<Record<number, string>>>;
}

const OutlineView = ({
  slides,
  onAddPoint,
  onDeletePoint,
  newPointContent, // NEW: Receive as prop
  setNewPointContent, // NEW: Receive as prop
}: OutlineViewProps) => {

  // REMOVED: useState<Record<number, string>>({}); // State for input field content is now managed in OutlineContainer

  // NEW: Handler for adding a new point, now uses props for state management
  const handleAddClick = (slideIndex: number) => {
    const content = newPointContent[slideIndex]?.trim();
    if (content) {
      onAddPoint(slideIndex, content); // Call the prop function from OutlineContainer
      setNewPointContent((prev) => ({ ...prev, [slideIndex]: "" })); // Clear input field
    }
  };

  if (!slides.length) return <p>No slides returned.</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Your Outline</h1>
      {slides.map((slide, slideIndex) => (
        <div key={slideIndex} className="border rounded-xl shadow-md p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100
                         text-blue-700 font-semibold flex items-center
                         justify-center"
            >
              {slideIndex + 1}
            </div>

            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {slide.title}
              </h3>

              {!!slide.bullet_points?.length && (
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  {slide.bullet_points.map((point, pointIndex) => (
                    <li
                      key={point.tempId || `ai-${slideIndex}-${pointIndex}`}
                      className={`group relative pr-8 flex items-start ${point.isUserAdded ? 'text-blue-700 font-medium' : ''}`}
                    >
                      {point.content}

                      {point.isUserAdded && (
                        <button
                          onClick={() => point.tempId && onDeletePoint(slideIndex, point.tempId)}
                          className="absolute right-0 top-0 p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          aria-label="Delete custom point"
                          title="Delete this custom point"
                        >
                          X
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Input for adding new points */}
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <textarea
                  className="flex-grow p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add your own point..."
                  rows={2}
                  value={newPointContent[slideIndex] || ""} // NEW: Value comes from props
                  onChange={(e) =>
                    setNewPointContent((prev) => ({ // NEW: Setter comes from props
                      ...prev,
                      [slideIndex]: e.target.value,
                    }))
                  }
                />
                <button
                  onClick={() => handleAddClick(slideIndex)}
                  className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  Add Point
                </button>
              </div>

              {!!slide.data_needed?.length && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-md text-sm text-yellow-800 border border-yellow-200">
                  <h4 className="font-semibold mb-1">Data Needed:</h4>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {slide.data_needed.map((data, idx) => (
                      <li key={idx}>{data}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OutlineView;