// src/pages/BasicPitchDeckFlow.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QAData, GeneratedSlide, ProjectData } from './Index';
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from '../components/AppSidebar';
import InteractiveQA from '../components/interactive-qa/InteractiveQA';
import Outline from '../components/Outline';
import Template from '../components/Template';
import DeckPreview from '../components/DeckPreview';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/skeleton';

const BasicPitchDeckFlow = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [currentStep, setCurrentStep] = useState<'qa' | 'outline' | 'template' | 'preview'>('qa');
    const [projectData, setProjectData] = useState<ProjectData | null>(null);
    const [qaData, setQAData] = useState<QAData>([]);
    const [outline, setOutline] = useState<any[]>([]);
    const [qaDone, setQaDone] = useState(false);
    const [outlineDone, setOutlineDone] = useState(false);
    const [templateSelected, setTemplateSelected] = useState(false);
    const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;
            // Set localStorage for other components that might need it
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
                    slide_mode: data.slide_mode,
                    slide_count: data.slide_count,
                    decktype: type,
                    deckSubtype: subtype
                });
            }
        };
        fetchProject();
    }, [projectId]);

    const handleQAComplete = (data: QAData) => {
        setQAData(data);
        setQaDone(true);
        setCurrentStep('outline');
    };

    const handleOutlineAccept = (outlineData: any[]) => {
        setOutline(outlineData);
        setOutlineDone(true);
        setCurrentStep('template');
    };

    const handleGenerateDeck = (slides: GeneratedSlide[], url: string) => {
        setGeneratedSlides(slides);
        setDownloadUrl(url);
        setTemplateSelected(true);
        setCurrentStep('preview');
    };
    
    if (!projectData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-80" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }

    const renderStep = () => {
        switch (currentStep) {
            case 'qa':
                return <InteractiveQA projectData={projectData} onComplete={handleQAComplete} />;
            case 'outline':
                return <Outline onAccept={handleOutlineAccept} />;
            case 'template':
                return <Template onGenerate={handleGenerateDeck} />;
            case 'preview':
                return <DeckPreview 
                         projectData={projectData} 
                         qaData={qaData} 
                         generatedSlides={generatedSlides} 
                         downloadUrl={downloadUrl} 
                       />;
            default:
                return null;
        }
    }

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-gray-50">
                <AppSidebar
                    currentStep={currentStep}
                    onStepChange={(step) => setCurrentStep(step as any)}
                    projectData={projectData}
                    qaDone={qaDone}
                    outlineDone={outlineDone}
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