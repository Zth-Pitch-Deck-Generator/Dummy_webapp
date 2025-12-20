// src/components/outline-swot/Outline.tsx

// Placeholder types (assuming these are defined in your central types file)
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

interface OutlineViewProps {
  slides: Slide[];
  onAddPoint: (slideIndex: number, content: string) => void;
  onDeletePoint: (slideIndex: number, tempId: string) => void;
  newPointContent: Record<number, string>;
  setNewPointContent: React.Dispatch<React.SetStateAction<Record<number, string>>>;
}

const OutlineView = ({
  slides,
  onAddPoint,
  onDeletePoint,
  newPointContent,
  setNewPointContent,
}: OutlineViewProps) => {

  const handleAddClick = (slideIndex: number) => {
    const content = newPointContent[slideIndex]?.trim();
    if (content) {
      onAddPoint(slideIndex, content);
      setNewPointContent((prev) => ({ ...prev, [slideIndex]: "" }));
    }
  };

  if (!slides.length) return <p className="text-left">No slides returned.</p>;

  return (
    // ADDED: text-left to force alignment override on the main container
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6 text-left">
      
      {slides.map((slide, slideIndex) => (
        // ADDED: text-left to individual cards to ensure isolation from global center styles
        <div key={slideIndex} className="border rounded-xl shadow-md p-6 text-left">
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100
                         text-blue-700 font-semibold flex items-center
                         justify-center"
            >
              {slideIndex + 1}
            </div>

            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 text-left">
                {slide.title}
              </h3>

              {!!slide.bullet_points?.length && (
                // UPDATED: Removed 'list-inside' and added 'pl-5' for standard plain-text alignment
                <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm text-left">
                  {slide.bullet_points.map((point, pointIndex) => (
                    <li
                      key={point.tempId || `ai-${slideIndex}-${pointIndex}`}
                      // Note: 'flex' on an <li> can sometimes swallow the bullet point marker 
                      // depending on browser. If bullets vanish, remove 'flex' and use block display.
                      // For now, kept 'flex' to preserve your delete button positioning logic.
                      className={`group relative pr-8 flex items-start ${point.isUserAdded ? 'text-blue-700 font-medium' : ''}`}
                    >
                      <span className="block text-left">{point.content}</span>

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
                  // ADDED: text-left to force input text alignment
                  className="flex-grow p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 text-left"
                  placeholder="Add your own point..."
                  rows={2}
                  value={newPointContent[slideIndex] || ""}
                  onChange={(e) =>
                    setNewPointContent((prev) => ({
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
                <div className="mt-4 p-3 bg-yellow-50 rounded-md text-sm text-yellow-800 border border-yellow-200 text-left">
                  <h4 className="font-semibold mb-1">Data Needed:</h4>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {slide.data_needed.map((data, idx) => (
                      <li key={idx} className="text-left">{data}</li>
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