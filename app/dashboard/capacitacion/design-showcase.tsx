"use client";

import { useState } from "react";
import CapacitacionClientEnhanced from './CapacitacionClient-enhanced';
import CapacitacionClientModern from './CapacitacionClient-modern';
import CapacitacionClientMinimal from './CapacitacionClient-minimal';
import { Palette, Layout, Zap, Layers } from "lucide-react";

// Mock user and companies for demo
const mockUser = { email: "demo@company.com" };
const mockCompanies: any[] = [];

const designs = [
  {
    id: 'enhanced',
    name: 'Enhanced Professional',
    description: 'Rich gradients, stats dashboard, modern cards with hover effects',
    icon: Palette,
    features: [
      'Gradient backgrounds and overlays',
      'Statistics dashboard with KPIs',
      'Glassmorphism effects',
      'Smooth animations and transitions',
      'Professional color scheme'
    ],
    component: CapacitacionClientEnhanced
  },
  {
    id: 'modern',
    name: 'Modern Priority-Based',
    description: 'Priority-focused layout with grid/list toggle',
    icon: Layout,
    features: [
      'Priority-based module organization',
      'Grid/List view toggle',
      'Quick action buttons',
      'Clean typography',
      'Responsive grid system'
    ],
    component: CapacitacionClientModern
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Clean, minimalist design with focus on usability',
    icon: Zap,
    features: [
      'Minimalist aesthetic',
      'Category filtering',
      'Light typography',
      'Subtle borders and shadows',
      'Clean information hierarchy'
    ],
    component: CapacitacionClientMinimal
  }
];

export default function DesignShowcase() {
  const [selectedDesign, setSelectedDesign] = useState('enhanced');

  const SelectedComponent = designs.find(d => d.id === selectedDesign)?.component || CapacitacionClientEnhanced;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-3 mb-4">
            <Layers className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">Capacitación Dashboard Design Showcase</h1>
          </div>
          <p className="text-gray-600">
            Explore different design approaches for the capacitación module. Each design offers a unique visual style and user experience.
          </p>
        </div>
      </div>

      {/* Design Selector */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {designs.map((design) => {
              const Icon = design.icon;
              return (
                <button
                  key={design.id}
                  onClick={() => setSelectedDesign(design.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedDesign === design.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">{design.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 text-left mb-3">{design.description}</p>
                  <div className="space-y-1">
                    {design.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-xs text-gray-500">
                        <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3">
              <p className="text-sm font-medium">Preview: {designs.find(d => d.id === selectedDesign)?.name}</p>
            </div>
            <div className="transform scale-95 origin-top">
              <SelectedComponent user={mockUser} companies={mockCompanies} />
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Notes */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Implementation Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Enhanced Professional</h3>
              <p className="text-sm text-gray-600">
                Best for enterprise environments where visual impact and data visualization are important. 
                Uses modern gradients and comprehensive statistics.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Modern Priority-Based</h3>
              <p className="text-sm text-gray-600">
                Ideal for busy users who need quick access to high-priority tasks. 
                Features flexible view modes and clear action buttons.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Minimal Clean</h3>
              <p className="text-sm text-gray-600">
                Perfect for organizations that prefer simplicity and focus. 
                Clean design with excellent usability and minimal distractions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
