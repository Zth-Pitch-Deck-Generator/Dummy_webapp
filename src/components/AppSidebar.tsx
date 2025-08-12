import * as React from 'react';
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
import { Settings, MessageSquare, Eye, FileText, CheckCircle, Circle, Presentation } from 'lucide-react';

interface AppSidebarProps {
  currentStep: string;
  onStepChange: (step: 'setup' | 'qa' | 'outline' | 'template' | 'preview') => void;
  projectData: ProjectData | null;
  qaDone: boolean;
  outlineDone: boolean;
}

export function AppSidebar({ currentStep, onStepChange, projectData, qaDone, outlineDone }: AppSidebarProps) {
  const [templateSelected, setTemplateSelected] = React.useState(false);

  React.useEffect(() => {
    if (currentStep === 'preview') {
      setTemplateSelected(true);
    }
  }, [currentStep]);

  const steps = [
    { id: 'setup', title: 'Project Setup', icon: Settings, completed: !!projectData },
    { id: 'qa', title: 'Interactive Q&A', icon: MessageSquare, completed: qaDone, disabled: !projectData },
    { id: 'outline', title: 'Outline', icon: FileText, completed: outlineDone, disabled: !qaDone },
    { id: 'template', title: 'Template', icon: Eye, completed: templateSelected, disabled: !outlineDone },
    { id: 'preview', title: 'Deck Preview', icon: Presentation, completed: false, disabled: !templateSelected },
  ];

  return (
    <Sidebar className="bg-white border-r border-gray-200">
      <SidebarHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <img src="/icons/logo.png" alt="Smart Engine Logo" className="w-12 h-12" />
          <h2 className="font-bold text-xl text-gray-800">Smart Engine Deck Generator</h2>
        </div>
        {projectData && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700">{projectData.projectName}</p>
            <p className="text-xs text-gray-500">{projectData.industry}</p>
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-1 text-xs font-bold uppercase text-gray-400 tracking-wider">
            Build Process
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-1 space-y-2">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const StatusIcon = step.completed ? CheckCircle : Circle;
                
                return (
                  <SidebarMenuItem key={step.id}>
                    <SidebarMenuButton
                      onClick={() => !step.disabled && onStepChange(step.id as any)}
                      className={`
                        group flex items-center w-full text-left gap-x-3 p-3 rounded-lg transition-all duration-200
                        ${isActive 
                          ? 'bg-[hsl(214,100%,50%)] text-white shadow-md hover:shadow-lg hover:bg-[hsla(214,100%,78%,1.00)] hover:text-gray-900'
                          : step.disabled 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-500 hover:bg-white hover:shadow-md hover:text-gray-900'
                        }
                      `}
                      disabled={step.disabled}
                    >
                      <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-white group-hover:text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span className="flex-1 text-base font-medium">{step.title}</span>
                      <StatusIcon 
                        className={`w-5 h-5 transition-colors duration-200 ${step.completed ? 'text-green-500' : (isActive ? 'text-blue-200 group-hover:text-blue-900' : 'text-gray-300')}`} 
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