// src/pages/Index.tsx
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, FileText, Brain, BarChart3, ChevronRight, Palette, MessageSquare } from 'lucide-react';
import { Header } from '../components/Header.tsx';

export type ProjectData = {
  projectName: string;
  industry: string;
  stage: string;
  description: string;
  revenue: 'pre-revenue' | 'revenue';
  decktype: "pitch-deck" | "dataroom";
  deckSubtype: "basic_pitch_deck" | "complete_pitch_deck" | "guided_dataroom" | "direct_dataroom";
};

export interface QAData extends Array<{ question: string; answer: string }> {}

export interface GeneratedSlide {
    title: string;
    content: string;
    notes: string;
}

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

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

            {/* --- THE FIX: Replaced single button with two options --- */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in [animation-delay:400ms]">
              <Link to="/create" state={{ flowType: 'pitch-deck' }}>
                <Button size="lg" className="btn-primary group px-8 py-4 text-base font-semibold shadow-lg hover:shadow-xl w-full sm:w-auto">
                    Create Pitch Deck
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" disabled className="w-full sm:w-auto">
                Dataroom 
              </Button>
              <Button asChild variant="ghost" className="text-text-secondary hover:text-text-primary font-medium">
                <Link to="/investor-mock-room">
                  Investor Mock Room
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Visual Element */}
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
      </section>

      {/* Features Section */}
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
              <Link to="/project-setup">
                <Button size="lg" className="bg-brand hover:bg-brand/90 text-white px-16 py-8 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-brand/25 transition-all duration-500 hover:scale-105 hover:-translate-y-1 group">
                  Start building
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

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
      <footer className="border-t border-border/50 bg-gradient-to-b from-surface/30 to-background relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        <div className="container max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row justify-between items-start space-y-12 lg:space-y-0">
            {/* Brand */}
            <div className="flex-1 max-w-md">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg">
                  <img src="/logo.png" alt="ZTH Logo" className="w-6 h-6" />
                </div>
                <span className="text-2xl font-bold text-text-primary">ZTH</span>
              </div>
              <p className="text-text-secondary leading-relaxed text-lg">
                AI-powered pitch deck creation platform trusted by founders worldwide.
                Build investor-ready presentations in minutes, not weeks.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex flex-col md:flex-row space-y-8 md:space-y-0 md:space-x-16">
              <div>
                <h4 className="text-text-primary font-semibold text-lg mb-4">Product</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Features</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Templates</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">AI Assistant</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Pricing</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-text-primary font-semibold text-lg mb-4">Resources</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Documentation</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Guides</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Blog</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Support</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-text-primary font-semibold text-lg mb-4">Company</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">About</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Privacy</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Terms</a></li>
                  <li><a href="#" className="text-text-tertiary hover:text-brand transition-colors duration-300">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-border/50 mt-16 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-text-tertiary text-sm">
                © 2025 ZTH. All rights reserved.
              </p>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-text-tertiary text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>All systems operational</span>
                </div>

                <div className="flex items-center space-x-4">
                  <a href="#" className="text-text-tertiary hover:text-brand transition-colors p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                  <a href="#" className="text-text-tertiary hover:text-brand transition-colors p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
