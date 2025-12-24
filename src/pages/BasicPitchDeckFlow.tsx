import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/AppSidebar';
import InteractiveQA from '@/components/interactive-qa/InteractiveQA';
import MarketAnalysis from '@/components/market-analysis/MarketAnalysis'; // New Component
import Outline from '@/components/OutlineContainer';
import Template from '@/components/Template';
import DeckEditor from '@/components/DeckEditor';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

type FlowStep = "qa" | "market-analysis" | "outline" | "template" | "editor";

const BasicPitchDeckFlow = () => {
  const { projectId } = useParams<{ projectId: string }>();
  // Added 'market-analysis' to the step types
  const [currentStep, setCurrentStep] = useState<FlowStep>("qa");
  const [projectData, setProjectData] = useState<any>(null);

  // State to hold data passed between steps
  const [outline, setOutline] = useState<any | null>(null);
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

  // 1. Q&A Complete -> Go to Market Analysis
  const handleQAComplete = () => {
    setCurrentStep('market-analysis');
  };

  // 2. Market Analysis Complete -> Go to Outline
  const handleMarketAnalysisComplete = () => {
    setCurrentStep('outline');
  };

  // 3. Outline Accepted -> Go to Template
  const handleOutlineAccept = (outlineData: any) => {
    setOutline(outlineData);
    setCurrentStep('template');
  };

  // 4. Template Selected -> Go to Editor
  const handleTemplateSelected = (selectedTemplateInfo: any) => {
    setTemplateInfo(selectedTemplateInfo);
    setCurrentStep('editor');
  };

  // Optional: For download link toast/display
  const handleDownloadReady = (url: string) => {
    console.log("Deck ready at:", url);
  };

  if (!projectData || !projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  // Step rendering logic
  const renderStep = () => {
    switch (currentStep) {
      case 'qa':
        // Updated to pass projectId directly as per Step 5 requirements
        return (
          <InteractiveQA
            projectId={projectId}
            onComplete={handleQAComplete}
          />
        );

      case 'market-analysis':
        // New Step inserted here
        return (
          <MarketAnalysis
            projectId={projectId}
            onComplete={handleMarketAnalysisComplete}
          />
        );

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
            productDescription={projectData?.description || ""}
            onDownloadReady={handleDownloadReady}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50/50">
        <AppSidebar
          currentStep={currentStep}
          onStepChange={(step: any) => setCurrentStep(step)}
          projectData={projectData}
          qaDone={currentStep !== 'qa'}
          marketAnalysisDone={currentStep !== 'qa' && currentStep !== 'market-analysis'} // Logic: Done if we are past these steps
          outlineDone={currentStep === 'editor' || currentStep === 'template'}
        />
        <main className="flex-1 p-6 overflow-auto">
          <SidebarTrigger className="mb-4" />
          <div className="max-w-7xl mx-auto">
            {renderStep()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default BasicPitchDeckFlow;