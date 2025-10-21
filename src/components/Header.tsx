import { useState, useEffect} from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function Header({handleAuthRedirect}: {handleAuthRedirect: () => void}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#about", label: "About" },
  ];

  return (
    <header className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <img src="/logo.png" alt="ZTH Logo" className="w-8 h-8" />
          <span className="text-lg font-semibold text-text-primary">ZTH</span>
        </Link>
        <div className="flex items-center space-x-4">
          {/* Desktop Navigation */}
          {/* <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav> */}

          {/* CTA Button */}
          <div className="hidden sm:block">
            <Button asChild className="btn-primary" onClick={handleAuthRedirect}>
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-xl border-t border-border">
          <nav className="flex flex-col items-center space-y-4 py-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors text-lg"
              >
                {link.label}
              </a>
            ))}
            <Button className="btn-primary w-3/4 mt-4"
              onClick={() => {
              setIsMenuOpen(false);
              handleAuthRedirect();
            }}
              >
                Get Started
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}