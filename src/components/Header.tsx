import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="ZTH Logo" className="w-8 h-8" />
          <span className="text-lg font-semibold text-text-primary">ZTH</span>
        </div>
        <div className="flex items-center space-x-8">
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">Features</a>
            <a href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">Pricing</a>
            <a href="#about" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">About</a>
          </nav>
          <Button asChild className="btn-primary">
            <Link to="/create">
              Get Started
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
