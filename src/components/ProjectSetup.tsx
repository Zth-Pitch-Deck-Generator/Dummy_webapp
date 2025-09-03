// src/components/ProjectSetup.tsx
import { useState } from "react"
import { ProjectData } from "@/pages/Index"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Briefcase, TrendingUp, Users, Database, Loader2 } from "lucide-react"

export type FormData = Omit<ProjectData, "revenue" | "decktype" | "deckSubtype"> & {
  revenue: "" | ProjectData["revenue"]
  decktype: "" | ProjectData["decktype"]
  deckSubtype: "" | ProjectData["deckSubtype"]
}

interface ProjectSetupProps {
  onComplete: (data: ProjectData, projectId: string) => void;
}

const rangeByDeck = {
  basic_pitch_deck: [8, 8],
  complete_pitch_deck: [12, 12],
  guided_dataroom: [12, 13],
  direct_dataroom: [12, 13],
} as const

const ProjectSetup = ({ onComplete }: ProjectSetupProps) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    projectName: "",
    industry: "",
    stage: "",
    revenue: "",
    description: "",
    slide_count: 8,
    slide_mode: "manual",
    decktype: "",
    deckSubtype: "",
  })
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 3

  const deckTypes = {
    "pitch-deck": [
        { id: "basic_pitch_deck", name: "Basic Pitch Deck", description: "Covers the core narrative in exactly 8 slides.", icon: Briefcase, badge: "Core Story", slides: "8 slides" },
        { id: "complete_pitch_deck", name: "Complete Pitch Deck", description: "The full version, covering all key areas in 12 slides.", icon: TrendingUp, badge: "Full Version", slides: "12 slides" },
    ],
    "dataroom": [
        { id: "guided_dataroom", name: "Guided Build", description: "For founders unsure which metrics to feature. We'll propose industry-relevant KPIs.", icon: Users, badge: "Guided", slides: "12-13 slides" },
        { id: "direct_dataroom", name: "Direct Build", description: "For founders who already track their KPIs and know which ones to include.", icon: Database, badge: "Direct", slides: "12-13 slides" },
    ]
  }

  const handleNext = async () => {
    if (step < totalSteps) return setStep(step + 1)

    setIsLoading(true);
    try {
      const apiPayload = {
        projectName: formData.projectName,
        industry: formData.industry,
        stage: formData.stage,
        revenue: formData.revenue,
        description: formData.description,
        slide_count: formData.slide_count,
        slide_mode: formData.slide_mode,
        decktype: formData.deckSubtype, 
      };
      
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "Project creation failed")
      }
      const { id } = await res.json()
      onComplete(formData as unknown as ProjectData, id)
    } catch (err: any) {
      console.error(err)
      alert(`Error creating project: ${err.message}`)
      setIsLoading(false);
    } 
  }

  const handlePrevious = () => step > 1 && setStep(step - 1)

  const isStepValid = () => {
    if (step === 1) return formData.projectName.trim() && formData.industry && formData.stage && formData.revenue;
    if (step === 2) return formData.description.trim();
    if (step === 3) {
        if (!formData.deckSubtype) return false;
        const [min, max] = rangeByDeck[formData.deckSubtype as keyof typeof rangeByDeck];
        return (formData.slide_mode === "ai" || (formData.slide_count >= min && formData.slide_count <= max));
    }
    return false;
  };

  const handleDeckTypeSelect = (type: 'pitch-deck' | 'dataroom') => {
    setFormData(prev => ({ ...prev, decktype: type, deckSubtype: "" }));
  }

  const handleDeckSubtypeSelect = (subtype: string) => {
    const [min] = rangeByDeck[subtype as keyof typeof rangeByDeck];
    setFormData((p) => ({
      ...p,
      deckSubtype: subtype as FormData["deckSubtype"],
      slide_mode: "manual",
      slide_count: min,
    }))
  }

  const handleSlideMode = (mode: "manual" | "ai") => {
    const selectedDeck = formData.deckSubtype;
    if (!selectedDeck) return
    const [min, max] = rangeByDeck[selectedDeck as keyof typeof rangeByDeck];
    if (mode === "ai") {
      const auto = Math.floor(Math.random() * (max - min + 1)) + min
      setFormData((p) => ({ ...p, slide_mode: "ai", slide_count: auto }))
    } else {
      setFormData((p) => ({ ...p, slide_mode: "manual", slide_count: min }))
    }
  }
  
  const selectedDeckKey = formData.deckSubtype;
  const [min, max] = selectedDeckKey ? rangeByDeck[selectedDeckKey as keyof typeof rangeByDeck] : [5, 14];

  const StepDots = () => (
    <div className="flex gap-3 justify-center mb-6">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded-full transition-colors ${
            i + 1 === step ? "bg-blue-600" : "bg-blue-200"
          }`}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f6faff] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-10 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight">
            Project Setup
          </h1>
          <Badge
            variant="secondary"
            className="text-sm py-1 px-3 rounded-full"
          >{`Step ${step} of ${totalSteps}`}</Badge>
        </div>

        <StepDots />

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Project Basics"}
              {step === 2 && "Project Description"}
              {step === 3 && "Choose Deck Type"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {step === 1 && "Let's start with some basic information about your project."}
              {step === 2 && "Tell us more about your project to get tailored questions."}
              {step === 3 && "Select the type of document you want to create."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label className="text-blue-700 font-semibold">Project Name *</Label>
                  <Input value={formData.projectName} onChange={(e) => setFormData((p) => ({ ...p, projectName: e.target.value }))} placeholder="Enter your project name" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-700 font-semibold">Industry / Field *</Label>
                  <Select value={formData.industry} onValueChange={(v) => setFormData((p) => ({ ...p, industry: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
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
                <div className="space-y-2">
                  <Label className="text-blue-700 font-semibold">Stage of Company *</Label>
                  <Select value={formData.stage} onValueChange={(v) => setFormData((p) => ({ ...p, stage: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select your stage" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-Seed (Ideation)</SelectItem>
                      <SelectItem value="seed">Seed (Ideation-development)</SelectItem>
                      <SelectItem value="series-a">Series A (Development)</SelectItem>
                      <SelectItem value="series-b">Series B (Growth)</SelectItem>
                      <SelectItem value="series-c">Series C (Expansion)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-700 font-semibold">Revenue Status *</Label>
                  <Select value={formData.revenue} onValueChange={(v) => setFormData((p) => ({ ...p, revenue: v as FormData["revenue"] }))}>
                    <SelectTrigger><SelectValue placeholder="Select revenue status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-revenue">Pre-Revenue</SelectItem>
                      <SelectItem value="revenue">Revenue-Generating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {step === 2 && (
              <div className="space-y-2">
                <Label className="text-blue-700 font-semibold">Project Description *</Label>
                <Textarea rows={6} placeholder="Describe your project, its goals, and target audience…" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} autoFocus />
                <p className="text-sm text-gray-500">This helps our AI generate more relevant questions for your pitch deck.</p>
              </div>
            )}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <Card onClick={() => handleDeckTypeSelect('pitch-deck')} className="cursor-pointer hover:shadow-lg transition-shadow" data-selected={formData.decktype === 'pitch-deck'}>
                            <CardHeader><CardTitle>Pitch Deck</CardTitle></CardHeader>
                            <CardContent><CardDescription>Create a compelling narrative to present to investors.</CardDescription></CardContent>
                        </Card>
                        {formData.decktype === 'pitch-deck' && (
                            <div className="pl-4 mt-4 space-y-4 border-l-2 border-gray-200">
                                <Label className="text-gray-500 font-semibold">SUBHEADINGS</Label>
                                <div className="grid md:grid-cols-2 gap-6 sm:grid-cols-1">
                                    {deckTypes["pitch-deck"].map((dt) => {
                                        const Icon = dt.icon
                                        const selected = formData.deckSubtype === dt.id
                                        return (
                                        <Card key={dt.id} data-selected={selected} onClick={() => handleDeckSubtypeSelect(dt.id)} className="cursor-pointer transition-all data-[selected=true]:ring-2 data-[selected=true]:ring-blue-500">
                                            <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <Icon className={`w-7 h-7 ${selected ? "text-blue-600" : "text-blue-400"} transition-colors`} />
                                                <Badge variant={selected ? "default" : "secondary"}>{dt.badge}</Badge>
                                            </div>
                                            <CardTitle className="text-lg">{dt.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                            <CardDescription className="mb-2">{dt.description}</CardDescription>
                                            <p className="text-sm font-medium text-gray-600">{dt.slides}</p>
                                            </CardContent>
                                        </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Card onClick={() => handleDeckTypeSelect('dataroom')} className="cursor-pointer hover:shadow-lg transition-shadow" data-selected={formData.decktype === 'dataroom'}>
                            <CardHeader><CardTitle>Dataroom</CardTitle></CardHeader>
                            <CardContent><CardDescription>Compile detailed metrics and data for due diligence.</CardDescription></CardContent>
                        </Card>
                        {formData.decktype === 'dataroom' && (
                             <div className="pl-4 mt-4 space-y-4 border-l-2 border-gray-200">
                                <Label className="text-gray-500 font-semibold">SUBHEADINGS</Label>
                                <div className="grid md:grid-cols-2 gap-6 sm:grid-cols-1">
                                    {deckTypes["dataroom"].map((dt) => {
                                        const Icon = dt.icon
                                        const selected = formData.deckSubtype === dt.id
                                        return (
                                        <Card key={dt.id} data-selected={selected} onClick={() => handleDeckSubtypeSelect(dt.id)} className="cursor-pointer transition-all data-[selected=true]:ring-2 data-[selected=true]:ring-blue-500">
                                            <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <Icon className={`w-7 h-7 ${selected ? "text-blue-600" : "text-blue-400"} transition-colors`} />
                                                <Badge variant={selected ? "default" : "secondary"}>{dt.badge}</Badge>
                                            </div>
                                            <CardTitle className="text-lg">{dt.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                            <CardDescription className="mb-2">{dt.description}</CardDescription>
                                            <p className="text-sm font-medium text-gray-600">{dt.slides}</p>
                                            </CardContent>
                                        </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {formData.deckSubtype && (
                        <div className="space-y-6 pt-6 border-t">
                            <div className="space-y-3">
                                <Label className="text-blue-700 font-semibold">Slide Count Preference *</Label>
                                <p className="text-sm text-gray-500 mb-2">Choose how you’d like to set the slide count:</p>
                                <Select value={formData.slide_mode} onValueChange={(v) => handleSlideMode(v as any)}>
                                    <SelectTrigger><SelectValue placeholder="Select preference" /></SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="manual">I'll choose the number of slides</SelectItem>
                                    <SelectItem value="ai">Let AI decide for me</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.slide_mode === "manual" && (
                            <div className="space-y-3">
                                <Label className="text-blue-700 font-semibold">Target Slide Count: {formData.slide_count}</Label>
                                <Slider min={min} max={max} step={1} value={[formData.slide_count]} onValueChange={([val]) => setFormData((p) => ({ ...p, slide_count: val }))} />
                            </div>
                            )}
                        </div>
                    )}
                </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-10">
          <Button variant="outline" disabled={step === 1} onClick={handlePrevious} size="default">Previous</Button>
          <Button onClick={handleNext} disabled={!isStepValid() || isLoading} size="default" type="button">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {step === totalSteps ? "Start Q&A Session" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProjectSetup;

