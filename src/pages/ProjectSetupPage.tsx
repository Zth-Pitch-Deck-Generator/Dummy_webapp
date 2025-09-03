// src/pages/ProjectSetupPage.tsx
import { useNavigate } from "react-router-dom";
import { ProjectData } from "src/pages/Index.tsx";

type ProjectSetupProps = {
  onComplete: (data: ProjectData, projectId: string) => void;
};

const ProjectSetup = ({ onComplete }: ProjectSetupProps) => {
  // ...component logic here
  // Call onComplete(data, projectId) when appropriate
  return (
    <div>
      {/* Your component UI */}
    </div>
  );
};

const ProjectSetupPage = () => {
  const navigate = useNavigate();

  const handleProjectCreated = (data: ProjectData, projectId: string) => {
    // Navigate to the specific flow based on the deck subtype
    if (data.deckSubtype === 'basic_pitch_deck') {
      navigate(`/create/basic-pitch-deck/${projectId}`);
    } 
    // Add else-if blocks here for other deck types in the future
    // else if (data.deckSubtype === 'complete_pitch_deck') {
    //   navigate(`/create/complete-pitch-deck/${projectId}`);
    // }
    else {
        // Fallback or default navigation
        console.warn(`No dedicated route for deck subtype: ${data.deckSubtype}.`);
        // For now, we can redirect to a generic path or the basic one
        navigate(`/create/basic-pitch-deck/${projectId}`);
    }
  };

  return <ProjectSetup onComplete={handleProjectCreated} />;
};

export default ProjectSetupPage;