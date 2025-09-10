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
    <Sidebar className="bg-surface border-r border-border">
      <SidebarHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ZTH Logo" className="w-12 h-12" />
          <div>
            <h2 className="font-semibold text-lg text-text-primary">ZTH</h2>
            <p className="text-xs text-text-tertiary font-light">AI-powered presentations</p>
          </div>
        </div>
        {projectData && (
          <div className="mt-6 p-4 bg-background rounded-lg border border-border">
            <p className="text-sm font-medium text-text-primary">{projectData.projectName}</p>
            <p className="text-xs text-text-secondary capitalize">{projectData.industry}</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium uppercase text-text-tertiary tracking-wider mb-3">
            Build Process
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
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
                          ? 'bg-brand text-text-inverse shadow-sm'
                          : step.disabled
                            ? 'text-text-tertiary cursor-not-allowed'
                            : 'text-text-secondary hover:bg-background hover:text-text-primary'
                        }
                      `}
                      disabled={step.disabled}
                    >
                      <div className={`icon-container icon-container-sm ${
                        isActive
                          ? 'bg-text-inverse/20 text-text-inverse'
                          : step.disabled
                            ? 'bg-surface text-text-tertiary'
                            : 'bg-surface text-text-secondary group-hover:text-text-primary'
                      } transition-colors duration-200`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="flex-1 text-sm font-medium">{step.title}</span>
                      <StatusIcon
                        className={`w-4 h-4 transition-colors duration-200 ${
                          step.completed
                            ? 'text-success'
                            : isActive
                              ? 'text-text-inverse/60'
                              : 'text-text-tertiary'
                        }`}
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