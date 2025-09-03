// src/pages/ProjectSetupPage.tsx
import ProjectSetup from '../components/ProjectSetup';
import { useNavigate } from "react-router-dom";
import { ProjectData } from "./Index";

const ProjectSetupPage = () => {
  const navigate = useNavigate();

  const handleProjectCreated = (data: ProjectData, projectId: string) => {
    // Navigate to the specific flow based on the deck subtype
    if (data.deckSubtype === 'basic_pitch_deck') {
      navigate(`/create/basic-pitch-deck/${projectId}`);
    } 
    // This is where you'll add routes for other deck types
    // else if (data.deckSubtype === 'complete_pitch_deck') {
    //   navigate(`/create/complete-pitch-deck/${projectId}`);
    // }
    else {
        // Fallback for any other deck types for now
        console.warn(`No dedicated route for deck subtype: ${data.deckSubtype}.`);
        navigate(`/create/basic-pitch-deck/${projectId}`);
    }
  };

  return <ProjectSetup onComplete={handleProjectCreated} />;
};

export default ProjectSetupPage;

