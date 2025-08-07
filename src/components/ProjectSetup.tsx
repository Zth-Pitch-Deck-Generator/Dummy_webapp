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
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Briefcase, TrendingUp, Users } from "lucide-react"

export type FormData = Omit<ProjectData, "revenue" | "decktype"> & {
  revenue: "" | ProjectData["revenue"]
  decktype: "" | ProjectData["decktype"]
}

interface ProjectSetupProps {
  onComplete: (data: ProjectData) => void
}

const rangeByDeck = {
  essentials: [5, 8],
  matrix: [7, 11],
  complete_deck: [10, 13],
} as const

const ProjectSetup = ({ onComplete }: ProjectSetupProps) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    projectName: "",
    industry: "",
    stage: "",
    revenue: "",
    description: "",
    slide_count: 5,
    slide_mode: "manual",
    decktype: "",
  })

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  const deckTypes = [
    {
      id: "essentials",
      name: "Essentials",
      description: "Perfect for initial presentations and team alignments",
      icon: Briefcase,
      badge: "Popular",
      slides: "5-8 slides",
    },
    {
      id: "matrix",
      name: "Matrix",
      description: "Comprehensive analysis for strategic planning",
      icon: TrendingUp,
      badge: "Detailed",
      slides: "7-11 slides",
    },
    {
      id: "complete_deck",
      name: "Complete Deck",
      description: "Presentations covering every aspect in depth",
      icon: Users,
      badge: "Professional",
      slides: "10-13 slides",
    },
  ] as const

  /* -------- navigation -------- */
  const handleNext = async () => {
    if (step < totalSteps) return setStep(step + 1)

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "Project creation failed")
      }
      const { id } = await res.json()
      localStorage.setItem("projectId", id)
      onComplete(formData as ProjectData)
    } catch (err: any) {
      console.error(err)
      alert(`Error creating project: ${err.message}`)
    }
  }

  const handlePrevious = () => step > 1 && setStep(step - 1)

  /* -------- validation -------- */
  const isStepValid = () => {
    if (step === 1) {
      return (
        formData.projectName.trim() &&
        formData.industry &&
        formData.stage &&
        formData.revenue
      )
    }
    if (step === 2) return formData.description.trim()

    if (step === 3) {
      const [min, max] = formData.decktype ? rangeByDeck[formData.decktype] : [0, 0]
      return (
        !!formData.decktype &&
        (formData.slide_mode === "ai" ||
          (formData.slide_count >= min && formData.slide_count <= max))
      )
    }
    return false
  }

  /* -------- handlers -------- */
  const handleDeckSelect = (deck: FormData["decktype"]) => {
    const [min] = rangeByDeck[deck]
    setFormData((p) => ({
      ...p,
      decktype: deck,
      slide_mode: "manual",
      slide_count: min,
    }))
  }

  const handleSlideMode = (mode: "manual" | "ai") => {
    if (!formData.decktype) return
    const [min, max] = rangeByDeck[formData.decktype]
    if (mode === "ai") {
      const auto = Math.floor(Math.random() * (max - min + 1)) + min
      setFormData((p) => ({ ...p, slide_mode: "ai", slide_count: auto }))
    } else {
      setFormData((p) => ({ ...p, slide_mode: "manual", slide_count: min }))
    }
  }

  const [min, max] = formData.decktype ? rangeByDeck[formData.decktype] : [5, 14]

  /* -------- Step Dots -------- */
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
        {/* Heading & Step Badge */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight">
            Project Setup
          </h1>
          <Badge
            variant="secondary"
            className="text-sm py-1 px-3 rounded-full"
          >{`Step ${step} of ${totalSteps}`}</Badge>
        </div>

        {/* Step Dots Stepper */}
        <StepDots />

        {/* Progress Bar */}
        <Progress value={progress} className="h-3 rounded-full mb-10" />

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Project Basics"}
              {step === 2 && "Project Description"}
              {step === 3 && "Choose Deck Type"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {step === 1 &&
                "Let's start with some basic information about your project"}
              {step === 2 &&
                "Tell us more about your project to get tailored questions"}
              {step === 3 && "Select a deck type that fits your presentation needs"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* ─────────── STEP 1 ─────────── */}
            {step === 1 && (
              <>
                {/* project name */}
                <div className="space-y-2">
                  <Label className="text-blue-700 font-semibold">
                    Project Name *
                  </Label>
                  <Input
                    value={formData.projectName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, projectName: e.target.value }))
                    }
                    placeholder="Enter your project name"
                    autoFocus
                  />
                </div>

                {/* industry */}
                <div className="space-y-2">
                  <Label className="text-blue-700 font-semibold">
                    Industry / Field *
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(v) => setFormData((p) => ({ ...p, industry: v }))}
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

                {/* stage */}
                <div className="space-y-2">
                  <Label className="text-blue-700 font-semibold">
                    Stage of Company *
                  </Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(v) => setFormData((p) => ({ ...p, stage: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your stage" />
                    </SelectTrigger>
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

                {/* revenue */}
                <div className="space-y-2">
                  <Label className="text-blue-700 font-semibold">
                    Revenue Status *
                  </Label>
                  <Select
                    value={formData.revenue}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, revenue: v as FormData["revenue"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select revenue status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-revenue">Pre-Revenue</SelectItem>
                      <SelectItem value="revenue">Revenue-Generating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ─────────── STEP 2 ─────────── */}
            {step === 2 && (
              <div className="space-y-2">
                <Label className="text-blue-700 font-semibold">Project Description *</Label>
                <Textarea
                  rows={6}
                  placeholder="Describe your project, its goals, and target audience…"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  autoFocus
                />
                <p className="text-sm text-gray-500">
                  This helps our AI generate more relevant questions for your pitch deck.
                </p>
              </div>
            )}

            {/* ─────────── STEP 3 ─────────── */}
            {step === 3 && (
              <>
                {/* deck type picker */}
                <div className="grid md:grid-cols-3 gap-6 sm:grid-cols-1">
                  {deckTypes.map((dt) => {
                    const Icon = dt.icon
                    const selected = formData.decktype === dt.id
                    return (
                      <Card
                        key={dt.id}
                        selected={selected}
                        onClick={() => handleDeckSelect(dt.id as any)}
                        className="cursor-pointer"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Icon
                              className={`w-7 h-7 ${
                                selected ? "text-blue-600" : "text-blue-400"
                              } transition-colors`}
                            />
                            <Badge variant={selected ? "default" : "secondary"}>
                              {dt.badge}
                            </Badge>
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

                {/* slide-count preference */}
                <div className="space-y-3 pt-6">
                  <Label className="text-blue-700 font-semibold">Slide Count Preference *</Label>
                  <p className="text-sm text-gray-500 mb-2">
                    Choose how you’d like to set the slide count:
                  </p>
                  <Select
                    disabled={!formData.decktype}
                    value={formData.slide_mode}
                    onValueChange={(v) => handleSlideMode(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">I'll choose the number of slides</SelectItem>
                      <SelectItem value="ai">Let AI decide for me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* slider – visible ONLY when manual mode is active */}
                {formData.decktype && formData.slide_mode === "manual" && (
                  <div className="space-y-3">
                    <Label className="text-blue-700 font-semibold">
                      Target Slide Count: {formData.slide_count}
                    </Label>
                    <Slider
                      min={min}
                      max={max}
                      step={1}
                      value={[formData.slide_count]}
                      onValueChange={([val]) =>
                        setFormData((p) => ({ ...p, slide_count: val }))
                      }
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* navigation buttons */}
        <div className="flex justify-between mt-10">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={handlePrevious}
            size="default"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
            size="default"
            type="button"
          >
            {step === totalSteps ? "Start Q&A Session" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProjectSetup
