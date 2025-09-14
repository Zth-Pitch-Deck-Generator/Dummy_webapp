// src/components/outline-swot/Outline.tsx
type Slide = {
  title: string;
  bullet_points?: string[];
  data_needed?: string[];
};

interface OutlineViewProps {
  slides: Slide[];
}

const OutlineView = ({ slides }: OutlineViewProps) => {
  if (!slides.length) return <p>No slides returned.</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Your Outline</h1>
      {slides.map((slide, i) => (
        <div key={i} className="border rounded-xl shadow-md p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100
                          text-blue-700 font-semibold flex items-center
                          justify-center"
            >
              {i + 1}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {slide.title}
              </h3>

              {!!slide.bullet_points?.length && (
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  {slide.bullet_points.map((bp) => (
                    <li key={bp}>{bp}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OutlineView;
