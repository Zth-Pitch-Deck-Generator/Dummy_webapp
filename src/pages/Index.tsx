import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, FileText, Brain, BarChart3, ChevronRight, Palette, MessageSquare } from 'lucide-react';
import { Header } from '../components/Header.tsx';
import { useState, useEffect } from 'react'; 
import { supabase } from '../lib/supabase'; 
import { handleGoogleSignIn } from '../lib/auth'; 

export type ProjectData = {
  projectName: string;
  industry: string;
  stage: string;
  description: string;
  revenue: 'pre-revenue' | 'revenue';
  decktype: "pitch-deck" | "dataroom";
};

export interface QAData extends Array<{ question: string; answer: string }> {}

export interface GeneratedSlide {
    title: string;
    content: string;
    notes: string;
}
// --------------------------------------------------

const Index = () => {
    // ----------------------------------------------------
    // START: HOOKS AND AUTH LOGIC
    // ----------------------------------------------------
    const navigate = useNavigate(); 
    const [user, setUser] = useState<any>(null); 
    const [isLoading, setIsLoading] = useState(true); 

    // --- Session Checker and Listener ---
    useEffect(() => {
        // 1. Check the initial session status
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // 2. Set up a listener for real-time auth changes (sign in/out)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => {
            // Clean up the listener when the component unmounts
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // --- Conditional Redirect Handler (Used by all buttons) ---
    const handleAuthRedirect = () => {
        if (user) {
            // User is LOGGED IN, navigate directly to /create
            navigate('/create');
        } else {
            // User is LOGGED OUT, start the Google sign-in process
            handleGoogleSignIn('/create'); 
        }
    };
    // ----------------------------------------------------
    // END: HOOKS AND AUTH LOGIC

    return ( 
        <div className="min-h-screen bg-background">
            {/* Header: Pass the handler for the 'Get Started' button */}
            <Header handleAuthRedirect={handleAuthRedirect} />

            {/* Hero Section */}
            <section className="relative px-6 py-20 md:py-28 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/30 to-background"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/5 rounded-full blur-3xl animate-pulse"></div>

                <div className="container max-w-6xl mx-auto relative">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-background border border-border-strong shadow-sm text-text-secondary text-sm font-medium mb-8 animate-fade-in">
                            <div className="w-2 h-2 bg-success rounded-full mr-3 animate-pulse"></div>
                            <span className="font-semibold">Now available</span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-4xl md:text-5xl xl:text-6xl font-semibold text-text-primary mb-6 tracking-tight leading-[1.1] animate-fade-in [animation-delay:100ms]">
                            Professional pitch decks,
                            <br />
                            <span className="bg-gradient-to-r from-brand via-text-primary to-brand bg-clip-text text-transparent animate-fade-in [animation-delay:200ms]">
                                crafted by AI
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in [animation-delay:300ms]">
                            Create investor-ready presentations in minutes. Our AI guides you through intelligent questions
                            to build compelling narratives that resonate with your audience.
                        </p>

                        {/* --- HERO SECTION BUTTONS --- */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in [animation-delay:400ms]">
                            
                            {/* 1. Create Pitch Deck Button: Triggers Auth/Redirect */}
                            <Button 
                                size="lg" 
                                className="btn-primary group px-8 py-4 text-base font-semibold shadow-lg hover:shadow-xl w-full sm:w-auto" 
                                onClick={handleAuthRedirect} // <--- HANDLER APPLIED
                            >
                                Create Pitch Deck
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                            </Button>
                            
                            {/* 2. Dataroom (Disabled) - Unchanged */}
                            <Button size="lg" variant="outline" disabled className="w-full sm:w-auto">
                                Dataroom 
                            </Button>
                            
                            {/* 3. Investor Mock Room: Should still be a Link, but wrapped in a conditional Button if needed. */}
                            <Button asChild variant="ghost" className="text-text-secondary hover:text-text-primary font-medium">
                                <Link to={user ? "/investor-mock-room" : "/investor-mock-room"}>
                                    Investor Mock Room
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                            </Button>
                        </div>

                        {/* Visual Element (Mock Interface) */}
                        <div className="mt-20 relative animate-fade-in [animation-delay:500ms]">
                            <div className="max-w-6xl mx-auto">
                                <div className="relative bg-background border border-border-strong rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm">
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand/3 via-transparent to-brand/5"></div>

                                    {/* Mock Browser Bar */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                        </div>
                                        <div className="flex-1 max-w-sm mx-4">
                                            <div className="bg-background border border-border rounded-lg px-4 py-2 text-sm text-text-tertiary text-center">
                                                zth.ai/create
                                            </div>
                                        </div>
                                        <div className="w-20"></div>
                                    </div>

                                    {/* Mock Interface */}
                                    <div className="p-8 md:p-16 relative">
                                        <div className="space-y-8">
                                            {/* Header */}
                                            <div className="text-center mb-8">
                                                <div className="inline-flex items-center space-x-3 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg">
                                                        <Brain className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="h-4 bg-text-primary/20 rounded-lg w-32 mb-1"></div>
                                                        <div className="h-3 bg-text-secondary/30 rounded w-20"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Form Steps */}
                                            <div className="grid md:grid-cols-3 gap-6">
                                                <div className="bg-surface/80 border border-border rounded-xl p-6 transform hover:scale-[1.02] transition-transform duration-300">
                                                    <div className="flex items-center space-x-3 mb-4">
                                                        <div className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-semibold">1</div>
                                                        <div className="h-3 bg-text-primary/30 rounded w-20"></div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="h-8 bg-background border border-border rounded-lg"></div>
                                                        <div className="h-8 bg-background border border-border rounded-lg"></div>
                                                        <div className="h-6 bg-brand/20 rounded w-24"></div>
                                                    </div>
                                                </div>

                                                <div className="bg-brand/10 border border-brand/30 rounded-xl p-6 transform hover:scale-[1.02] transition-transform duration-300 shadow-lg">
                                                    <div className="flex items-center space-x-3 mb-4">
                                                        <div className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-semibold">2</div>
                                                        <div className="h-3 bg-brand/50 rounded w-20"></div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="h-20 bg-background/80 border border-brand/20 rounded-lg"></div>
                                                        <div className="h-6 bg-brand/30 rounded w-32"></div>
                                                    </div>
                                                </div>

                                                <div className="bg-surface/50 border border-border rounded-xl p-6 opacity-60">
                                                    <div className="flex items-center space-x-3 mb-4">
                                                        <div className="w-6 h-6 rounded-full bg-border text-text-tertiary text-xs flex items-center justify-center font-semibold">3</div>
                                                        <div className="h-3 bg-border rounded w-20"></div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="h-8 bg-border/50 rounded-lg"></div>
                                                        <div className="h-8 bg-border/50 rounded-lg"></div>
                                                        <div className="h-6 bg-border/30 rounded w-20"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mt-8">
                                                <div className="flex justify-center">
                                                    <div className="w-full max-w-md bg-surface rounded-full h-2">
                                                        <div className="bg-gradient-to-r from-brand to-brand/80 h-2 rounded-full w-2/3 transition-all duration-1000"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-32 bg-gradient-to-b from-surface/20 to-background relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_70%)]"></div>

                <div className="container mx-auto px-6 relative">
                    <div className="text-center mb-20">
                        <div className="inline-flex items-center space-x-2 bg-brand/10 border border-brand/20 rounded-full px-4 py-2 mb-6 animate-fade-in">
                            <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-brand">Trusted by founders</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-6 leading-tight animate-fade-in [animation-delay:200ms]">
                            Everything you need
                            <br />
                            <span className="text-brand">to win funding</span>
                        </h2>

                        <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed animate-fade-in [animation-delay:400ms]">
                            From AI-powered content generation to professional templates,
                            we've built the complete toolkit for creating investor-ready pitch decks
                        </p>
                    </div>

                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="group relative animate-fade-in [animation-delay:600ms]">
                                <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent rounded-3xl transform group-hover:scale-105 transition-transform duration-500 opacity-0 group-hover:opacity-100"></div>
                                <div className="relative bg-background/80 backdrop-blur-sm border border-border hover:border-brand/30 rounded-3xl p-10 hover:shadow-2xl transition-all duration-500 h-full">
                                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand to-brand/80 rounded-2xl mb-8 shadow-lg group-hover:shadow-brand/25 transition-shadow duration-300">
                                        <Brain className="w-8 h-8 text-white" />
                                    </div>

                                    <h3 className="text-2xl font-bold text-text-primary mb-4 group-hover:text-brand transition-colors duration-300">
                                        Smart Content Generation
                                    </h3>

                                    <p className="text-text-secondary leading-relaxed text-lg mb-6">
                                        Our AI understands your business model and generates compelling,
                                        investor-ready content that tells your unique story with precision.
                                    </p>

                                    <div className="flex items-center text-brand font-semibold group-hover:translate-x-2 transition-transform duration-300">
                                        <span className="text-sm">Learn more</span>
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </div>
                                </div>
                            </div>

                            <div className="group relative animate-fade-in [animation-delay:800ms]">
                                <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent rounded-3xl transform group-hover:scale-105 transition-transform duration-500 opacity-0 group-hover:opacity-100"></div>
                                <div className="relative bg-background/80 backdrop-blur-sm border border-border hover:border-brand/30 rounded-3xl p-10 hover:shadow-2xl transition-all duration-500 h-full">
                                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand to-brand/80 rounded-2xl mb-8 shadow-lg group-hover:shadow-brand/25 transition-shadow duration-300">
                                        <Palette className="w-8 h-8 text-white" />
                                    </div>

                                    <h3 className="text-2xl font-bold text-text-primary mb-4 group-hover:text-brand transition-colors duration-300">
                                        Professional Templates
                                    </h3>

                                    <p className="text-text-secondary leading-relaxed text-lg mb-6">
                                        Choose from our curated collection of proven templates used by
                                        successful startups that have raised over $500M in funding.
                                    </p>

                                    <div className="flex items-center text-brand font-semibold group-hover:translate-x-2 transition-transform duration-300">
                                        <span className="text-sm">Explore templates</span>
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </div>
                                </div>
                            </div>

                            <div className="group relative animate-fade-in [animation-delay:1000ms]">
                                <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent rounded-3xl transform group-hover:scale-105 transition-transform duration-500 opacity-0 group-hover:opacity-100"></div>
                                <div className="relative bg-background/80 backdrop-blur-sm border border-border hover:border-brand/30 rounded-3xl p-10 hover:shadow-2xl transition-all duration-500 h-full">
                                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand to-brand/80 rounded-2xl mb-8 shadow-lg group-hover:shadow-brand/25 transition-shadow duration-300">
                                        <MessageSquare className="w-8 h-8 text-white" />
                                    </div>

                                    <h3 className="text-2xl font-bold text-text-primary mb-4 group-hover:text-brand transition-colors duration-300">
                                        Interactive Q&A
                                    </h3>

                                    <p className="text-text-secondary leading-relaxed text-lg mb-6">
                                        Practice your pitch with AI-powered questions that simulate
                                        real investor conversations and comprehensive due diligence.
                                    </p>

                                    <div className="flex items-center text-brand font-semibold group-hover:translate-x-2 transition-transform duration-300">
                                        <span className="text-sm">Try Q&A</span>
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 bg-gradient-to-b from-background via-surface/10 to-brand/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_70%)]"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent"></div>

                <div className="container mx-auto px-6 text-center relative">
                    <div className="max-w-5xl mx-auto">
                        <div className="mb-8 animate-fade-in">
                            <div className="inline-flex items-center space-x-2 bg-brand/10 border border-brand/20 rounded-full px-5 py-2 mb-8">
                                <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
                                <span className="text-sm font-semibold text-brand">Join successful founders</span>
                            </div>
                        </div>

                        <h2 className="text-4xl md:text-6xl font-bold text-text-primary mb-8 leading-tight animate-fade-in [animation-delay:200ms]">
                            Ready to build your
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand/70">winning pitch deck?</span>
                        </h2>

                        <p className="text-xl md:text-2xl text-text-secondary mb-16 max-w-4xl mx-auto leading-relaxed animate-fade-in [animation-delay:400ms]">
                            Join hundreds of founders who've already raised funding with decks
                            created using our AI-powered platform
                        </p>

                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in [animation-delay:600ms]">
                            {/* Start building Button: Triggers Auth/Redirect */}
                            <Button 
                                size="lg" 
                                className="bg-brand hover:bg-brand/90 text-white px-16 py-8 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-brand/25 transition-all duration-500 hover:scale-105 hover:-translate-y-1 group"
                                onClick={handleAuthRedirect} // <--- HANDLER APPLIED
                            >
                                Start building
                                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                            </Button>

                            <div className="flex items-center space-x-2 text-text-tertiary text-lg">
                                <span>Free to try</span>
                                <div className="w-1 h-1 bg-text-tertiary rounded-full"></div>
                                <span>No credit card required</span>
                            </div>
                        </div>

                        {/* Trust Indicators */}
                        <div className="mt-20 animate-fade-in [animation-delay:800ms]">
                            <div className="flex flex-col md:flex-row justify-center items-center space-y-6 md:space-y-0 md:space-x-12 text-text-tertiary">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <span className="text-lg font-medium">500+ decks created</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    </div>
                                    <span className="text-lg font-medium">$50M+ funding raised</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    </div>
                                    <span className="text-lg font-medium">98% success rate</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        {/* Footer */}
<footer className="bg-[#111827] text-gray-300 border-t border-gray-700">
  <div className="max-w-7xl mx-auto px-6 py-14">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
      {/* Brand */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#2563eb] flex items-center justify-center text-white text-xl font-bold">
            Z
          </div>
          <span className="text-xl font-semibold text-white">Zth</span>
        </div>
       <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
  AI-powered pitch decks creation platform trusted by founders worldwide. Build investor-ready presentations in minutes, not weeks.
</p>


        {/* Social Links */}
        <div className="flex items-center space-x-3 mt-2">
          {/* X (Twitter) */}
          <a
            href="https://x.com/Zthsass"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="w-9 h-9 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-white"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/company/zth2/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="w-9 h-9 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.762 2.239 5 5 5h14c2.762 0 5-2.238 5-5v-14c0-2.761-2.238-5-5-5zm-7.5 19h-2.5v-7h2.5v7zm-1.25-8.12c-.83 0-1.5-.68-1.5-1.5s.67-1.5 1.5-1.5 1.5.68 1.5 1.5-.67 1.5-1.5 1.5zm9.75 8.12h-2.5v-3.73c0-.89-.02-2.04-1.25-2.04-1.25 0-1.44.97-1.44 1.98v3.79h-2.5v-7h2.4v.96h.03c.33-.63 1.15-1.29 2.36-1.29 2.52 0 2.99 1.66 2.99 3.82v3.51z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Contact */}
     <div>
  <h3 className="text-white font-semibold text-lg mb-4">Contact</h3>

  <p>
                              <a href="https://g.co/kgs/A1SD8fW" className="footer-link" target="_blank" rel="noopener noreferrer" style={{ color: '#60A5FA' }}>Headquarters</a>
                            </p>

  <p>
  <a
    href="/Zth Privacy Policy.pdf"
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: '#60A5FA' }}
  >
    <b>Privacy Policy</b>
  </a>
