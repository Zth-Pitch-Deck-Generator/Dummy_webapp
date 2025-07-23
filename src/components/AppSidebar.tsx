
import { ProjectData } from '@/pages/Index';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Settings, MessageSquare, Eye, FileText, CheckCircle, Circle } from 'lucide-react';

interface AppSidebarProps {
  currentStep: string;
  onStepChange: (step: 'setup' | 'qa' | 'preview') => void;
  projectData: ProjectData | null;
}

export function AppSidebar({ currentStep, onStepChange, projectData }: AppSidebarProps) {
  const steps = [
    {
      id: 'setup',
      title: 'Project Setup',
      icon: Settings,
      completed: !!projectData,
    },
    {
      id: 'qa',
      title: 'Interactive Q&A',
      icon: MessageSquare,
      completed: false,
      disabled: !projectData,
    },
    {
      id: 'outline',
      title: 'Outline',
      icon: FileText,
      completed: false,
      disabled: !projectData
    },
    {
      id: 'preview',
      title: 'Deck Preview',
      icon: Eye,
      completed: false,
      disabled: !projectData,
    },
  ];

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 w-8 h-8 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-lg">Pitch Deck Builder</h2>
        </div>
        {projectData && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{projectData.projectName}</p>
            <p className="text-xs text-gray-600">{projectData.industry}</p>
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Build Process</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const StatusIcon = step.completed ? CheckCircle : Circle;
                
                return (
                  <SidebarMenuItem key={step.id}>
                    <SidebarMenuButton
                      onClick={() => !step.disabled && onStepChange(step.id as any)}
                      className={`
                        ${isActive ? 'bg-purple-100 text-purple-900' : ''}
                        ${step.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      disabled={step.disabled}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1">{step.title}</span>
                      <StatusIcon 
                        className={`w-4 h-4 ${step.completed ? 'text-green-500' : 'text-gray-400'}`} 
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
