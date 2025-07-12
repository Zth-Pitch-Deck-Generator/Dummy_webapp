import { useState } from 'react';
import { ProjectData } from '@/pages/Index';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Briefcase, TrendingUp, Users } from 'lucide-react';

interface ProjectSetupProps {
  onComplete: (data: ProjectData) => void;
}

const ProjectSetup = ({ onComplete }: ProjectSetupProps) => {
  /* ─────────────────────────  local state  ───────────────────────── */
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    projectName: "",
    industry: "",
    description: "",
    slideCount: 12,
    decktype: "" as ProjectData["decktype"] | ""
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  /* cards a.k.a. deck-type presets */
  const deckTypes = [
    {
      id: "essentials",
      name: "Essentials",
      description: "Perfect for initial presentations and team alignments",
      icon: Briefcase,
      badge: "Popular",
      slides: "5-8 slides"
    },
    {
      id: "matrix",
      name: "Matrix",
      description: "Comprehensive analysis for strategic planning",
      icon: TrendingUp,
      badge: "Detailed",
      slides: "7-10 slides"
    },
    {
      id: "investor",
      name: "Complete Deck",
      description: "Comprehensive presentations covering all aspects",
      icon: Users,
      badge: "Professional",
      slides: "12-14 slides"
    }
  ];

  /* ───────────────────────  navigation handlers  ─────────────────── */
  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    /* final step – POST to backend */
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Project creation failed");
      }

      const { id } = await res.json();          // ⇠ Supabase row id
      localStorage.setItem("projectId", id);

      onComplete({ 
        ...formData, 
        decktype: formData.decktype as ProjectData["decktype"] 
      });
    } catch (err: any) {
      console.error(err);
      alert(`Error creating project: ${err.message}`);
    }
  };

  const handlePrevious = () => step > 1 && setStep(step - 1);

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.projectName.trim() && formData.industry.trim();
      case 2:
        return !!formData.description.trim();
      case 3:
        return !!formData.decktype;
      default:
        return false;
    }
  };

  /* ─────────────────────────────  render  ─────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto">
      {/* progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Project Setup</h1>
          <Badge variant="outline" className="text-sm">
            Step {step} of {totalSteps}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* main card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">
            {step === 1 && "Project Basics"}
            {step === 2 && "Project Description"}
            {step === 3 && "Choose Deck Type"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Let's start with some basic information about your project"}
            {step === 2 && "Tell us more about your project to get tailored questions"}
            {step === 3 && "Select a deck type that fits your presentation needs"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* STEP 1───────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="Enter your project name"
                  value={formData.projectName}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, projectName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry / Field *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, industry: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="edtech">EdTech</SelectItem>
                    <SelectItem value="e-commerce">E-commerce</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* STEP 2───────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-2">
              <Label htmlFor="description">Project Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your project, its goals, and target audience…"
                rows={6}
                value={formData.description}
                onChange={e =>
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                }
              />
              <p className="text-sm text-gray-600">
                This helps our AI generate more relevant questions for your pitch deck.
              </p>
            </div>
          )}

          {/* STEP 3───────────────────────────────────────── */}
          {step === 3 && (
            <>
              {/* deck-type picker */}
              <div className="grid md:grid-cols-3 gap-4">
                {deckTypes.map(dt => {
                  const Icon = dt.icon;
                  const selected = formData.decktype === dt.id;

                  return (
                    <Card
                      key={dt.id}
                      onClick={() =>
                        setFormData(prev => ({ ...prev, decktype: dt.id as ProjectData["decktype"] }))
                      }
                      className={`cursor-pointer transition-all ${
                        selected ? "ring-2 ring-purple-500 bg-purple-50" : "hover:shadow-md"
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Icon className={`w-6 h-6 ${selected ? "text-purple-600" : "text-gray-600"}`} />
                          <Badge variant={selected ? "default" : "secondary"}>{dt.badge}</Badge>
                        </div>
                        <CardTitle className="text-lg">{dt.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-2">{dt.description}</CardDescription>
                        <p className="text-sm font-medium text-gray-600">{dt.slides}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* slide-count slider */}
              <div className="space-y-3">
                <Label>Target Slide Count: {formData.slideCount}</Label>
                <Slider
                  max={14}
                  min={5}
                  step={1}
                  value={[formData.slideCount]}
                  onValueChange={([val]) =>
                    setFormData(prev => ({ ...prev, slideCount: val }))
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" disabled={step === 1} onClick={handlePrevious}>
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!isStepValid()}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {step === totalSteps ? "Start Q&A Session" : "Next"}
        </Button>
      </div>
    </div>
  );
};

export default ProjectSetup;