</p>

  <p className="text-base mt-3 text-gray-400">admin@zth.co.in</p>

  <a
        href="https://wa.me/917219422299"
        className="footer-link"
        aria-label="Chat with us on WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
         style={{ color: '#60A5FA' }}
      >
        +91 721 942 2299
      </a>
      <br/>

 <a
        href="https://wa.me/919356617639"
        className="footer-link"
        aria-label="Chat with us on WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
         style={{ color: '#60A5FA' }}
      >
        +91 93566 17639
      </a>
</div>

      {/* Resources */}
      <div>
  <h3 className="text-white font-semibold text-lg mb-4">Resources</h3>
  <ul className="space-y-2 text-base text-gray-400">
    <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">Documentation</a>
    </li>
    <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">Support</a>
    </li>
    <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">Guides</a>
    </li>
    <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">Blog</a>
    </li>
  </ul>
</div>

      {/* Products */}
        <div>
  <h3 className="text-white font-semibold text-lg mb-4">Products</h3>
  <ul className="space-y-2 text-base text-gray-400">
    <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">Zth Smart Engine Deck™</a>
    </li>
    <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">Features</a>
    </li>
    <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">Templates</a>
    </li>
    <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">AI Assistant</a>
    </li>
     <li>
      <a href="#" className="hover:text-blue-400 transition-colors duration-200">Pricing</a>
    </li>
  </ul>
</div>
     
    </div>

    {/* Bottom section */}
    <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm text-gray-500">
      <p>© 2025 Zth. Built with <span className="text-red-500">♥</span> for founders.</p>
      <p className="mt-1">AI-enhanced, founder-driven solutions for fundraising success.</p>
    </div>
  </div>
</footer>


        </div>
    );
};

export default Index;