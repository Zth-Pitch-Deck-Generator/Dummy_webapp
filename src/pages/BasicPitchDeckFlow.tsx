import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from '../components/AppSidebar';
import InteractiveQA from '../components/interactive-qa/InteractiveQA';
import Outline from '../components/OutlineContainer';
import Template from '../components/Template';
import DeckEditor from '../components/DeckEditor';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/skeleton';

const BasicPitchDeckFlow = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [currentStep, setCurrentStep] = useState<"qa" | "outline" | "template" | "setup" | "preview" | "editor">("qa");
  const [projectData, setProjectData] = useState(null);
  const [qaData, setQAData] = useState([]);
  const [outline, setOutline] = useState<any | null>(null);   // Single outline object, not array
  const [templateInfo, setTemplateInfo] = useState<{ name: string; description: string } | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      localStorage.setItem("projectId", projectId);

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error("Error fetching project data:", error);
      } else if (data) {
        const subtype = data.decktype;
        const type = subtype.includes('pitch_deck') ? 'pitch-deck' : 'dataroom';
        setProjectData({
          projectName: data.name,
          industry: data.industry,
          stage: data.stage,
          description: data.description,
          revenue: data.revenue,
          decktype: type,
        });
      }
    };
    fetchProject();
  }, [projectId]);

  // Q&A section complete
  const handleQAComplete = (data) => {
    setQAData(data);
    setCurrentStep('outline');
  };

  // Outline step complete
  const handleOutlineAccept = (outlineData) => {
    setOutline(outlineData); // For most outline generators this is a single object
    setCurrentStep('template');
  };

  // Template selection step complete
  // Template component should call this with { name, description }
  const handleTemplateSelected = (selectedTemplateInfo) => {
    setTemplateInfo(selectedTemplateInfo);
    setCurrentStep('editor');
  };

  // Optional: For download link toast/display (from DeckEditor)
  const handleDownloadReady = (url) => {
    // Can show toast, update state, etc.
  };

  if (!projectData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Step rendering logic
  const renderStep = () => {
    switch (currentStep) {
      case 'qa':
        return <InteractiveQA projectData={projectData} onComplete={handleQAComplete} />;
      case 'outline':
        return <Outline onAccept={handleOutlineAccept} />;
      case 'template':
        return (
          <Template
            industry={projectData.industry}
            onGenerate={handleTemplateSelected}
          />
        );
      case 'editor':
        return (
          <DeckEditor
            projectId={projectId}
            templateInfo={templateInfo!}
            outline={outline!}
            onDownloadReady={handleDownloadReady}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          projectData={projectData}
          qaDone={currentStep !== 'qa'}
          outlineDone={currentStep === 'editor' || currentStep === 'template'}
        />
        <main className="flex-1 p-6">
          <SidebarTrigger className="mb-4" />
          {renderStep()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default BasicPitchDeckFlow;
