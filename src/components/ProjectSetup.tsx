import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProjectData } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Users, Database, Loader2, ArrowLeft, ArrowRight, Building, BarChart3 } from "lucide-react";

export type FormData = Omit<ProjectData, "revenue" | "decktype" | "deckSubtype"> & {
  revenue: "" | ProjectData["revenue"];
  decktype: "" | ProjectData["decktype"];
  deckSubtype: "" | ProjectData["deckSubtype"];
};

interface ProjectSetupProps {
  onComplete: (data: ProjectData, projectId: string) => void;
}

const ProjectSetup = ({ onComplete }: ProjectSetupProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Omit<FormData, 'slide_count' | 'slide_mode'>>({
    projectName: "",
    industry: "",
    stage: "",
    revenue: "",
    description: "",
    decktype: "",
    deckSubtype: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 3;

  const deckTypes = {
    "pitch-deck": [
      { id: "basic_pitch_deck", name: "Basic Pitch Deck", description: "Covers the core narrative in exactly 8 slides.", icon: FileText, badge: "Core Story", slides: "8 slides" },
      { id: "complete_pitch_deck", name: "Complete Pitch Deck", description: "The full version, covering all key areas in 12 slides.", icon: TrendingUp, badge: "Full Version", slides: "12 slides" },
    ],
    "dataroom": [
      { id: "guided_dataroom", name: "Guided Build", description: "For founders unsure which metrics to feature. We'll propose industry-relevant KPIs.", icon: Users, badge: "Guided", slides: "12-13 slides" },
      { id: "direct_dataroom", name: "Direct Build", description: "For founders who already track their KPIs and know which ones to include.", icon: BarChart3, badge: "Direct", slides: "12-13 slides" },
    ]
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    setIsLoading(true);
    try {
      const apiPayload = {
        projectName: formData.projectName,
        industry: formData.industry,
        stage: formData.stage,
        revenue: formData.revenue,
        description: formData.description,
        decktype: formData.deckSubtype,
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Project creation failed");
      }
      const { id } = await res.json();
      onComplete(formData as unknown as ProjectData, id);
    } catch (err: any) {
      console.error(err);
      alert(`Error creating project: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handlePrevious = () => step > 1 && setStep(step - 1);

  // --- THE FIX ---
  // The validation for step 3 has been corrected to only check for a deck subtype.
  const isStepValid = () => {
    if (step === 1) return !!(formData.projectName.trim() && formData.industry && formData.stage && formData.revenue);
    if (step === 2) return !!formData.description.trim();
    if (step === 3) return !!formData.deckSubtype;
    return false;
  };

  const handleDeckTypeSelect = (type: 'pitch-deck' | 'dataroom') => {
    setFormData(prev => ({ ...prev, decktype: type, deckSubtype: "" }));
  };

  const handleDeckSubtypeSelect = (subtype: string) => {
    setFormData((p) => ({
      ...p,
      deckSubtype: subtype as FormData["deckSubtype"],
    }));
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-12">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
            ${i + 1 === step
              ? "bg-brand text-text-inverse shadow-sm"
              : i + 1 < step
                ? "bg-brand text-text-inverse"
                : "bg-surface border border-border text-text-tertiary"
            }
          `}>
            {i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div className={`
              w-16 h-px mx-4 transition-colors duration-200
              ${i + 1 < step ? "bg-brand" : "bg-border"}
            `} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          currentStep="setup"
          onStepChange={() => {}}
          projectData={null}
          qaDone={false}
          outlineDone={false}
        />
        <main className="flex-1 p-0">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-light text-text-primary mb-4 tracking-tight">
                Project Setup
              </h1>
              <p className="text-text-secondary font-light">
                {step === 1 && "Let's start with some basic information about your project"}
                {step === 2 && "Tell us more about your project to get tailored questions"}
                {step === 3 && "Select the type of document you want to create"}
              </p>
            </div>

            <StepIndicator />

            <Card className="border-0 shadow-lg bg-surface-elevated">
              <CardHeader className="pb-8">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="icon-container icon-container-sm bg-brand-light">
                    {step === 1 && <Building className="w-4 h-4 text-text-secondary" />}
                    {step === 2 && <FileText className="w-4 h-4 text-text-secondary" />}
                    {step === 3 && <BarChart3 className="w-4 h-4 text-text-secondary" />}
                  </div>
                  <CardTitle className="text-xl font-medium text-text-primary">
                    {step === 1 && "Project Basics"}
                    {step === 2 && "Project Description"}
                    {step === 3 && "Choose Deck Type"}
                  </CardTitle>
                </div>
                <CardDescription className="text-text-secondary font-light">
                  {step === 1 && "Basic information helps us understand your business context"}
                  {step === 2 && "A detailed description enables more targeted AI questions"}
                  {step === 3 && "Different deck types serve different purposes and audiences"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8 px-8 pb-8">
                {step === 1 && (
                    <div className="grid gap-6">
                        <div className="space-y-3">
                            <Label className="text-text-primary font-medium">Project Name</Label>
                            <Input
                                value={formData.projectName}
                                onChange={(e) => setFormData((p) => ({ ...p, projectName: e.target.value }))}
                                placeholder="Enter your project name"
                                className="input-field h-12"
                                autoFocus
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-text-primary font-medium">Industry</Label>
                                <Select value={formData.industry} onValueChange={(v) => setFormData((p) => ({ ...p, industry: v }))}>
                                    <SelectTrigger className="input-field h-12">
                                        <SelectValue placeholder="Select industry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Technology">Technology</SelectItem>
                                        <SelectItem value="Startup">Startup</SelectItem>
                                        <SelectItem value="FinTech">Fintech</SelectItem>
                                        <SelectItem value="Edtech">EdTech</SelectItem>
                                        <SelectItem value="Ecommerce">E-commerce</SelectItem>
                                        <SelectItem value="General">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-text-primary font-medium">Company Stage</Label>
                                <Select value={formData.stage} onValueChange={(v) => setFormData((p) => ({ ...p, stage: v }))}>
                                    <SelectTrigger className="input-field h-12">
                                        <SelectValue placeholder="Select stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pre-seed">Pre-Seed (Ideation)</SelectItem>
                                        <SelectItem value="seed">Seed (Ideation-development)</SelectItem>
                                        <SelectItem value="series-a">Series A (Development)</SelectItem>
                                        <SelectItem value="series-b">Series B (Growth)</SelectItem>
                                        <SelectItem value="series-c">Series C+ (Expansion)</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-text-primary font-medium">Revenue Status</Label>
                            <Select value={formData.revenue} onValueChange={(v) => setFormData((p) => ({ ...p, revenue: v as FormData["revenue"] }))}>
                                <SelectTrigger className="input-field h-12">
                                    <SelectValue placeholder="Select revenue status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pre-revenue">Pre-Revenue</SelectItem>
                                    <SelectItem value="revenue">Revenue-Generating</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <Label className="text-text-primary font-medium">Project Description</Label>
                            <Textarea
                                rows={8}
                                placeholder="Describe your project, its goals, target audience, and what makes it unique..."
                                value={formData.description}
                                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                                className="input-field resize-none"
                                autoFocus
                            />
                            <p className="text-sm text-text-tertiary font-light">
                                A detailed description helps our AI generate more relevant and targeted questions.
                            </p>
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div className="space-y-8">
                        <div className="space-y-6">
                                

                            {formData.decktype && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="border-t border-border pt-6">
                                        <h4 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">
                                            Choose Template
                                        </h4>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {deckTypes[formData.decktype].map((dt) => {
                                                const Icon = dt.icon;
                                                const selected = formData.deckSubtype === dt.id;
                                                return (
                                                <Card
                                                    key={dt.id}
                                                    onClick={() => handleDeckSubtypeSelect(dt.id)}
                                                    className={`card-interactive p-6 ${selected ? 'ring-2 ring-brand border-brand' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="icon-container icon-container-md bg-surface border border-border">
                                                            <Icon className="w-5 h-5 text-text-secondary" />
                                                        </div>
                                                        <Badge variant={selected ? "default" : "secondary"} className="text-xs">
                                                            {dt.badge}
                                                        </Badge>
                                                    </div>
                                                    <h5 className="text-lg font-medium text-text-primary mb-2">{dt.name}</h5>
                                                    <p className="text-text-secondary text-sm font-light mb-3 leading-relaxed">
                                                        {dt.description}
                                                    </p>
                                                    <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                                                        {dt.slides}
                                                    </p>
                                                </Card>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mt-8">
              <Button
                variant="ghost"
                disabled={step === 1}
                onClick={handlePrevious}
                className="flex items-center space-x-2 text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <Button
                onClick={handleNext}
                disabled={!isStepValid() || isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{step === totalSteps ? "Start Q&A Session" : "Continue"}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default ProjectSetup;