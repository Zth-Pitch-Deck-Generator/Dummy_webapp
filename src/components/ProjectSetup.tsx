
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
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    projectName: '',
    industry: '',
    description: '',
    slideCount: 12,
    template: 'essentials' as ProjectData['template'],
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const templates = [
    {
      id: 'essentials',
      name: 'Essentials',
      description: 'Perfect for initial presentations and team alignments',
      icon: Briefcase,
      badge: 'Popular',
      slides: '8-12 slides',
    },
    {
      id: 'matrix',
      name: 'Matrix',
      description: 'Comprehensive analysis for strategic planning',
      icon: TrendingUp,
      badge: 'Detailed',
      slides: '12-18 slides',
    },
    {
      id: 'investor',
      name: 'Investor',
      description: 'Investor-ready presentations with financial focus',
      icon: Users,
      badge: 'Professional',
      slides: '15-20 slides',
    },
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(formData);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.projectName.trim() !== '' && formData.industry.trim() !== '';
      case 2:
        return formData.description.trim() !== '';
      case 3:
        return formData.template !== '';
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Project Setup</h1>
          <Badge variant="outline" className="text-sm">
            Step {step} of {totalSteps}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">
            {step === 1 && "Project Basics"}
            {step === 2 && "Project Description"}
            {step === 3 && "Choose Template"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Let's start with some basic information about your project"}
            {step === 2 && "Tell us more about your project to get tailored questions"}
            {step === 3 && "Select a template that best fits your presentation needs"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="Enter your project name"
                  value={formData.projectName}
                  onChange={(e) => setFormData(prev => ({...prev, projectName: e.target.value}))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="industry">Industry/Field *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData(prev => ({...prev, industry: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label htmlFor="description">Project Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your project, its goals, and target audience..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                rows={6}
              />
              <p className="text-sm text-gray-600">
                This helps our AI generate more relevant questions for your pitch deck.
              </p>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                {templates.map((template) => {
                  const Icon = template.icon;
                  const isSelected = formData.template === template.id;
                  
                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                      }`}
                      onClick={() => setFormData(prev => ({...prev, template: template.id as ProjectData['template']}))}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-purple-600' : 'text-gray-600'}`} />
                          <Badge variant={isSelected ? 'default' : 'secondary'}>
                            {template.badge}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-2">
                          {template.description}
                        </CardDescription>
                        <p className="text-sm font-medium text-gray-600">
                          {template.slides}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="space-y-3">
                <Label>Target Slide Count: {formData.slideCount}</Label>
                <Slider
                  value={[formData.slideCount]}
                  onValueChange={(value) => setFormData(prev => ({...prev, slideCount: value[0]}))}
                  max={25}
                  min={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>5 slides</span>
                  <span>25 slides</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={step === 1}
        >
          Previous
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!isStepValid()}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {step === totalSteps ? 'Start Q&A Session' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default ProjectSetup;
