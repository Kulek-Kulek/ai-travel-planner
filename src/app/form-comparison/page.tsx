"use client";

/**
 * Form Comparison Demo Page
 * 
 * This page lets you test and compare all three form approaches:
 * 1. Current form (traditional)
 * 2. Smart form (regex extraction)
 * 3. AI-enhanced form (AI extraction)
 * 
 * Access at: http://localhost:3000/form-comparison
 */

import { useState } from "react";
import { ItineraryForm as CurrentForm } from "@/components/itinerary-form";
import { ItineraryForm as SmartForm } from "@/components/itinerary-form-smart";
import { ItineraryFormAIEnhanced } from "@/components/itinerary-form-ai-enhanced";
import type { ItineraryFormData } from "@/components/itinerary-form";

type FormVersion = "current" | "smart" | "ai";

export default function FormComparisonPage() {
  const [selectedForm, setSelectedForm] = useState<FormVersion>("smart");
  const [submittedData, setSubmittedData] = useState<ItineraryFormData | null>(null);

  const handleSubmit = (data: ItineraryFormData) => {
    console.log("Form submitted:", data);
    setSubmittedData(data);
    
    // Show success message
    alert(`Form submitted successfully!\n\nCheck the console and the panel below for details.`);
  };

  const formOptions: Array<{
    value: FormVersion;
    label: string;
    description: string;
    badge: string;
    badgeColor: string;
  }> = [
    {
      value: "current",
      label: "Current Form",
      description: "Traditional form with all fields visible",
      badge: "Baseline",
      badgeColor: "bg-slate-500",
    },
    {
      value: "smart",
      label: "Smart Form (Regex)",
      description: "Real-time extraction using regex patterns",
      badge: "Recommended",
      badgeColor: "bg-green-500",
    },
    {
      value: "ai",
      label: "AI-Enhanced Form",
      description: "AI-powered extraction with high accuracy",
      badge: "Premium",
      badgeColor: "bg-indigo-500",
    },
  ];

  const testCases = [
    {
      name: "Perfect Description",
      text: "Planning a 5-day trip to Barcelona for 2 adults. We love architecture, food, and want to visit the beaches. Looking for a mix of culture and relaxation.",
      expected: "Should extract: Barcelona, 5 days, 2 travelers",
    },
    {
      name: "Solo Trip",
      text: "Solo adventure in Tokyo for a week. I'm interested in temples, anime culture, and trying authentic ramen.",
      expected: "Should extract: Tokyo, 7 days, 1 traveler",
    },
    {
      name: "Family Trip",
      text: "Family of 4 (2 adults, 2 kids aged 8 and 12) visiting Orlando for 6 days. Kids love theme parks. We need wheelchair accessible accommodations.",
      expected: "Should extract: Orlando, 6 days, 2 travelers, 2 children, accessibility needs",
    },
    {
      name: "Vague Description",
      text: "Want to explore somewhere in Europe with beautiful architecture and good food.",
      expected: "Should require manual input for destination, days, and travelers",
    },
    {
      name: "Date-Based",
      text: "My partner and I are visiting Paris from March 15 to March 20. We're celebrating our anniversary and looking for romantic restaurants and cultural experiences.",
      expected: "Should extract: Paris, 5-6 days (calculated), 2 travelers, romantic style",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Form Comparison Demo
          </h1>
          <p className="mt-2 text-slate-600">
            Test and compare all three form approaches to choose the best one for your app
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Sidebar - Controls */}
          <div className="space-y-6 lg:col-span-3">
            {/* Form Selector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Select Form Version
              </h2>
              <div className="space-y-3">
                {formOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedForm(option.value)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedForm === option.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-indigo-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {option.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {option.description}
                        </div>
                      </div>
                      <span
                        className={`ml-2 rounded-full px-2 py-1 text-xs font-medium text-white ${option.badgeColor}`}
                      >
                        {option.badge}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Test Cases */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Test Cases
              </h2>
              <div className="space-y-3">
                {testCases.map((testCase, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-1 text-sm font-medium text-slate-900">
                      {testCase.name}
                    </div>
                    <div className="mb-2 text-xs text-slate-600">
                      {testCase.text}
                    </div>
                    <div className="text-xs text-indigo-600">
                      {testCase.expected}
                    </div>
                    <button
                      onClick={() => {
                        // Copy to clipboard
                        navigator.clipboard.writeText(testCase.text);
                        alert("Copied to clipboard! Paste it in the form textarea.");
                      }}
                      className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Copy text
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Form */}
          <div className="lg:col-span-9">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              {/* Current selection indicator */}
              <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                  <span className="text-sm font-medium text-indigo-900">
                    Now testing:{" "}
                    {formOptions.find((opt) => opt.value === selectedForm)?.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-indigo-700">
                  {formOptions.find((opt) => opt.value === selectedForm)?.description}
                </p>
              </div>

              {/* Render selected form */}
              {selectedForm === "current" && (
                <CurrentForm onSubmit={handleSubmit} isLoading={false} />
              )}
              {selectedForm === "smart" && (
                <SmartForm onSubmit={handleSubmit} isLoading={false} />
              )}
              {selectedForm === "ai" && (
                <ItineraryFormAIEnhanced onSubmit={handleSubmit} isLoading={false} />
              )}
            </div>

            {/* Submitted Data Display */}
            {submittedData && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-green-900">
                  ✅ Form Submitted Successfully
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-green-900">Destination:</span>{" "}
                    <span className="text-green-700">{submittedData.destination}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-900">Days:</span>{" "}
                    <span className="text-green-700">{submittedData.days}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-900">Travelers:</span>{" "}
                    <span className="text-green-700">{submittedData.travelers}</span>
                  </div>
                  {submittedData.children && (
                    <div>
                      <span className="font-medium text-green-900">Children:</span>{" "}
                      <span className="text-green-700">{submittedData.children}</span>
                    </div>
                  )}
                  {submittedData.hasAccessibilityNeeds && (
                    <div>
                      <span className="font-medium text-green-900">Accessibility:</span>{" "}
                      <span className="text-green-700">Yes</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-green-900">AI Model:</span>{" "}
                    <span className="text-green-700">{submittedData.model}</span>
                  </div>
                  {submittedData.notes && (
                    <div>
                      <span className="font-medium text-green-900">Description:</span>
                      <div className="mt-1 rounded-lg bg-white p-3 text-green-700">
                        {submittedData.notes}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSubmittedData(null)}
                  className="mt-4 text-sm text-green-600 hover:text-green-700 underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comparison Info */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Quick Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left font-semibold text-slate-900">
                    Feature
                  </th>
                  <th className="pb-3 text-center font-semibold text-slate-900">
                    Current Form
                  </th>
                  <th className="pb-3 text-center font-semibold text-slate-900">
                    Smart Form (Regex)
                  </th>
                  <th className="pb-3 text-center font-semibold text-slate-900">
                    AI-Enhanced
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 text-slate-700">API Costs</td>
                  <td className="py-3 text-center">❌ None</td>
                  <td className="py-3 text-center">❌ None</td>
                  <td className="py-3 text-center">⚠️ ~$0.002/extraction</td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700">Extraction Speed</td>
                  <td className="py-3 text-center">⚡ Instant</td>
                  <td className="py-3 text-center">⚡ Instant</td>
                  <td className="py-3 text-center">⏱️ 1-2 seconds</td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700">Accuracy</td>
                  <td className="py-3 text-center">✅ 100% (manual)</td>
                  <td className="py-3 text-center">🟨 70-80%</td>
                  <td className="py-3 text-center">✅ 95%+</td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700">User Experience</td>
                  <td className="py-3 text-center">🟨 Basic</td>
                  <td className="py-3 text-center">✅ Great</td>
                  <td className="py-3 text-center">✅ Amazing</td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700">Maintenance</td>
                  <td className="py-3 text-center">✅ Low</td>
                  <td className="py-3 text-center">🟨 Medium</td>
                  <td className="py-3 text-center">✅ Low</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

