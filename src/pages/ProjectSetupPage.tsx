import { useNavigate, useLocation } from 'react-router-dom';
import ProjectSetup from '../components/ProjectSetup';
import { ProjectData } from './Index';

const ProjectSetupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the flowType from router state
  const flowType = location.state?.flowType || 'pitch-deck';

  const handleProjectComplete = (data: ProjectData, projectId: string) => {
    // After setup, navigate to the correct DECK flow route
    if (data.deckSubtype === 'basic_pitch_deck') {
      navigate(`/create/basic-pitch-deck/${projectId}`);
    } else if (data.deckSubtype === 'complete_pitch_deck') {
      navigate(`/create/complete-pitch-deck/${projectId}`);
    } else {
      // Fallback if new subtype added
      navigate(`/create/basic-pitch-deck/${projectId}`);
    }
  };

  // Pass flowType into ProjectSetup as prop
  return (
    <ProjectSetup onComplete={handleProjectComplete} flowType={flowType} />
  );
};

export default ProjectSetupPage;
