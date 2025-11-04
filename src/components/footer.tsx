'use client';

import Link from 'next/link';
import { Plane, Mail, Twitter, Github, Linkedin, MapPin, Instagram, Facebook, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
      {/* Background blur effects */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Plane className="w-8 h-8 text-white" />
              <span className="text-xl font-bold text-white">AI Travel Planner</span>
            </div>
            <p className="text-sm text-white/90">
              Discover your perfect journey with AI-powered personalized travel itineraries. 
              Plan smarter, travel better.
            </p>
            <div className="flex justify-between items-center pr-12">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                aria-label="Twitter"
              >
                <Twitter className="w-6 h-6" />
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                aria-label="Facebook"
              >
                <Facebook className="w-6 h-6" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-6 h-6" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white hover:scale-110 transition-all"
                aria-label="GitHub"
              >
                <Github className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-white/90 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#public-itineraries" className="text-sm text-white/90 hover:text-white transition-colors">
                  Explore Itineraries
                </Link>
              </li>
              <li>
                <Link href="/my-plans" className="text-sm text-white/90 hover:text-white transition-colors">
                  My Plans
                </Link>
              </li>
              <li>
                <Link href="/bucket-list" className="text-sm text-white/90 hover:text-white transition-colors">
                  Bucket List
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-sm text-white/90 hover:text-white transition-colors">
                  Travel Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="text-sm text-white/90 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-white/90 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-white/90 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-white/90 hover:text-white transition-colors">
                  Travel Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-white/90 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact & Legal</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <Mail className="w-4 h-4 mt-0.5 text-white/70 flex-shrink-0" />
                <a href="mailto:support@aitravelplanner.com" className="text-white/90 hover:text-white transition-colors">
                  support@aitravelplanner.com
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm text-white/90">
                <MapPin className="w-4 h-4 mt-0.5 text-white/70 flex-shrink-0" />
                <span>Global Service</span>
              </li>
            </ul>
            <ul className="space-y-2 mt-4">
              <li>
                <Link href="/privacy" className="text-sm text-white/90 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-white/90 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-white/90 hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/70">
              © {currentYear} AI Travel Planner. All rights reserved.
            </p>
            <p className="text-sm text-white/70 flex items-center gap-1.5">
              Powered by AI • Built with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for travelers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

