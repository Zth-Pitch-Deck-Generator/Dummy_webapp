import { useNavigate, useLocation } from 'react-router-dom';
import ProjectSetup from '../components/ProjectSetup';
import { ProjectData } from './Index';

const ProjectSetupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the flowType from the link state passed from the landing page
  const flowType = location.state?.flowType;

  const handleProjectComplete = (data: ProjectData, projectId: string) => {
    // Navigate to the main project flow page after setup is complete
    navigate(`/project/${projectId}`);
  };

  return (
    // Pass the flowType down to the ProjectSetup component
    <ProjectSetup onComplete={handleProjectComplete} flowType={flowType} />
  );
};

export default ProjectSetupPage;