import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { QASidebar } from './QASidebar';
import { QASessionState } from './types';
import { supabase } from '@/lib/supabase'; // <--- ADD THIS IMPORT

interface InteractiveQAProps {
  projectId: string;
  onComplete: () => void;
}

const InteractiveQA = ({ projectId, onComplete }: InteractiveQAProps) => {
  const [session, setSession] = useState<QASessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initial Fetch
  useEffect(() => {
    fetchSession();
  }, [projectId]);

  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? `Bearer ${data.session.access_token}` : '';
  };

  const fetchSession = async () => {
    try {
      const token = await getAuthHeader();
      // First try to get state, if 404 then start
      let res = await fetch(`/api/qa/state/${projectId}`, {
        headers: { 'Authorization': token }
      });
      
      if (res.status === 404) {
        res = await fetch('/api/qa/start', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token 
          },
          body: JSON.stringify({ projectId })
        });
      }

      if (!res.ok) throw new Error("Failed to fetch session");

      const data = await res.json();
      setSession(data);
    } catch (error) {
      console.error("Failed to load session", error);
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  // Sync Form State when Question Changes
  useEffect(() => {
    if (!session) return;
    const currentQ = session.sections[session.currentSectionIndex].questions[session.currentQuestionIndex];
    
    setValidationError(null);
    setOtherText('');
    
    if (currentQ.answer) {
      if (Array.isArray(currentQ.answer)) {
        // Multiple Choice
        setSelectedChoices(currentQ.answer);
      } else {
        // Free Text
        setTextAnswer(currentQ.answer as string);
      }
    } else {
      setTextAnswer('');
      setSelectedChoices([]);
    }
  }, [session?.currentSectionIndex, session?.currentQuestionIndex]);

  const handleJump = async (sectionIdx: number) => {
    if (!session) return;
    try {
      setLoading(true);
      const token = await getAuthHeader();
      const res = await fetch('/api/qa/jump', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({ projectId, sectionIndex: sectionIdx, questionIndex: 0 })
      });
      const data = await res.json();
      setSession(data);
    } catch (e) {
      toast.error("Navigation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    setValidationError(null);

    const currentSection = session.sections[session.currentSectionIndex];
    const currentQ = currentSection.questions[session.currentQuestionIndex];
    
    let finalAnswer: string | string[] = '';
    let isOther = false;

    if (currentQ.answerType === 'multiple_choice') {
      finalAnswer = [...selectedChoices];
      if (selectedChoices.includes('Other')) {
        isOther = true;
        if (!otherText.trim()) {
            setValidationError("Please specify your 'Other' option.");
            setSubmitting(false);
            return;
        }
        finalAnswer = finalAnswer.filter(c => c !== 'Other');
        finalAnswer.push(otherText);
      }
    } else {
      finalAnswer = textAnswer;
      if (!finalAnswer.trim()) {
        setValidationError("Please provide an answer.");
        setSubmitting(false);
        return;
      }
    }

    try {
      const token = await getAuthHeader();
      const res = await fetch('/api/qa/answer', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ projectId, answer: finalAnswer, isOther })
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.message) {
            setValidationError(data.message);
        } else {
            toast.error("Something went wrong");
        }
        return; 
      }

      setSession(data);
      
      // Check if completely done (Logic: last section completed)
      const lastSection = data.sections[data.sections.length - 1];
      if (lastSection.status === 'completed') {
        onComplete(); 
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleChoice = (choice: string) => {
    setSelectedChoices(prev => {
      if (prev.includes(choice)) return prev.filter(c => c !== choice);
      return [...prev, choice];
    });
  };

  if (loading || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500">Loading your session...</p>
      </div>
    );
  }

  const currentSection = session.sections[session.currentSectionIndex];
  const currentQ = currentSection.questions[session.currentQuestionIndex];

  return (
    <div className="flex h-full min-h-[80vh] bg-gray-50/30">
      {/* SIDEBAR */}
      <QASidebar 
        sections={session.sections} 
        currentSectionIndex={session.currentSectionIndex}
        onJump={handleJump}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 p-8 max-w-4xl mx-auto flex flex-col justify-center">
        <Card className="shadow-xl border-t-4 border-t-blue-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                {currentSection.name}
              </span>
              <span className="text-xs text-gray-400">
                Step {session.currentSectionIndex + 1} of {session.sections.length}
              </span>
            </div>
            <CardTitle className="text-2xl md:text-3xl text-gray-900 leading-tight">
              {currentQ.question}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {/* STATIC TOOLTIP */}
            {currentQ.tooltip && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{currentQ.tooltip}</p>
              </div>
            )}

            {/* INPUT AREA */}
            <div className="mt-4">
              {currentQ.answerType === 'multiple_choice' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {currentQ.choices?.map((choice) => (
                      <Button
                        key={choice}
                        type="button"
                        variant={selectedChoices.includes(choice) ? "default" : "outline"}
                        className={`h-auto py-3 px-6 text-base rounded-full transition-all ${
                          selectedChoices.includes(choice) 
                            ? "bg-blue-600 hover:bg-blue-700 shadow-md transform scale-105" 
                            : "hover:border-blue-300 hover:text-blue-600 bg-white"
                        }`}
                        onClick={() => toggleChoice(choice)}
                      >
                        {choice}
                      </Button>
                    ))}
                  </div>
                  
                  {/* OTHER INPUT */}
                  {selectedChoices.includes("Other") && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <Input 
                        placeholder="Please specify..." 
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        className="bg-white border-blue-200 focus:ring-blue-500 h-12 text-lg"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Textarea 
                  placeholder="Type your answer here..." 
                  className="min-h-[150px] text-lg p-4 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none shadow-inner"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                />
              )}
            </div>

            {/* ERROR MESSAGE */}
            {validationError && (
              <Alert variant="destructive" className="animate-in shake">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex justify-end pt-6 border-t bg-gray-50/50 rounded-b-xl">
             <Button 
               size="lg" 
               onClick={handleSubmit} 
               disabled={submitting}
               className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-8"
             >
               {submitting ? (
                 <Loader2 className="w-5 h-5 animate-spin mr-2" />
               ) : (
                 <>
                   Next <ArrowRight className="ml-2 w-5 h-5" />
                 </>
               )}
             </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default InteractiveQA;