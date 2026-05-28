"use client";

// ============================================================
// IMPORTS
// ============================================================

// React hooks:
// - useState: manages local component state (modal visibility, etc.)
// - useEffect: runs side effects after render (event listeners, modal trigger)
// - useMemo: memoises derived values to avoid recomputation on every render
import { useState, useEffect, useMemo } from "react";

// Recharts components used to render the interactive radar chart in the UI.
// Note: Area chart imports have been intentionally removed; only radar chart
// components are used in this file.
//
// - RadarChart:       Root container for radar (spider) charts
// - Radar:            Defines one data series drawn on the radar chart
// - PolarGrid:        Renders the concentric grid lines behind the chart
// - PolarAngleAxis:   Labels around the outside of the radar (domain names)
// - PolarRadiusAxis:  Numeric scale drawn along one radial axis
// - Legend:           Key showing what each coloured series represents
// - ResponsiveContainer: Makes the chart resize with its parent element
// - RechartsTooltip:  Popup that appears when hovering over chart data points
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

// PDF generation libraries:
// - jsPDF:       Creates a new PDF document and provides drawing/text primitives
// - autoTable:   jsPDF plugin that renders structured tables into the PDF
// NOTE: html2canvas was previously imported but is not used; it has been removed.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable"; // patches jsPDF prototype so lastAutoTable is typed correctly

// Shadcn/ui component library — pre-built, accessible UI primitives:
// - Card / CardContent / CardHeader / CardTitle: container cards with consistent styling
// - Button: accessible button with multiple style variants
// - Alert / AlertDescription: dismissible informational banners
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Lucide React icon set — each icon is paired with a specific assessment category
// or UI action for quick visual recognition:
// - Info:          Info banner icon
// - Brain:         Memory & Orientation category
// - Wrench:        Everyday Skills category
// - User:          Self Care category
// - AlertCircle:   Abnormal Behaviour category
// - Heart:         Mood category
// - Eye:           Beliefs category
// - Utensils:      Eating Habits category
// - Moon:          Sleep category
// - RotateCw:      Stereotypic & Motor Behaviours category
// - Target:        Motivation category
// - FileText:      "Export to PDF" button
// - BarChart3:     Domain Summary accordion header
// - ClipboardList: Item Scores accordion header
// - Activity:      Distribution Plots accordion header
import { Info, Brain, Wrench, User, AlertCircle, Heart, Eye, Utensils, Moon, RotateCw, Target, FileText, BarChart3, ClipboardList, Activity} from "lucide-react";

// Shadcn/ui form and layout components:
// - Label:       Accessible <label> wrapper for form inputs
// - Tabs:        Tab strip container with keyboard navigation support
// - TabsContent: Panel shown when a tab is active
// - TabsList:    The row of tab trigger buttons
// - TabsTrigger: Individual clickable tab button
// - Accordion:   Collapsible section container for the results report
// - AccordionContent: The body revealed when an accordion item is open
// - AccordionItem:    A single collapsible section within the accordion
// - AccordionTrigger: The clickable header that toggles an accordion item
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Next.js <Link> component for client-side navigation (used for the About page link)
import Link from "next/link";

// Project-specific components and React context hooks:
// - TermsModal:              Modal that prompts the user to accept Terms & Conditions
// - useSetPatientScores:     Setter from PatientScoresContext — stores percentage scores
//                            so the Report tab can access them independently
// - useTerms:                Provides hasAcceptedTerms flag and acceptTerms() action
// - useAssessmentScores:     Provides the per-item scores record, its setter, and
//                            the isSubmitted flag with its setter
// - cohortData:              Reference dataset (dementia & non-dementia participants)
//                            used to render KDE distribution plots
// - domains:                 Array of { key, label } objects that map score keys
//                            to human-readable domain names for the plots
import { TermsModal } from "@/components/TermsModal";
import { useSetPatientScores, useSetPatientMinimumData, type PatientMinimumData, type PatientScores } from "@/contexts/PatientScoresContext";
import { useTerms } from "@/contexts/TermsContext";
import { useAssessmentScores } from "@/contexts/AssessmentScoresContext";
import { cohortData, domains } from "@/processed_json/cohortData";

// ============================================================
// TYPES
// ============================================================

/**
 * Represents a single participant record in the reference cohort dataset.
 * All domain score properties are numeric (raw scores, not percentages).
 */
interface CohortEntry {
  diagnosisGroup: "Dementia" | "Non-dementia";
  memoryOrientation: number;
  everydaySkills: number;
  selfCare: number;
  abnormalBehaviour: number;
  mood: number;
  beliefs: number;
  eatingHabits: number;
  sleep: number;
  stereotypicMotor: number;
  motivation: number;
}

/**
 * A single CBI-R assessment domain with its runtime-computed scoring status.
 * Derived from the static `categories` array by adding score fields and index.
 */
interface CategoryWithStatus {
  title: string;
  icon: React.ElementType;
  items: string[];
  index: number;
  isComplete: boolean;
  hasMinimumData: boolean;
  score: number;
  maxScore: number;
  startingNumber: number;
}

/**
 * Props for the DistributionPlot sub-component.
 *
 * @property domain              - The domain being plotted (key used to look up
 *                                 cohort data, label shown below the SVG)
 * @property idx                 - Zero-based index of this domain (0–9), used to
 *                                 select a colour palette from the predefined list
 * @property category            - Full category descriptor including the patient's
 *                                 raw score, max score, and completion status
 * @property patientPercentage   - Patient's score expressed as a % of the max score;
 *                                 drives the position of the "Current patient" marker
 * @property thresholdPercentage - Normative threshold expressed as a % of the max
 *                                 score; drives the red dashed threshold line
 * @property calculateDensity    - KDE function (defined in the parent) that converts
 *                                 an array of raw scores into (x, density) pairs
 * @property cohortData          - Full reference cohort array passed down so the
 *                                 component doesn't need its own import.
 */
interface DistributionPlotProps {
  domain: { key: string; label: string };
  idx: number;
  category: CategoryWithStatus;
  patientPercentage: number;
  thresholdPercentage: number;
  calculateDensity: (
    values: number[],
    bandwidth?: number
  ) => { x: number; density: number }[];
  cohortData: CohortEntry[];
}

// ============================================================
// MODULE-LEVEL PRECOMPUTED COHORT DATA
// ============================================================

/**
 * precomputedCohortArrays
 *
 * Extracts and cleans the raw score arrays for each domain from the static
 * cohort dataset once at module load time. Since cohortData never changes
 * at runtime, there is no need to re-filter it on every render or every
 * call to calculateDensity.
 *
 * Shape: { [domainKey]: { controlRaw: number[]; dementiaRaw: number[] } }
 *
 * These arrays are consumed by:
 *   - The DistributionPlot component (via the calculateDensity prop)
 *   - The drawDistributionPlotsToPDF PDF helper
 */
const precomputedCohortArrays = domains.reduce(
  (acc, domain) => {
    const controlRaw = (cohortData as CohortEntry[])
      .filter((d) => d.diagnosisGroup === "Non-dementia")
      .map((d) => d[domain.key as keyof CohortEntry] as number)
      .filter((v) => !isNaN(v) && v >= 0);

    const dementiaRaw = (cohortData as CohortEntry[])
      .filter((d) => d.diagnosisGroup === "Dementia")
      .map((d) => d[domain.key as keyof CohortEntry] as number)
      .filter((v) => !isNaN(v) && v >= 0);

    acc[domain.key] = { controlRaw, dementiaRaw };
    return acc;
  },
  {} as Record<string, { controlRaw: number[]; dementiaRaw: number[] }>
);

// ============================================================
// DISTRIBUTION PLOT COMPONENT
// ============================================================

/**
 * DistributionPlot
 *
 * Renders a single "butterfly" (mirrored) KDE distribution SVG for one CBI-R domain.
 *
 * Layout (within the SVG viewBox 0 0 400 85):
 *   - The control (non-dementia) distribution fills the area ABOVE the horizontal
 *     centreline (y = 50), giving the chart its upper "wing".
 *   - The dementia distribution fills the area BELOW the centreline, giving the
 *     lower "wing".
 *   - A red dashed vertical line marks the normative threshold score position.
 *   - A solid black vertical line with a "Current patient" label marks the
 *     patient's score (only rendered once the category is fully complete).
 *
 * Colour palettes cycle through 5 options (idx % 5) so that adjacent domains
 * are visually distinct even with 10 total domains.
 */
const DistributionPlot = ({
  domain,
  idx,
  category,
  patientPercentage,
  thresholdPercentage,
  calculateDensity,
  cohortData,
}: DistributionPlotProps) => {
  // Single blue palette matching the radar chart (#3b82f6).
  // Control (above the line) uses a lighter tint; dementia (below) uses the full blue.
  const colors = {
    control: "#93c5fd",        // blue-300
    controlStroke: "#60a5fa",  // blue-400
    dementia: "#3b82f6",       // blue-500 — matches radar Patient Score
    dementiaStroke: "#2563eb", // blue-600
  };

  // --- Extract and clean score arrays from the reference cohort ---
  // Use the precomputed arrays from module level instead of filtering cohortData
  // on every render. The cohortData prop is kept for API compatibility but the
  // precomputed arrays are preferred when the domain key is available.
  const { controlRaw, dementiaRaw } =
    precomputedCohortArrays[domain.key] ?? {
      // Fallback: filter inline if the domain key is somehow not precomputed
      controlRaw: (cohortData as CohortEntry[])
        .filter((d) => d.diagnosisGroup === "Non-dementia")
        .map((d) => d[domain.key as keyof CohortEntry] as number)
        .filter((v) => !isNaN(v) && v >= 0),
      dementiaRaw: (cohortData as CohortEntry[])
        .filter((d) => d.diagnosisGroup === "Dementia")
        .map((d) => d[domain.key as keyof CohortEntry] as number)
        .filter((v) => !isNaN(v) && v >= 0),
    };

  // Run kernel density estimation with bandwidth = 5 for both groups.
  // Returns arrays of { x: 0–100, density: number } used to draw the paths.
  const controlDensity = calculateDensity(controlRaw, 5);
  const dementiaDensity = calculateDensity(dementiaRaw, 5);

  // Normalise both distributions to the same peak height so the two wings are
  // visually comparable. The small fallback (0.0001) prevents division by zero.
  const maxDensity = Math.max(
    ...controlDensity.map((d) => d.density),
    ...dementiaDensity.map((d) => d.density),
    0.0001
  );

  /**
   * Converts a KDE density array into an SVG <path> `d` string that forms a
   * filled polygon anchored to the horizontal centreline (y = 50).
   *
   * Coordinate mapping:
   *   - Higher scores appear on the RIGHT of the chart.
   *   - y-axis: for the control group (isTop = true) density pushes UP from y=50;
   *             for the dementia group (isTop = false) density pushes DOWN.
   *
   * @param densityData - Array of { x, density } from calculateDensity()
   * @param isTop       - true → control (above centreline); false → dementia (below)
   */
  const createPath = (
  densityData: { x: number; density: number }[],
  isTop: boolean
  ) => {
    const points = densityData.map((d) => {
      // Map percentage (0–100) to SVG x coordinate (10 → 390, standard)
      const x = 10 + (d.x / 100) * 380;
      const densityHeight = (d.density / maxDensity) * 35;
      const y = isTop ? 50 - densityHeight : 50 + densityHeight;
      return `${x},${y}`;
    });
    return `M ${points.join(" L ")} L 390,50 L 10,50 Z`;
  };

  return (
    <div className={`bg-white p-2 rounded border border-slate-200 ${!category.hasMinimumData ? "grayscale opacity-50" : ""}`}>
      {/*
       * SVG viewBox: 400 × 85 units.
       * preserveAspectRatio="xMidYMid meet" keeps the chart centred and
       * fully visible regardless of the container's aspect ratio.
       */}
      <svg
        width="100%"
        height="85"
        viewBox="0 0 400 85"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Control (non-dementia) distribution — rendered above the centreline */}
        <path
          d={createPath(controlDensity, true)}
          fill={colors.control}
          fillOpacity="0.8"
          stroke={colors.controlStroke}
          strokeWidth="2"
        />

        {/* Dementia distribution — rendered below the centreline */}
        <path
          d={createPath(dementiaDensity, false)}
          fill={colors.dementia}
          fillOpacity="0.8"
          stroke={colors.dementiaStroke}
          strokeWidth="2"
        />

        {/*
         * Centreline separator between the two distribution wings.
         * Stroke width 0 keeps it invisible; it exists as a logical divider.
         */}
        <line
          x1="10"
          y1="50"
          x2="390"
          y2="50"
          stroke="#ffffff"
          strokeWidth="0"
        />

        {/*
         * Normative threshold line — red dashed vertical.
         * x position is calculated by mapping thresholdPercentage onto the
         * inverted x-axis: higher thresholds appear further right.
         */}
        <line
          x1={10 + (thresholdPercentage / 100) * 380}
          y1="15"
          x2={10 + (thresholdPercentage / 100) * 380}
          y2="70"
          stroke="#b91c1c"
          strokeWidth="1.5"
          strokeDasharray="4,3"
        />

        {/*
         * Current patient marker — solid black vertical line with text label.
         * Only rendered once the category is fully complete (all items scored).
         * Uses the same x-axis mapping as the threshold line.
         */}
        {category.isComplete && (
          <g>
            <line
              x1={10 + (patientPercentage / 100) * 380}
              y1="15"
              x2={10 + (patientPercentage / 100) * 380}
              y2="70"
              stroke="#000000"
              strokeWidth="1.5"
            />
            <text
              x={10 + (patientPercentage / 100) * 380}
              y="10"
              textAnchor="middle"
              fontSize="8"
              fill="#000000"
              fontWeight="600"
            >
              Current Patient
            </text>
          </g>
        )}

        {/* X-axis boundary labels — inverted axis so 100% is left, 0% is right */}
        <text x="10" y="82" fontSize="8" fill="#64748b">
          0%
        </text>
        <text x="390" y="82" fontSize="8" fill="#64748b" textAnchor="end">
          100%
        </text>

      </svg>

      {/* Domain label centred below the SVG */}
      <p className="text-xs text-slate-700 mt-0.5 text-center font-medium">
        {domain.label}
      </p>
    </div>
  );
};

// ============================================================
// CATEGORY COLUMN COMPONENT
// ============================================================

/**
 * Props for the CategoryColumn sub-component.
 *
 * @property categoriesSlice  - The subset of categories to render (5 items)
 * @property indexOffset      - Added to the local slice index to get the global
 *                              category index (0 for the first column, 5 for the second)
 * @property allCategories    - Full categories array, used to compute startingNumber
 *                              (the cumulative item count before this category)
 * @property scores           - Current scores record from context
 * @property onScoreChange    - Callback to update a single item's score
 * @property getRadioButtonClass - Style helper for numeric radio buttons
 */
interface CategoryColumnProps {
  categoriesSlice: {
    title: string;
    icon: React.ElementType;
    items: string[];
  }[];
  indexOffset: number;
  allCategories: { items: string[] }[];
  scores: Record<string, string>;
  onScoreChange: (key: string, value: string) => void;
  getRadioButtonClass: (isSelected: boolean) => string;
}

/**
 * CategoryColumn
 *
 * Renders one column of assessment domain cards (5 domains per column).
 * Extracted from AssessmentPage to eliminate the duplicated JSX that previously
 * existed for columns 1 and 2. Both columns share identical structure; only the
 * slice of categories and the index offset differ.
 *
 * Each card contains:
 *   - A header with domain icon and title
 *   - One row per assessment item with alternating backgrounds
 *   - A radio button group (N/A + 0–4) for each item
 *   - Question numbers computed from the cumulative item count across all
 *     preceding categories (so column 2 questions continue from column 1)
 */
const CategoryColumn = ({
  categoriesSlice,
  indexOffset,
  allCategories,
  scores,
  onScoreChange,
  getRadioButtonClass,
}: CategoryColumnProps) => (
  <div className="space-y-3">
    {categoriesSlice.map((category, localIndex) => {
      const categoryIndex = localIndex + indexOffset;
      // Compute the 1-based starting question number for this category by
      // summing the item counts of all categories that precede it globally
      const startingNumber = allCategories
        .slice(0, categoryIndex)
        .reduce((sum, cat) => sum + cat.items.length, 0);
      const Icon = category.icon;

      return (
        <Card
          key={categoryIndex}
          className="border border-slate-200 shadow-sm"
        >
          {/* Category header with icon and title */}
          <CardHeader className="pb-2 pt-3 px-4 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center gap-2">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <Icon className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-bold text-slate-900 flex-1">
                {category.title}
              </CardTitle>
            </div>
          </CardHeader>

          {/* Question rows — alternating white/slate-50 backgrounds */}
          <CardContent className="space-y-0 pb-1 pt-1 px-0">
            {category.items.map((item, itemIndex) => {
              const itemKey = `${categoryIndex}-${itemIndex}`;
              const questionNumber = startingNumber + itemIndex + 1;
              // When N/A is selected, the question text is struck through
              const isNA = scores[itemKey] === "N/A";

              return (
                <div
                  key={itemKey}
                  className={`px-4 py-2 ${
                    itemIndex % 2 === 0 ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 justify-between">
                    {/* Question number + text */}
                    <div className="flex items-start gap-2 flex-1">
                      <span
                        className={`text-xs font-semibold text-slate-500 min-w-[24px] ${
                          isNA ? "line-through opacity-40" : ""
                        }`}
                      >
                        {questionNumber}.
                      </span>
                      {/*
                       * Label points to the "0" radio input for this item via
                       * htmlFor so clicking the question text focuses the first
                       * radio option, satisfying explicit label association.
                       */}
                      <Label
                        htmlFor={`${itemKey}-0`}
                        className={`text-xs text-slate-700 leading-snug flex-1 ${
                          isNA ? "line-through opacity-40" : ""
                        }`}
                      >
                        {item}
                      </Label>
                    </div>

                    {/* Radio button group: N/A + 0–4 */}
                    <div className="flex gap-0.5 shrink-0">

                      {/* N/A radio button — visually distinct from the numeric buttons */}
                      <label
                        className="flex flex-col items-center cursor-pointer group"
                        title="Not applicable"
                      >
                        <input
                          type="radio"
                          name={itemKey}
                          value="N/A"
                          aria-label="Not applicable"
                          checked={scores[itemKey] === "N/A"}
                          onChange={(e) => onScoreChange(itemKey, e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={`w-7 h-7 flex items-center justify-center rounded border-2 transition-all ${
                            scores[itemKey] === "N/A"
                              ? "border-slate-400 bg-slate-300 text-white font-bold"
                              : "border-slate-300 bg-white text-slate-600 hover:border-blue-400"
                          }`}
                        >
                          <span className="text-[9px] font-semibold block">
                            N/A
                          </span>
                        </div>
                      </label>

                      {/* Numeric score radio buttons 0–4
                          Each button has a tooltip with its verbal anchor.
                          The "0" input receives the id that <Label htmlFor> targets. */}
                      {[0, 1, 2, 3, 4].map((scoreValue) => (
                        <label
                          key={scoreValue}
                          className="flex flex-col items-center cursor-pointer group"
                          title={
                            scoreValue === 0
                              ? "Never"
                              : scoreValue === 1
                              ? "A few times per month"
                              : scoreValue === 2
                              ? "A few times per week"
                              : scoreValue === 3
                              ? "Daily"
                              : "Constantly"
                          }
                        >
                          <input
                            id={scoreValue === 0 ? `${itemKey}-0` : undefined}
                            type="radio"
                            name={itemKey}
                            value={scoreValue}
                            aria-label={
                              scoreValue === 0
                                ? "Never"
                                : scoreValue === 1
                                ? "A few times per month"
                                : scoreValue === 2
                                ? "A few times per week"
                                : scoreValue === 3
                                ? "Daily"
                                : "Constantly"
                            }
                            checked={scores[itemKey] === scoreValue.toString()}
                            onChange={(e) =>
                              onScoreChange(itemKey, e.target.value)
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-7 h-7 flex items-center justify-center rounded border-2 transition-all ${
                              scores[itemKey] === scoreValue.toString()
                                ? getRadioButtonClass(true)
                                : getRadioButtonClass(false)
                            }`}
                          >
                            <span className="text-xs font-semibold block">
                              {scoreValue}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      );
    })}
  </div>
);

// ============================================================
// DOMAIN SCORE TABLE COMPONENT
// ============================================================

/**
 * Props for the DomainScoreTable sub-component.
 *
 * @property categories      - The subset of CategoryWithStatus objects to render
 *                             (either the first 5 or last 5 domains)
 * @property scores          - Current scores record from context
 * @property itemThresholds  - Per-item normative thresholds keyed by 1-based
 *                             question number
 */
interface DomainScoreTableProps {
  categories: CategoryWithStatus[];
  scores: Record<string, string>;
  itemThresholds: Record<number, number>;
}

/**
 * DomainScoreTable
 *
 * Renders one column of per-domain item score tables for the CBI-R item scores
 * accordion section. Extracted from AssessmentPage to eliminate the duplicated
 * JSX that previously existed for the left and right result columns.
 *
 * Each domain is rendered as a card containing a table with columns:
 *   Q# | Item text | Score (blue-tinted) | Threshold | Summary
 *
 * Summary classification:
 *   - "N/A"        → item was not applicable (slate text)
 *   - "—"          → item not yet answered (should not appear post-submission)
 *   - "Above Norm" → score >= per-item threshold (red text)
 *   - "WNL"        → score <  per-item threshold (slate text)
 */
const DomainScoreTable = ({
  categories,
  scores,
  itemThresholds,
}: DomainScoreTableProps) => (
  <div className="space-y-4">
    {categories.map((category) => {
      const Icon = category.icon;
      return (
        <div
          key={category.index}
          className="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          {/* Domain header row */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <Icon className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-slate-900">
              {category.title}
            </h4>
          </div>

          {/* Item score table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className="text-white"
                  style={{ backgroundColor: "#5B6B7E" }}
                >
                  <th className="text-left py-2 px-3 font-semibold text-xs w-16">
                    Q#
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">
                    Item
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-xs w-20">
                    Score
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-xs w-24">
                    Threshold
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-xs w-28">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody>
                {category.items.map((item, itemIndex) => {
                  const itemKey = `${category.index}-${itemIndex}`;
                  const itemScore = scores[itemKey] || "";
                  const questionNumber =
                    category.startingNumber + itemIndex + 1;
                  // Look up the per-item threshold; default to 2
                  // if somehow the question number is not found
                  const threshold = itemThresholds[questionNumber] ?? 2;

                  // Determine summary classification and text colour
                  let summary = "—";
                  let summaryColor = "text-slate-400";

                  if (itemScore === "N/A") {
                    summary = "N/A";
                    summaryColor = "text-slate-500";
                  } else if (itemScore !== "") {
                    const numScore = parseInt(itemScore);
                    if (numScore >= threshold) {
                      summary = "Above Norm";
                      summaryColor = "text-red-700";
                    } else {
                      summary = "WNL";
                      summaryColor = "text-slate-600";
                    }
                  }

                  return (
                    <tr
                      key={itemKey}
                      className={
                        itemIndex % 2 === 0 ? "bg-white" : "bg-slate-50"
                      }
                    >
                      {/* Question number */}
                      <td className="py-2 px-3 border-b border-slate-200">
                        <span className="text-xs text-slate-700 font-medium">
                          Q{questionNumber}
                        </span>
                      </td>
                      {/* Full item question text */}
                      <td className="py-2 px-3 border-b border-slate-200">
                        <span className="text-xs text-slate-700">{item}</span>
                      </td>
                      {/* Score cell — blue tint to draw attention */}
                      <td className="py-2 px-3 text-center border-b border-slate-200 bg-blue-50">
                        <span className="text-xs text-slate-900 font-medium">
                          {itemScore || "—"}
                        </span>
                      </td>
                      {/* Per-item normative threshold */}
                      <td className="py-2 px-3 text-center border-b border-slate-200">
                        <span className="text-xs text-slate-700 font-medium">
                          {threshold}
                        </span>
                      </td>
                      {/* WNL / Above Norm / N/A classification */}
                      <td className="py-2 px-3 text-center border-b border-slate-200">
                        <span
                          className={`text-xs font-medium ${summaryColor} whitespace-nowrap`}
                        >
                          {summary}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    })}
  </div>
);

// ============================================================
// MAIN ASSESSMENT PAGE COMPONENT
// ============================================================

/**
 * AssessmentPage
 *
 * The primary page of the CBI-R scoring tool. Responsibilities:
 *
 * 1. TERMS GATE — shows a modal on first visit; the page content is hidden
 *    until the user accepts the Terms & Conditions.
 *
 * 2. ASSESSMENT FORM — a 45-item questionnaire split across 10 clinical
 *    domains (e.g. Memory, Mood, Sleep). Each item is scored 0–4 or N/A
 *    using custom radio buttons. Items are laid out in two columns of five
 *    categories each, with a sticky summary panel in a third column.
 *
 * 3. PROGRESS TRACKING — a sticky bottom bar shows how many of the 45 items
 *    have been answered and enables the Submit button only when all are done.
 *
 * 4. SUBMISSION & SCORING — on submit, raw scores are converted to per-domain
 *    percentage scores (N/A items excluded from the denominator) and saved to
 *    PatientScoresContext so the separate Report tab can consume them.
 *
 * 5. RESULTS REPORT — rendered after submission inside a collapsible Accordion:
 *    a) Domain Summary table + Recharts radar chart
 *    b) KDE Distribution Plots (butterfly charts per domain)
 *    c) Item-level score tables with WNL / Above Norm classification
 *
 * 6. PDF EXPORT — reproduces the full report as a multi-page PDF using jsPDF
 *    with charts drawn directly onto the canvas (avoids html2canvas limitations
 *    with hidden accordion content and complex SVGs).
 */
export default function AssessmentPage() {
  // ============================================================
  // STATE & CONTEXT
  // ============================================================

  // scores:       Record<itemKey, scoreString> — itemKey format is "{categoryIndex}-{itemIndex}"
  //               scoreString is one of: "", "N/A", "0", "1", "2", "3", "4"
  // setScore:     Updates a single item's score in the shared context
  // isSubmitted:  True once the clinician has clicked Submit Assessment
  // setIsSubmitted: Flips the submitted flag (triggers report render)
  const { scores, setScore, isSubmitted, setIsSubmitted } = useAssessmentScores();

  // Controls whether the Terms & Conditions modal is visible
  const [showTermsModal, setShowTermsModal] = useState(false);

  // submitSuccess: true for 4 s after a successful submission; drives the
  // inline success banner that replaces the disruptive native alert()
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // isResubmission: true when the clinician submits after a prior submission,
  // used to show "Report updated" vs "Scores submitted" in the success banner
  const [isResubmission, setIsResubmission] = useState(false);

  // Setter that saves calculated domain percentage scores to PatientScoresContext
  // (consumed by the Report page / tab to avoid re-computing scores)
  const setPatientScores = useSetPatientScores();
  const setPatientMinimumData = useSetPatientMinimumData();

  // hasAcceptedTerms: persisted flag (e.g. localStorage) — true if user has accepted T&C
  // acceptTerms:      marks terms as accepted and persists the decision
  const { hasAcceptedTerms, acceptTerms } = useTerms();

  // ============================================================
  // SIDE EFFECTS
  // ============================================================

  /**
   * EFFECT 1: Terms Modal Gate
   *
   * Runs on mount (and whenever hasAcceptedTerms changes, e.g. after accepting).
   * If the user hasn't accepted the Terms & Conditions yet, the modal is shown.
   * The main page content remains hidden (gated by `hasAcceptedTerms` in JSX).
   */
  useEffect(() => {
    if (!hasAcceptedTerms) {
      setShowTermsModal(true);
    }
  }, [hasAcceptedTerms]);

  /**
   * EFFECT 2: Unsaved Work Warning
   *
   * Registers a `beforeunload` event listener that fires when the user tries to
   * navigate away from or refresh the page.
   *
   * The warning is shown only when:
   *   - At least one score has been entered (scores object is non-empty), AND
   *   - The form has not yet been submitted (isSubmitted is false).
   *
   * The cleanup function removes the listener when the component unmounts or
   * when `scores` / `isSubmitted` change (so the listener is always fresh).
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasScores = Object.keys(scores).length > 0;
      if (hasScores && !isSubmitted) {
        e.preventDefault();
        // Setting returnValue triggers the browser's native "Leave site?" dialog
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    // Cleanup: remove listener to prevent memory leaks and stale closures
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [scores, isSubmitted]);

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * handleAcceptTerms
   * Called when the user clicks "Accept" in the TermsModal.
   * Persists the acceptance via context and hides the modal.
   */
  const handleAcceptTerms = () => {
    acceptTerms();
    setShowTermsModal(false);
  };

  /**
   * handleDeclineTerms
   * Called when the user clicks "Decline" in the TermsModal.
   * The tool cannot be used without accepting terms, so the user is informed
   * via a simple alert (the modal remains visible / page stays blocked).
   */
  const handleDeclineTerms = () => {
    alert("You must accept the Terms and Conditions to use this tool.");
  };

  /**
   * handleScoreChange
   *
   * Fired when a radio button is selected for any assessment item.
   * Performs a lightweight validation before updating state:
   *   - Allows the empty string (clears the answer — shouldn't normally happen
   *     with radio buttons but guards against programmatic resets)
   *   - Allows "N/A" (not applicable)
   *   - Allows integers 0–4 (the valid CBI-R scoring range)
   *   - Silently ignores any other value
   *
   * @param itemKey - Composite key identifying the item: "{categoryIndex}-{itemIndex}"
   * @param value   - The selected score value as a string
   */
  const handleScoreChange = (itemKey: string, value: string) => {
    if (
      value === "" ||
      value === "N/A" ||
      (parseInt(value) >= 0 && parseInt(value) <= 4)
    ) {
      setScore(itemKey, value);
    }
  };

  /**
   * handleSubmit
   *
   * Handles the assessment form submission triggered by the "Submit Assessment" button.
   * Follows a multi-step process:
   *
   * STEP 1 — Completeness check:
   *   Counts unanswered items (score === "" or missing). If any are found, an
   *   alert lists the first 10 missing question numbers (with domain context) and
   *   aborts submission.
   *
   * STEP 2 — Score calculation:
   *   For each of the 10 domains, computes:
   *     - Raw score (sum of non-N/A item scores)
   *     - Max possible score (non-N/A item count × 4)
   *     - Percentage = (raw / max) × 100
   *
   * STEP 3 — Context update:
   *   Saves the percentage scores to PatientScoresContext so the Report page
   *   can access them without re-computing.
   *
   * STEP 4 — Mark as submitted:
   *   Sets isSubmitted = true, which triggers the results report to render
   *   below the form. Shows a temporary inline success banner instead of
   *   the disruptive native alert().
   *
   * @param e - The React form submission event (prevented to stop page reload)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // STEP 1: Verify every question has a response before allowing submission
    if (completedQuestions !== totalQuestions) {
      // Collect the 1-based question numbers and domain context for unanswered items
      const missingWithContext: string[] = [];
      let questionNumber = 1;

      categories.forEach((category, categoryIndex) => {
        category.items.forEach((_, itemIndex) => {
          const itemKey = `${categoryIndex}-${itemIndex}`;
          if (!scores[itemKey] || scores[itemKey] === "") {
            missingWithContext.push(`Q${questionNumber} (${category.title})`);
          }
          questionNumber++;
        });
      });

      const missingCount = missingWithContext.length;
      // Show at most the first 10 missing questions to keep the alert readable
      const missingList = missingWithContext.slice(0, 10).join(", ");
      const moreText =
        missingWithContext.length > 10
          ? ` and ${missingWithContext.length - 10} more`
          : "";

      alert(
        `Assessment incomplete!\n\nYou have ${missingCount} unanswered question${missingCount > 1 ? "s" : ""}.\n\nMissing questions: ${missingList}${moreText}\n\nPlease complete all questions before submitting.`
      );
      return;
    }

    // STEP 2: Convert raw item scores to per-domain percentage scores.
    // The categoryKeys array maps each category's array index to its context key.
    const categoryKeys = [
      "memoryOrientation",
      "everydaySkills",
      "selfCare",
      "abnormalBehaviour",
      "mood",
      "beliefs",
      "eatingHabits",
      "sleep",
      "stereotypicMotor",
      "motivation",
    ];

    const patientScores = {} as PatientScores;
    categories.forEach((category, categoryIndex) => {
      const categoryScore = getCategoryScore(categoryIndex, category.items.length);
      const categoryMaxScore = getCategoryMaxScore(
        categoryIndex,
        category.items.length
      );
      // Guard against division by zero (all items marked N/A)
      const percentageScore =
        categoryMaxScore > 0 ? (categoryScore / categoryMaxScore) * 100 : 0;
      patientScores[categoryKeys[categoryIndex] as keyof PatientScores] = percentageScore;
    });

    // STEP 3: Persist percentage scores and minimum data flags to shared context
    setPatientScores(patientScores);
    const minimumDataValues = Object.fromEntries(
      categoryKeys.map((key, i) => [key, getHasMinimumData(i, categories[i].items.length)])
    ) as unknown as PatientMinimumData;
    setPatientMinimumData(minimumDataValues);

    // STEP 4: Mark the assessment as submitted to reveal the results report.
    // isSubmitted is still the old value here (before setIsSubmitted fires),
    // so we capture it now to correctly distinguish first submit from re-submit.
    // Show a temporary inline success banner for 4 s instead of native alert().
    setIsResubmission(isSubmitted);
    setIsSubmitted(true);
    setSubmitSuccess(true);
  };

  // ============================================================
  // DATA STRUCTURES
  // ============================================================

  /**
   * categories
   *
   * The complete list of CBI-R assessment domains, each with:
   *  - title:  Human-readable domain name shown in the UI and PDF
   *  - icon:   Lucide React component for visual identification
   *  - items:  Ordered array of question strings (order determines question numbers)
   *
   * There are 10 domains with a total of 45 items:
   *   Memory & Orientation (8), Everyday Skills (5), Self Care (4),
   *   Abnormal Behaviour (6), Mood (4), Beliefs (3), Eating Habits (4),
   *   Sleep (2), Stereotypic & Motor (4), Motivation (5)
   */
  const categories = [
    {
      title: "Memory and Orientation",
      icon: Brain,
      items: [
        "Has poor day-to-day memory (e.g. about conversations, trips etc.)",
        "Asks the same questions over and over again",
        "Loses or misplaces things",
        "Forgets the names of familiar people",
        "Forgets the names of objects and things",
        "Shows poor concentration when reading or watching television",
        "Forgets what day it is",
        "Becomes confused or muddled in unusual surroundings",
      ],
    },
    {
      title: "Everyday Skills",
      icon: Wrench,
      items: [
        "Has difficulties using electrical appliances (e.g. TV, radio, cooker, washing machine)",
        "Has difficulties writing (letters, Christmas cards, lists etc.)",
        "Has difficulties using the telephone",
        "Has difficulties making a hot drink (e.g. tea/coffee)",
        "Has problems handling money or paying bills",
      ],
    },
    {
      title: "Self Care",
      icon: User,
      items: [
        "Has difficulties grooming self (e.g. shaving or putting on make-up)",
        "Has difficulties dressing self",
        "Has problems feeding self without assistance",
        "Has problems bathing or showering self",
      ],
    },
    {
      title: "Abnormal Behaviour",
      icon: AlertCircle,
      items: [
        "Finds humour or laughs at things others do not find funny",
        "Has temper outbursts",
        "Is uncooperative when asked to do something",
        "Shows socially embarrassing behaviour",
        "Makes tactless or suggestive remarks",
        "Acts impulsively without thinking",
      ],
    },
    {
      title: "Mood",
      icon: Heart,
      items: [
        "Cries",
        "Appears sad or depressed",
        "Is very restless or agitated",
        "Is very irritable",
      ],
    },
    {
      title: "Beliefs",
      icon: Eye,
      items: [
        "Sees things that are not really there (visual hallucinations)",
        "Hears voices that are not really there (auditory hallucinations)",
        "Has odd or bizarre ideas that cannot be true",
      ],
    },
    {
      title: "Eating Habits",
      icon: Utensils,
      items: [
        "Prefers sweet foods more than before",
        "Wants to eat the same foods repeatedly",
        "Her/his appetite is greater, she/he eats more than before",
        "Table manners are declining (e.g. stuffing food into mouth)",
      ],
    },
    {
      title: "Sleep",
      icon: Moon,
      items: [
        "Sleep is disturbed at night",
        "Sleeps more by day than before (cat naps etc.)",
      ],
    },
    {
      title: "Stereotypic and Motor Behaviours",
      icon: RotateCw,
      items: [
        "Is rigid and fixed in his/her ideas and opinions",
        "Develops routines from which she/he can not easily be discouraged (e.g. wanting to eat or go for walks at fixed times)",
        "Clock watches or appears preoccupied with time",
        "Repeatedly uses the same expression or catch phrase",
      ],
    },
    {
      title: "Motivation",
      icon: Target,
      items: [
        "Shows less enthusiasm for his or her usual interests",
        "Shows little interest in doing new things",
        "Fails to maintain motivation to keep in contact with friends or family",
        "Appears indifferent to the worries and concerns of family members",
        "Shows reduced affection",
      ],
    },
  ];

  /**
   * itemThresholds
   *
   * Clinical cutoff scores for each individual CBI-R item, keyed by 1-based
   * question number (Q1–Q45).
   *
   * Interpretation:
   *   score >= threshold → "Above Norm" (frequency exceeds normative range)
   *   score <  threshold → "WNL" (within normal limits)
   *
   * These thresholds are derived from the Foxe et al. normative dataset.
   * Items are grouped by domain for readability (not enforced in the object).
   *
   * Domain breakdown:
   *   Q1–Q8   Memory & Orientation (thresholds: 3,2,3,3,3,2,2,2)
   *   Q9–Q13  Everyday Skills      (thresholds: 2,1,1,1,1)
   *   Q14–Q17 Self Care            (thresholds: 1,1,1,1)
   *   Q18–Q23 Abnormal Behaviour   (thresholds: 2,2,2,2,2,2)
   *   Q24–Q27 Mood                 (thresholds: 2,2,2,2)
   *   Q28–Q30 Beliefs              (thresholds: 1,1,1)
   *   Q31–Q34 Eating Habits        (thresholds: 2,2,2,1)
   *   Q35–Q36 Sleep                (thresholds: 4,2)
   *   Q37–Q40 Stereotypic & Motor  (thresholds: 3,4,2,2)
   *   Q41–Q45 Motivation           (thresholds: 2,2,3,1,2)
   */
  const itemThresholds: Record<number, number> = {
    // Memory & Orientation (Q1–Q8)
    1: 3, 2: 2, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 2,
    // Everyday Skills (Q9–Q13)
    9: 2, 10: 1, 11: 1, 12: 1, 13: 1,
    // Self Care (Q14–Q17)
    14: 1, 15: 1, 16: 1, 17: 1,
    // Abnormal Behaviour (Q18–Q23)
    18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2,
    // Mood (Q24–Q27)
    24: 2, 25: 2, 26: 2, 27: 2,
    // Beliefs (Q28–Q30)
    28: 1, 29: 1, 30: 1,
    // Eating Habits (Q31–Q34)
    31: 2, 32: 2, 33: 2, 34: 1,
    // Sleep (Q35–Q36)
    35: 4, 36: 2,
    // Stereotypic & Motor Behaviours (Q37–Q40)
    37: 3, 38: 4, 39: 2, 40: 2,
    // Motivation (Q41–Q45)
    41: 2, 42: 2, 43: 3, 44: 1, 45: 2,
  };

  // ============================================================
  // PROGRESS TRACKING
  // ============================================================

  // Total number of questions across all 10 categories (should be 45)
  const totalQuestions = categories.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );

  // Count of items that have a non-empty answer (including "N/A" — N/A counts
  // as a completed decision, not a skipped question).
  // Memoised so the filter does not re-run on every render unrelated to scores.
  const completedQuestions = useMemo(
    () => Object.values(scores).filter((score) => score !== "").length,
    [scores]
  );

  // 0–100 percentage used to animate the progress bar width
  const progressPercentage = (completedQuestions / totalQuestions) * 100;

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * isCategoryComplete
   *
   * Returns true only if every item in the specified category has a non-empty score.
   * Used to determine whether to show the completed summary card or the
   * "Not completed" placeholder in the Summary panel.
   *
   * @param categoryIndex - Zero-based index into the `categories` array
   * @param itemCount     - Number of items in this category
   */
  const minimumItemsRequired: Record<number, number> = {
    0: 3,  // Memory & Orientation
    1: 3,  // Everyday Skills
    2: 2,  // Self Care
    3: 3,  // Abnormal Behaviour
    4: 4,  // Mood
    5: 3,  // Beliefs
    6: 3,  // Eating Habits
    7: 2,  // Sleep
    8: 3,  // Stereotypic & Motor Behaviours
    9: 2,  // Motivation
  };

  const getHasMinimumData = (categoryIndex: number, itemCount: number): boolean => {
    const minRequired = minimumItemsRequired[categoryIndex] ?? itemCount;
    let numericAnswers = 0;
    for (let i = 0; i < itemCount; i++) {
      const score = scores[`${categoryIndex}-${i}`];
      if (score !== "" && score !== "N/A") numericAnswers++;
    }
    return numericAnswers >= minRequired;
  };

  const isCategoryComplete = (categoryIndex: number, itemCount: number) => {
    for (let i = 0; i < itemCount; i++) {
      const itemKey = `${categoryIndex}-${i}`;
      if (!scores[itemKey] || scores[itemKey] === "") return false;
    }
    return true;
  };

  /**
   * getCategoryScore
   *
   * Calculates the sum of all answered (non-N/A) item scores for a category.
   * Items marked "N/A" contribute 0 to the numerator AND are excluded from
   * the denominator (see getCategoryMaxScore), keeping the percentage fair.
   *
   * Unanswered items (score === "" or missing) default to "0" so partial
   * completion doesn't inflate the percentage during data entry.
   *
   * @param categoryIndex - Zero-based category index
   * @param itemCount     - Number of items in this category
   * @returns             - Integer sum of applicable item scores
   */
  const getCategoryScore = (categoryIndex: number, itemCount: number) => {
    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      const itemKey = `${categoryIndex}-${i}`;
      const scoreValue = scores[itemKey] || "0";
      // N/A items are excluded from the score sum
      if (scoreValue !== "N/A") {
        total += parseInt(scoreValue);
      }
    }
    return total;
  };

  /**
   * getCategoryMaxScore
   *
   * Calculates the maximum possible score for a category, accounting for N/A items.
   * Each applicable (non-N/A) item can score a maximum of 4 points.
   *
   * Design rationale:
   *   Using the total item count × 4 as the denominator when some items are N/A
   *   would artificially deflate the patient's percentage. This function instead
   *   counts only items that have NOT been explicitly marked N/A.
   *
   * Edge case:
   *   If every single item has been explicitly marked N/A, applicableItems will
   *   be 0 and the fallback (itemCount × 4) is returned to avoid division by zero.
   *   This is the only case where the fallback triggers; blank (unanswered) items
   *   are counted as applicable because they have not been marked N/A.
   *
   * Example:
   *   Category has 5 items; 1 is marked N/A, 2 are answered, 2 are blank.
   *   applicableItems = 4 (the 1 N/A item is excluded; blanks are still applicable)
   *   maxScore = 4 × 4 = 16  (not 2 × 4 = 8)
   *
   * @param categoryIndex - Zero-based category index
   * @param itemCount     - Number of items in this category
   * @returns             - Maximum achievable score given current N/A selections
   */
  const getCategoryMaxScore = (categoryIndex: number, itemCount: number) => {
    let applicableItems = 0;
    for (let i = 0; i < itemCount; i++) {
      const itemKey = `${categoryIndex}-${i}`;
      const scoreValue = scores[itemKey] || "";
      // Only exclude items that have been explicitly marked N/A
      if (scoreValue !== "N/A") {
        applicableItems++;
      }
    }
    // Fallback: only reached when every single item is marked N/A
    return applicableItems === 0 ? itemCount * 4 : applicableItems * 4;
  };

  // ============================================================
  // STYLING HELPER FUNCTIONS
  // ============================================================

  /**
   * getScoreIndicatorColor
   *
   * Returns the Tailwind background class for the small dot indicators shown
   * in the Summary panel next to each item number.
   *
   * Visual encoding:
   *   - "N/A"  → slate-200 (light grey — item not applicable)
   *   - ""     → gray-100  (very light grey — item not yet answered)
   *   - any score (0–4) → slate-600 (dark — item answered)
   *
   * Note: all scored items use the same dark colour regardless of score value;
   * the dots convey completion status, not score magnitude.
   *
   * @param score - The item's current score string
   */
  const getScoreIndicatorColor = (score: string) => {
    if (score === "N/A") return "bg-slate-200";
    if (score === "") return "bg-gray-100";
    return "bg-slate-600";
  };

  /**
   * getRadioButtonClass
   *
   * Returns the Tailwind class string for a custom radio button square.
   * Selected state: dark slate background with white text (high contrast).
   * Unselected state: white background with a slate border and blue hover.
   *
   * @param isSelected - Whether this button is the currently selected option
   */
  const getRadioButtonClass = (isSelected: boolean) => {
    if (!isSelected) {
      return "border-slate-300 bg-white text-slate-600 hover:border-blue-400";
    }
    return "border-slate-800 bg-slate-800 text-white font-bold";
  };

  /**
   * allCategoriesWithStatus
   *
   * Derives a rich array from `categories` by adding runtime-computed fields:
   *   - index:          Zero-based position in the categories array
   *   - isComplete:     True if all items in this category have a score
   *   - score:          Sum of answered item scores (N/A excluded)
   *   - maxScore:       Maximum achievable score given N/A selections
   *   - startingNumber: 1-based question number of this category's first item
   *                     (cumulative sum of all preceding category item counts)
   *
   * Memoised on `scores` so the derived values are only recomputed when the
   * clinician changes a score, not on every render.
   *
   * This array is the primary data source for the Summary panel, radar chart,
   * distribution plots, item score tables, and PDF export.
   */
  const allCategoriesWithStatus: CategoryWithStatus[] = useMemo(
    () =>
      categories.map((category, index) => ({
        ...category,
        index,
        isComplete: isCategoryComplete(index, category.items.length),
        hasMinimumData: getHasMinimumData(index, category.items.length),
        score: getCategoryScore(index, category.items.length),
        maxScore: getCategoryMaxScore(index, category.items.length),
        // startingNumber = total items in all categories before this one
        startingNumber: categories
          .slice(0, index)
          .reduce((sum, cat) => sum + cat.items.length, 0),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scores] // categories is a static constant defined in the component body;
             // the helper functions depend on `scores` via closure
  );

  /**
   * domainThresholds
   *
   * Total domain score cutoffs indexed by category array position (0–9).
   * A patient's domain score above this threshold is classified as "Above Norm".
   *
   * These values are derived from the Foxe et al. normative dataset and reflect
   * the total raw score (not percentage) at which scores become clinically
   * noteworthy.
   *
   * Index → Domain:
   *   0 → Memory & Orientation  (threshold: 13)
   *   1 → Everyday Skills       (threshold: 2)
   *   2 → Self Care             (threshold: 1)
   *   3 → Abnormal Behaviour    (threshold: 4)
   *   4 → Mood                  (threshold: 4)
   *   5 → Beliefs               (threshold: 1)
   *   6 → Eating Habits         (threshold: 4)
   *   7 → Sleep                 (threshold: 5)
   *   8 → Stereotypic & Motor   (threshold: 6)
   *   9 → Motivation            (threshold: 6)
   */
  const domainThresholds: Record<number, number> = {
    0: 13,
    1: 2,
    2: 1,
    3: 4,
    4: 4,
    5: 1,
    6: 4,
    7: 5,
    8: 6,
    9: 6,
  };

  /**
   * domainThresholdPercentages
   *
   * Fixed normative threshold expressed as a percentage of the maximum possible
   * domain score (positive_if_ge values from the Foxe et al. normative dataset).
   * Used instead of raw thresholds so that the comparison remains meaningful
   * when some items have been marked N/A.
   */
  const domainThresholdPercentages: Record<number, number> = {
    0: 40.0,  // Memory & Orientation
    1: 5.62,  // Everyday Skills
    2: 3.12,  // Self Care
    3: 14.6,  // Abnormal Behaviour
    4: 21.9,  // Mood
    5: 4.17,  // Beliefs
    6: 21.9,  // Eating Habits
    7: 56.2,  // Sleep
    8: 34.4,  // Stereotypic & Motor Behaviours
    9: 27.5,  // Motivation
  };


  /**
   * getHeatMapStyle
   *
   * Returns an inline style object with a background colour for heat map cells.
   * Uses a 5-step blue gradient to encode score intensity (0 → white, 4 → dark blue).
   *
   * N/A and empty scores return an empty style object so Tailwind classes take over.
   *
   * Colour steps:
   *   0 → #FFFFFF (white)
   *   1 → #BBDEFB (light blue)
   *   2 → #64B5F6 (medium blue)
   *   3 → #42A5F5 (blue)
   *   4 → #1565C0 (dark blue)
   *
   * @param score - The item's score string
   */
  const getHeatMapStyle = (score: string) => {
    if (score === "N/A" || score === "") return {};
    const numScore = parseInt(score);
    const colors = [
      "#FFFFFF",
      "#BBDEFB",
      "#64B5F6",
      "#42A5F5",
      "#1565C0",
    ];
    return { backgroundColor: colors[numScore] || "#F3F4F6" };
  };

  /**
   * getHeatMapColor
   *
   * Returns a Tailwind background class for heat map cells that don't have a
   * numeric score (i.e. N/A or unanswered). Numeric scores are handled by
   * getHeatMapStyle (inline style) instead.
   *
   * @param score - The item's score string
   */
  const getHeatMapColor = (score: string) => {
    if (score === "N/A") return "bg-slate-200";
    if (score === "") return "bg-gray-100";
    return ""; // numeric scores use inline style from getHeatMapStyle
  };

  // ============================================================
  // UTILITY: Async Image Loader
  // ============================================================

  /**
   * loadImage
   *
   * Wraps the native Image() constructor in a Promise so the PDF generation
   * function can `await` the logo before drawing it onto the canvas.
   *
   * Without this, there is a race condition where `doc.addImage()` could be
   * called before the logo has fully loaded, resulting in a blank placeholder.
   *
   * @param src - URL of the image to load (e.g. '/Frontier_logo_2020.png')
   * @returns   - Resolves with the loaded HTMLImageElement, or rejects on error
   */
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // ============================================================
  // PDF EXPORT FUNCTION
  // ============================================================

  /**
   * exportToPDF
   *
   * Generates and downloads a multi-page PDF report of the completed CBI-R assessment.
   * Uses jsPDF for document creation and autoTable for structured tables.
   * Charts (radar and distribution plots) are drawn directly onto the PDF canvas
   * using jsPDF drawing primitives rather than html2canvas, for two reasons:
   *   1. Accordion content may be collapsed (not in the DOM) when export runs.
   *   2. Recharts SVGs do not always render correctly in html2canvas.
   *
   * PDF structure:
   *   Page 1 — Logo + Title + Important Notice box
   *             CBI-R Domain Summary table
   *             CBI-R Domain Distribution Plots (butterfly KDE plots, 2 columns × 5 rows)
   *             Vertical legend for the distribution plots
   *
   *   Page 2 — CBI-R Domain Profile radar chart (drawn via jsPDF primitives)
   *             CBI-R Item Score tables (one sub-table per domain, spanning pages)
   *
   *   All pages — Footer: copyright notice (left) + "Page N of M" (right)
   *
   * The filename follows the format: YYYY-MM-DD_CBI-R_Report.pdf
   */
  
  const exportToPDF = async () => {
    try {
      const doc = new jsPDF() as jsPDF & {
        lastAutoTable: { finalY: number };
      };
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 14;
      const footerMargin = 16;

      const logoImg = await loadImage(`${process.env.NEXT_PUBLIC_BASE_PATH}/Frontier_logo_2020.png`).catch(() => null);

      /**
       * addHeader
       *
       * Renders the "Patient Name" and "Assessment Date" fill-in fields at
       * the top of every page, with a thin rule beneath to separate the
       * header band from the page content.
       */
      const addHeader = (y: number = 11) => {
        // Small uppercase labels in slate-500
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);

        doc.text("PATIENT NAME:", margin, y);

        const dateLabelX = pageWidth / 2 + 8;
        doc.text("DATE:", dateLabelX, y);

        // Measure label widths so the underlines sit flush against them
        const nameLabelWidth = doc.getTextWidth("PATIENT NAME");
        const dateLabelWidth = doc.getTextWidth("DATE");

        // Thin fill-in underlines in slate-300
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(
          margin + nameLabelWidth + 3,
          y + 1,
          pageWidth / 2 - 6,
          y + 1
        );
        doc.line(
          dateLabelX + dateLabelWidth + 3,
          y + 1,
          pageWidth - margin,
          y + 1
        );
      };

      const addFooter = (pageNumber: number, totalPages: number) => {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(
          "© 2026 The University of Sydney | FRONTIER Research Group. All rights reserved.",
          14,
          pageHeight - 10
        );
        doc.text(
          `Page ${pageNumber} of ${totalPages}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: "right" }
        );
        doc.setTextColor(0, 0, 0);
      };

      let currentY = 20;

      // ============================================================
      // PAGE 1: Title + Notice + Domain Summary table + Radar Chart
      // ============================================================

      // --- Logo (top-right corner) ---
      const logoWidth = 28;
      let logoHeight = 28;
      if (logoImg) {
        try {
          const imgProps = doc.getImageProperties(logoImg);
          const aspect = imgProps.width / imgProps.height;
          logoHeight = logoWidth / aspect;
          doc.addImage(
            logoImg,
            "PNG",
            pageWidth - logoWidth - margin,
            margin,
            logoWidth,
            logoHeight
          );
        } catch (e) {
          console.warn("Could not add logo to PDF");
        }
      }

      // --- Report title ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const titleY = margin + logoHeight / 2 + 3;
      doc.text(
        "Cambridge Behavioural Inventory-Revised (CBI-R) Report",
        margin,
        titleY
      );

      // --- Important Notice box ---
      currentY = titleY + 8;
      const noticePadding = 4;
      const boxWidth = pageWidth - 28;
      const textWidth = boxWidth - noticePadding * 2;

      const noticeText =
        "This tool is based on data from Foxe et al. The Cambridge Behavioural Inventory-Revised: Normative Characteristics and Interpretation https://osf.io/7emb8/. It is intended for use by clinicians experienced in administering and interpreting the CBI-R. Please review the about section of the online tool before proceeding with interpretation of this report.";

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const splitNotice = doc.splitTextToSize(noticeText, textWidth);
      const lineHeight = 4;
      const boxHeight = splitNotice.length * lineHeight + noticePadding * 2;

      doc.setFillColor(240, 245, 250);
      doc.rect(margin, currentY, boxWidth, boxHeight, "F");
      doc.setTextColor(80, 88, 100);
      splitNotice.forEach((line: string, index: number) => {
        const isLastLine = index === splitNotice.length - 1;
        doc.text(
          line,
          margin + noticePadding,
          currentY + noticePadding + 3 + index * lineHeight,
          {
            align: isLastLine ? "left" : "justify",
            maxWidth: textWidth,
          }
        );
      });

      currentY += boxHeight + 6;
      doc.setTextColor(0, 0, 0);

      // --- CBI-R Domain Summary Table ---
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("CBI-R Domain Summary", margin, currentY);
      currentY += 4;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const summaryBlurb =
        "Higher scores reflect more frequent behavioural, cognitive, or mood-related concerns. Scores below the threshold are within normal limits (WNL); scores above are classified as Above Norm.";
      const splitSummaryBlurb = doc.splitTextToSize(
        summaryBlurb,
        pageWidth - 28
      );
      doc.text(splitSummaryBlurb, margin, currentY);
      currentY += splitSummaryBlurb.length * 3.5 + 3;

      const domainTableData = allCategoriesWithStatus.map((category) => {
        const correctedPct =
          category.maxScore > 0
            ? (category.score / category.maxScore) * 100
            : 0;
        const thresholdPct = domainThresholdPercentages[category.index] ?? 0;
        const summary = !category.hasMinimumData
          ? "Insufficient data"
          : correctedPct >= thresholdPct
          ? "Above Norm"
          : "WNL";
        return [
          category.title,
          `${category.score} / ${category.maxScore}`,
          `${correctedPct.toFixed(1)}%`,
          `${thresholdPct}%`,
          summary,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [["Subdomain", "Total", "Corrected %", "% Threshold", "Summary"]],
        body: domainTableData,
        theme: "striped",
        tableWidth: "wrap",
        margin: { left: (pageWidth - (80 + 28 + 24 + 28 + 30)) / 2 },
        headStyles: {
          fillColor: [91, 107, 126],
          fontSize: 7,
          fontStyle: "bold",
        },
        styles: { fontSize: 6.5, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 28, halign: "center" },
          2: { cellWidth: 24, halign: "center" },
          3: { cellWidth: 28, halign: "center" },
          4: { cellWidth: 30, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "head" && data.column.index !== 0) {
            data.cell.styles.halign = "center";
          }
          if (data.section === "body" && data.column.index === 4) {
            if (data.cell.text[0] === "Above Norm") {
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fontStyle = "bold";
            } else if (data.cell.text[0] === "Insufficient data") {
              data.cell.styles.textColor = [148, 163, 184];
            }
          }
        },
      });

      currentY = doc.lastAutoTable.finalY + 6;

      // --- Radar chart section (fills remainder of PAGE 1) ---
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        "CBI-R Domain Profile with Normative Thresholds",
        margin,
        currentY
      );
      currentY += 4;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const radarBlurb =
        "Scores are shown as a percentage of the maximum possible domain score. Higher scores indicate more frequent behavioural, cognitive, or mood-related concerns. Red markers indicate patient domain scores above the normative threshold. Hollow markers indicate that there is insufficient data.";
      const splitRadarBlurb = doc.splitTextToSize(radarBlurb, pageWidth - 28);
      doc.text(splitRadarBlurb, margin, currentY);
      currentY += splitRadarBlurb.length * 3.5 + 4;

      const radarAvailableHeight = pageHeight - currentY - footerMargin;
      const radarSize = Math.min(radarAvailableHeight + 10, 125);
      const radarX = (pageWidth - radarSize) / 2 - 20;
      drawRadarChartToPDF(doc, radarX, currentY, radarSize);

      // ============================================================
      // PAGE 2: Distribution Plots (on their own, legend at the bottom)
      // ============================================================

      doc.addPage();
      currentY = 28;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("CBI-R Domain Distribution Plots", margin, currentY);
      currentY += 4;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const distributionBlurb =
        "Compares the patient's domain scores with dementia and healthy control reference distributions (as % of max score). Scores to the right of the dotted line are above normal. Domains with insufficient data will be greyed out.";
      const splitDistributionBlurb = doc.splitTextToSize(
        distributionBlurb,
        pageWidth - 28
      );
      doc.text(splitDistributionBlurb, margin, currentY);
      currentY += splitDistributionBlurb.length * 3.5 + 3;

      const plotsAvailableHeight = pageHeight - currentY - footerMargin;
      const plotAreaWidth = pageWidth - margin * 2;
      drawDistributionPlotsToPDF(
        doc,
        margin,
        currentY,
        plotAreaWidth,
        plotsAvailableHeight
      );

      // ============================================================
      // PAGE 3+: Item Scores
      // ============================================================

      doc.addPage();
      currentY = 28;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("CBI-R Item Scores", margin, currentY);
      currentY += 4;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const itemBlurb =
        "Items reflect the frequency of behavioural change, rated as: 0 = Never; 1 = a few times/month; 2 = a few times/week; 3 = daily; 4 = constantly. WNL: Scores within the expected normative range. Above Norm: Scores exceeding the normative range.";
      const splitItemBlurb = doc.splitTextToSize(itemBlurb, pageWidth - 28);
      doc.text(splitItemBlurb, margin, currentY);
      currentY += splitItemBlurb.length * 3.5 + 4;

      allCategoriesWithStatus.forEach((category) => {
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 28;
        }

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(category.title, margin, currentY);
        currentY += 4;

        const itemTableData = category.items.map((item, itemIndex) => {
          const itemKey = `${category.index}-${itemIndex}`;
          const itemScore = scores[itemKey] || "—";
          const questionNumber = category.startingNumber + itemIndex + 1;
          const threshold = itemThresholds[questionNumber] ?? 2;

          let summary = "—";
          if (itemScore === "N/A") {
            summary = "N/A";
          } else if (itemScore !== "" && itemScore !== "—") {
            summary =
              parseInt(itemScore) >= threshold ? "Above Norm" : "WNL";
          }

          const truncatedItem =
            item.length > 65 ? item.substring(0, 65) + "..." : item;

          return [
            `Q${questionNumber}`,
            truncatedItem,
            itemScore,
            threshold.toString(),
            summary,
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [["Q#", "Item", "Score", "Threshold", "Summary"]],
          body: itemTableData,
          theme: "grid",
          tableWidth: "wrap",
          margin: { left: (pageWidth - (10 + 112 + 14 + 18 + 22)) / 2 },
          headStyles: {
            fillColor: [91, 107, 126],
            fontSize: 7,
            fontStyle: "bold",
          },
          styles: { fontSize: 6.5, cellPadding: 1.2 },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 112 },
            2: { cellWidth: 14, halign: "center", fillColor: [239, 246, 255] },
            3: { cellWidth: 18, halign: "center" },
            4: { cellWidth: 22, halign: "center" },
          },
          didParseCell: (data) => {
            if (data.section === "head" && data.column.index !== 1) {
              data.cell.styles.halign = "center";
            }
            if (data.section === "body" && data.column.index === 4) {
              if (data.cell.text[0] === "Above Norm") {
                data.cell.styles.textColor = [185, 28, 28];
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
        });

        currentY = doc.lastAutoTable.finalY + 4;
      });

      // --- Add headers and footers to all pages now that total page count is known ---
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addHeader();
        addFooter(i, totalPages);
      }

      const fileName = `${new Date().toISOString().split("T")[0]}_CBI-R_Report.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("There was an error generating the PDF. Please try again.");
    }
  };
  // ============================================================
  // KERNEL DENSITY ESTIMATION (KDE)
  // ============================================================

  /**
   * calculateDensity
   *
   * Estimates a smooth probability density function from an array of discrete
   * score values using a Gaussian (normal) kernel. This is used to draw the
   * butterfly distribution plots for each CBI-R domain.
   *
   * Algorithm:
   *   For each integer x from 0 to 100 (representing % of max domain score):
   *     density(x) = Σ [ K((x - xᵢ) / h) ] / (n × h)
   *   where K is the Gaussian kernel:  K(u) = exp(-0.5 × u²)
   *   and the full normalisation is:   density / (n × h × √(2π))
   *
   * The x-axis spans 0–100 (percentage scale) with 1-unit resolution, giving
   * 101 density points per series — sufficient for smooth SVG path rendering.
   *
   * Guard: if the values array is empty, returns a flat zero-density array
   * instead of producing NaN values from division by zero.
   *
   * @param values    - Array of raw numeric scores from the cohort dataset
   * @param bandwidth - Smoothing parameter h (default: 5).
   *                    Higher values produce smoother / wider distributions.
   *                    Lower values produce spikier / narrower distributions.
   * @returns         - Array of 101 { x, density } objects (x: 0–100)
   */
  const calculateDensity = (values: number[], bandwidth: number = 5) => {
    // Guard: return a flat zero array when there are no data points to avoid
    // NaN values from division by zero (values.length === 0 → density = 0/0)
    if (values.length === 0) {
      return Array.from({ length: 101 }, (_, x) => ({ x, density: 0 }));
    }

    const densityPoints: { x: number; density: number }[] = [];
    for (let x = 0; x <= 100; x += 1) {
      let density = 0;
      values.forEach((value) => {
        // Compute the standardised distance from this value to the query point
        const diff = (x - value) / bandwidth;
        // Apply the Gaussian kernel function
        density += Math.exp(-0.5 * diff * diff);
      });
      // Normalise by the number of data points, bandwidth, and √(2π)
      density = density / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
      densityPoints.push({ x, density });
    }
    return densityPoints;
  };

  // ============================================================
  // PDF CHART DRAWING HELPERS
  // ============================================================

  /**
   * drawRadarChartToPDF
   *
   * Draws a complete radar (spider) chart onto the PDF canvas using jsPDF's
   * native drawing primitives. This avoids html2canvas limitations (hidden
   * accordion panels, cross-origin images, SVG rendering inconsistencies).
   *
   * Chart anatomy:
   *   - 10 axes radiating from the centre, one per CBI-R domain
   *   - Concentric grid polygons at 25%, 50%, 75%, and 100% of max radius
   *   - Percentage labels on the vertical axis (top spoke)
   *   - Domain name labels at the tip of each axis
   *   - Threshold polygon: grey-filled polygon connecting each domain's
   *     normative threshold percentage
   *   - Patient polygon: blue-filled polygon connecting each domain's
   *     actual score percentage; dots at each vertex are coloured red if
   *     the score is Above Norm, or blue if WNL
   *   - Legend: rendered to the right of the chart with swatches
   *
   * Coordinate system:
   *   - Origin at (centerX, centerY); angles start at the top (−π/2) and
   *     increase clockwise (matches standard compass layout)
   *   - All values are converted to % of max score before mapping to radius
   *
   * Polygon filling:
   *   jsPDF does not natively support arbitrary polygon fills, so a scanline
   *   rasterisation approach is used: for each horizontal scan line (y), the
   *   x-intercepts of the polygon edges are computed and a horizontal line
   *   segment is drawn between each pair, effectively "painting" the fill.
   *
   * @param doc     - The active jsPDF document instance
   * @param startX  - Left edge x-coordinate of the chart bounding box (mm)
   * @param startY  - Top edge y-coordinate of the chart bounding box (mm)
   * @param size    - Width and height of the square bounding box (mm)
   */
  const drawRadarChartToPDF = (
    doc: jsPDF,
    startX: number,
    startY: number,
    size: number
  ) => {
    const centerX = startX + size / 2;
    const centerY = startY + size / 2;
    const radius = size / 2 - 25;
    const numAxes = allCategoriesWithStatus.length;

    const shortLabels = [
      "Memory and Orientation",
      "Everyday Skills",
      "Self Care",
      "Abnormal Behaviour",
      "Mood",
      "Beliefs",
      "Eating Habits",
      "Sleep",
      "Stereotypic and Motor Behaviours",
      "Motivation",
    ];

    const angleStep = (2 * Math.PI) / numAxes;
    const getAngle = (i: number) => i * angleStep - Math.PI / 2;

    // --- Concentric grid polygons at 25%, 50%, 75%, 100% of radius ---
    [0.25, 0.5, 0.75, 1.0].forEach((scale) => {
      const points: [number, number][] = [];
      for (let i = 0; i < numAxes; i++) {
        const angle = getAngle(i);
        points.push([
          centerX + radius * scale * Math.cos(angle),
          centerY + radius * scale * Math.sin(angle),
        ]);
      }
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        doc.line(points[i][0], points[i][1], points[next][0], points[next][1]);
      }

      const labelAngle = getAngle(0);
      const labelX = centerX + radius * scale * Math.cos(labelAngle) + 2;
      const labelY = centerY + radius * scale * Math.sin(labelAngle);
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`${Math.round(scale * 100)}`, labelX, labelY);
    });

    // --- Axis lines from centre to each polygon vertex at full radius ---
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    for (let i = 0; i < numAxes; i++) {
      const angle = getAngle(i);
      doc.line(
        centerX,
        centerY,
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle)
      );
    }

    // --- Domain name labels at the tip of each axis ---
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    for (let i = 0; i < numAxes; i++) {
      const angle = getAngle(i);
      const labelRadius = radius + 20;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);
      const lines = doc.splitTextToSize(shortLabels[i], 30);
      const lineHeight = 3.5;
      const blockHeight = lines.length * lineHeight;
      lines.forEach((line: string, li: number) => {
        doc.text(line, x, y - blockHeight / 2 + li * lineHeight + lineHeight / 2, { align: "center" });
      });
    }

    const getPolygonPoints = (values: number[]): [number, number][] => {
      return values.map((val, i) => {
        const angle = getAngle(i);
        const r = (val / 100) * radius;
        return [
          centerX + r * Math.cos(angle),
          centerY + r * Math.sin(angle),
        ];
      });
    };

    const thresholdValues = allCategoriesWithStatus.map((category) => {
      return domainThresholdPercentages[category.index] ?? 0;
    });

    const patientValues = allCategoriesWithStatus.map((category) => {
      return category.maxScore > 0
        ? (category.score / category.maxScore) * 100
        : 0;
    });

    const thresholdPoints = getPolygonPoints(thresholdValues);
    const patientPoints = getPolygonPoints(patientValues);

    // Converts absolute polygon points to relative displacements for doc.lines()
    const toRelativeLines = (pts: [number, number][]): number[][] =>
      pts.slice(1).map((pt, i) => [pt[0] - pts[i][0], pt[1] - pts[i][1]]);

    // --- Draw threshold polygon (semi-transparent grey fill + outline) ---
    doc.setFillColor(220, 220, 220);
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.8);
    doc.setGState((doc as any).GState({ opacity: 0.3 }));
    doc.lines(toRelativeLines(thresholdPoints), thresholdPoints[0][0], thresholdPoints[0][1], [1, 1], "FD", true);
    doc.setGState((doc as any).GState({ opacity: 1.0 }));

    // --- Draw patient score polygon (semi-transparent light-blue fill + outline) ---
    doc.setFillColor(147, 197, 253);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1.5);
    doc.setGState((doc as any).GState({ opacity: 0.5 }));
    doc.lines(toRelativeLines(patientPoints), patientPoints[0][0], patientPoints[0][1], [1, 1], "FD", true);
    doc.setGState((doc as any).GState({ opacity: 1.0 }));

    // --- Vertex dots on the patient polygon ---
    patientPoints.forEach((point, i) => {
      const category = allCategoriesWithStatus[i];
      if (!category.hasMinimumData) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.circle(point[0], point[1], 2, "FD");
      } else {
        const correctedPct = category.maxScore > 0 ? (category.score / category.maxScore) * 100 : 0;
        const isAboveNorm = correctedPct >= (domainThresholdPercentages[category.index] ?? 0);
        doc.setFillColor(isAboveNorm ? 185 : 59, isAboveNorm ? 28 : 130, isAboveNorm ? 28 : 246);
        doc.circle(point[0], point[1], 2, "F");
      }
    });

    // ============================================================
    // RADAR CHART LEGEND
    // ============================================================

    const legendX = startX + size + 5;
    const legendItemX = legendX + 3;
    const legendTextX = legendItemX + 10;
    const legendMaxTextW = 25;
    const legendIconW = 8;
    const legendIconH = 3;
    const legendItemGap = 4;

    const radarLegendItems = [
      {
        type: "rect" as const,
        fill: [180, 180, 180] as number[],
        stroke: [150, 150, 150] as number[],
        label: "Normative Threshold",
      },
      {
        type: "rect" as const,
        fill: [147, 197, 253] as number[],
        stroke: [59, 130, 246] as number[],
        label: "Patient Score",
      },
    ];

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    const radarLegendWrapped = radarLegendItems.map((item) =>
      doc.splitTextToSize(item.label, legendMaxTextW)
    );

    const radarLegendItemsHeight = radarLegendWrapped.reduce((sum, lines) => {
      return sum + Math.max(legendIconH, lines.length * 4) + legendItemGap;
    }, 0);

    const radarLegendPaddingV = 6;
    const radarLegendTitleH = 10;
    const radarLegendBoxH =
      radarLegendPaddingV * 2 + radarLegendTitleH + radarLegendItemsHeight;
    const radarLegendBoxW = legendMaxTextW + legendIconW + 16;

    const radarLegendStartY = startY + (size - radarLegendBoxH) / 2;

    doc.setFillColor(252, 252, 252);
    doc.setLineWidth(0);
    doc.rect(legendX, radarLegendStartY, radarLegendBoxW, radarLegendBoxH, "F");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(
      "Legend",
      legendX + radarLegendBoxW / 2,
      radarLegendStartY + radarLegendPaddingV + 3,
      { align: "center" }
    );

    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(
      legendX + 3,
      radarLegendStartY + radarLegendPaddingV + 6,
      legendX + radarLegendBoxW - 3,
      radarLegendStartY + radarLegendPaddingV + 6
    );

    let radarLegendItemY =
      radarLegendStartY + radarLegendPaddingV + radarLegendTitleH;

    radarLegendItems.forEach((item, i) => {
      const iconMidY = radarLegendItemY + legendIconH / 2;
      const labelLines = radarLegendWrapped[i];

      if (item.type === "rect") {
        doc.setFillColor(item.fill[0], item.fill[1], item.fill[2]);
        doc.setDrawColor(item.stroke[0], item.stroke[1], item.stroke[2]);
        doc.setLineWidth(0.2);
        doc.rect(legendItemX, radarLegendItemY, legendIconW, legendIconH, "FD");
      } else if (item.type === "line") {
        doc.setDrawColor(item.stroke[0], item.stroke[1], item.stroke[2]);
        doc.setLineWidth(1.5);
        doc.line(legendItemX, iconMidY, legendItemX + legendIconW, iconMidY);
      }

      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      labelLines.forEach((line: string, li: number) => {
        doc.text(line, legendTextX, radarLegendItemY + 3.5 + li * 4);
      });

      const textTotalH = labelLines.length * 4;
      radarLegendItemY += Math.max(legendIconH, textTotalH) + legendItemGap;
    });

    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.5);
  };

  /**
   * drawDistributionPlotsToPDF
   *
   * Draws all 10 CBI-R domain distribution plots onto the PDF canvas in a
   * 2-column × 5-row grid filling the full available width, with a horizontal
   * legend panel beneath them.
   *
   * Each plot has:
   *   - A bold subdomain title above the plot area (not inside)
   *   - Control distribution (lighter blue) above a subtle centreline
   *   - Dementia distribution (medium blue) below the centreline
   *   - A red dashed vertical line at the normative threshold
   *   - A solid slate vertical line + small "Current Patient" label
   *   - 0% / 100% axis labels below the plot
   */
  const drawDistributionPlotsToPDF = (
    doc: jsPDF,
    startX: number,
    startY: number,
    availableWidth: number,
    availableHeight: number
  ) => {
    // ----- Layout constants -----
    const legendHeight = 22;
    const legendGap = 8;
    const plotAreaHeight = availableHeight - legendHeight - legendGap;

    // Per-cell vertical bands: title | plot | axis labels
    const titleHeight = 6;
    const axisLabelHeight = 5;
    const rowGap = 10;
    const colGap = 14;

    const plotWidth = (availableWidth - colGap) / 2;
    const totalRows = 5;
    const rowFixed = titleHeight + axisLabelHeight;
    const totalFixed = totalRows * rowFixed + (totalRows - 1) * rowGap;
    const plotHeight = (plotAreaHeight - totalFixed) / totalRows;
    const clampedPlotHeight = Math.max(22, Math.min(plotHeight, 32));
    const rowContentHeight =
      titleHeight + clampedPlotHeight + axisLabelHeight;
    const gridHeight =
      totalRows * rowContentHeight + (totalRows - 1) * rowGap;

    const shortLabels = [
      "Memory & Orientation",
      "Everyday Skills",
      "Self Care",
      "Abnormal Behaviour",
      "Mood",
      "Beliefs",
      "Eating Habits",
      "Sleep",
      "Stereotypic & Motor Behaviours",
      "Motivation",
    ];

    // ----- Draw each plot -----
    domains.forEach((domain, idx) => {
      const col = idx < 5 ? 0 : 1;
      const row = idx < 5 ? idx : idx - 5;

      const cellX = startX + col * (plotWidth + colGap);
      const cellY = startY + row * (rowContentHeight + rowGap);

      // --- Title band (above the plot) ---
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(shortLabels[idx], cellX, cellY + 4);

      // --- Plot geometry ---
      const plotX = cellX;
      const plotY = cellY + titleHeight;
      const midY = plotY + clampedPlotHeight / 2;
      const topReserve = 7; // reserves vertical space for patient label
      const maxBarHeight = clampedPlotHeight / 2 - topReserve / 2;

      const categoryIndex = domainKeyToCategoryIndex[domain.key] ?? 0;
      const category = allCategoriesWithStatus[categoryIndex];
      if (!category) return;

      const patientPercentage =
        category.maxScore > 0
          ? (category.score / category.maxScore) * 100
          : 0;
      const thresholdPercentage = domainThresholdPercentages[categoryIndex] ?? 0;

      const { controlRaw, dementiaRaw } =
        precomputedCohortArrays[domain.key] ?? {
          controlRaw: [],
          dementiaRaw: [],
        };

      const controlDensity = calculateDensity(controlRaw, 5);
      const dementiaDensity = calculateDensity(dementiaRaw, 5);

      const maxDensity = Math.max(
        ...controlDensity.map((d) => d.density),
        ...dementiaDensity.map((d) => d.density),
        0.0001
      );

      const toX = (pct: number) => plotX + (pct / 100) * plotWidth;
      const insuf = !category.hasMinimumData;

      // --- Control distribution ---
      const controlFiltered = controlDensity.filter((p) => {
        const x = toX(p.x);
        return x >= plotX && x <= plotX + plotWidth;
      });
      if (controlFiltered.length > 1) {
        const startX = toX(controlFiltered[0].x);
        const firstH = (controlFiltered[0].density / maxDensity) * maxBarHeight;
        const pathLines: number[][] = [[0, -firstH]];
        let prevX = startX;
        let prevY = midY - firstH;
        for (let pi = 1; pi < controlFiltered.length; pi++) {
          const cx = toX(controlFiltered[pi].x);
          const cy = midY - (controlFiltered[pi].density / maxDensity) * maxBarHeight;
          pathLines.push([cx - prevX, cy - prevY]);
          prevX = cx; prevY = cy;
        }
        const lastH = (controlFiltered[controlFiltered.length - 1].density / maxDensity) * maxBarHeight;
        pathLines.push([0, lastH]);
        doc.setFillColor(...(insuf ? [209, 213, 219] : [191, 219, 254]) as [number, number, number]);
        doc.setDrawColor(...(insuf ? [156, 163, 175] : [147, 197, 253]) as [number, number, number]);
        doc.setLineWidth(0.5);
        doc.lines(pathLines, startX, midY, [1, 1], "FD", true);
      }

      // --- Dementia distribution ---
      const dementiaFiltered = dementiaDensity.filter((p) => {
        const x = toX(p.x);
        return x >= plotX && x <= plotX + plotWidth;
      });
      if (dementiaFiltered.length > 1) {
        const startX = toX(dementiaFiltered[0].x);
        const firstH = (dementiaFiltered[0].density / maxDensity) * maxBarHeight;
        const pathLines: number[][] = [[0, firstH]];
        let prevX = startX;
        let prevY = midY + firstH;
        for (let pi = 1; pi < dementiaFiltered.length; pi++) {
          const cx = toX(dementiaFiltered[pi].x);
          const cy = midY + (dementiaFiltered[pi].density / maxDensity) * maxBarHeight;
          pathLines.push([cx - prevX, cy - prevY]);
          prevX = cx; prevY = cy;
        }
        const lastH = (dementiaFiltered[dementiaFiltered.length - 1].density / maxDensity) * maxBarHeight;
        pathLines.push([0, -lastH]);
        doc.setFillColor(...(insuf ? [156, 163, 175] : [96, 165, 250]) as [number, number, number]);
        doc.setDrawColor(...(insuf ? [107, 114, 128] : [59, 130, 246]) as [number, number, number]);
        doc.setLineWidth(0.5);
        doc.lines(pathLines, startX, midY, [1, 1], "FD", true);
      }

      // --- Subtle centreline ---
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(plotX, midY, plotX + plotWidth, midY);

      const lineTopY = midY - maxBarHeight;
      const lineBottomY = midY + maxBarHeight;

      // --- Normative threshold line ---
      const threshX = toX(thresholdPercentage);
      doc.setDrawColor(...(insuf ? [156, 163, 175] : [220, 38, 38]) as [number, number, number]);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(threshX, lineTopY, threshX, lineBottomY);
      doc.setLineDashPattern([], 0);

      // --- Current patient marker + label ---
      if (category.isComplete) {
        const patientX = toX(patientPercentage);
        const patientColor = insuf ? [156, 163, 175] : [15, 23, 42];
        doc.setDrawColor(...patientColor as [number, number, number]);
        doc.setLineWidth(0.5);
        doc.line(patientX, lineTopY, patientX, lineBottomY);

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...patientColor as [number, number, number]);
        doc.text("Current Patient", patientX, lineTopY - 1.5, {
          align: "center",
        });
        doc.setTextColor(0, 0, 0);
      }

      // --- Subtle baseline under the plot (slate-200) ---
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(
        plotX,
        plotY + clampedPlotHeight,
        plotX + plotWidth,
        plotY + clampedPlotHeight
      );

      // --- Axis labels (below the plot) ---
      const axisY = plotY + clampedPlotHeight + 3.5;
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("0%", plotX, axisY);
      doc.text("100%", plotX + plotWidth, axisY, { align: "right" });
    });

    // ============================================================
    // HORIZONTAL LEGEND PANEL (below the plots)
    // ============================================================
    const legendY = startY + gridHeight + legendGap;
    const legendBoxW = availableWidth;

    const legendItems = [
      {
        type: "rect" as const,
        fill: [191, 219, 254] as number[], // blue-200
        stroke: [147, 197, 253] as number[], // blue-300
        label: "Distribution of control participants (above the line)",
      },
      {
        type: "rect" as const,
        fill: [96, 165, 250] as number[], // blue-400
        stroke: [59, 130, 246] as number[], // blue-500
        label: "Distribution of persons living with dementia (below the line)",
      },
      {
        type: "solidline" as const,
        fill: [15, 23, 42] as number[],
        stroke: [15, 23, 42] as number[],
        label: "Current Patient",
      },
      {
        type: "dashline" as const,
        fill: [220, 38, 38] as number[],
        stroke: [220, 38, 38] as number[],
        label: "Normative Threshold",
      },
    ];

    // Subtle slate-tinted background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.rect(startX, legendY, legendBoxW, legendHeight, "FD");

    // Legend title
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Legend", startX + legendBoxW / 2, legendY + 4.5, {
      align: "center",
    });

    // Separator line below the title
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(startX + 5, legendY + 7, startX + legendBoxW - 5, legendY + 7);

    // Four items distributed evenly
    const numItems = legendItems.length;
    const itemWidth = legendBoxW / numItems;
    const itemPadding = 5;
    const iconW = 12;
    const iconH = 3.5;
    const itemsTopY = legendY + 11;
    const maxLabelW = itemWidth - iconW - itemPadding * 2;

    legendItems.forEach((item, i) => {
      const itemX = startX + i * itemWidth + itemPadding;
      const iconMidY = itemsTopY + iconH / 2;

      if (item.type === "rect") {
        doc.setFillColor(item.fill[0], item.fill[1], item.fill[2]);
        doc.setDrawColor(item.stroke[0], item.stroke[1], item.stroke[2]);
        doc.setLineWidth(0.2);
        doc.rect(itemX, itemsTopY, iconW, iconH, "FD");
      } else if (item.type === "solidline") {
        doc.setDrawColor(item.stroke[0], item.stroke[1], item.stroke[2]);
        doc.setLineWidth(0.8);
        doc.line(itemX, iconMidY, itemX + iconW, iconMidY);
      } else if (item.type === "dashline") {
        doc.setDrawColor(item.stroke[0], item.stroke[1], item.stroke[2]);
        doc.setLineWidth(0.8);
        doc.setLineDashPattern([1.2, 1.2], 0);
        doc.line(itemX, iconMidY, itemX + iconW, iconMidY);
        doc.setLineDashPattern([], 0);
      }

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // slate-600
      const labelLines = doc.splitTextToSize(item.label, maxLabelW);
      labelLines.forEach((line: string, li: number) => {
        doc.text(
          line,
          itemX + iconW + itemPadding,
          itemsTopY + 3 + li * 3.2
        );
      });
    });

    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.5);
  };

  /**
   * domainKeyToCategoryIndex
   *
   * Maps each domain's string key to its zero-based index in the
   * `categories` / `allCategoriesWithStatus` arrays.
   * A fallback of 0 should be applied at call sites via the ?? operator
   * to guard against missing keys causing undefined array lookups.
   */
  const domainKeyToCategoryIndex: Record<string, number> = {
    memoryOrientation: 0,
    everydaySkills: 1,
    selfCare: 2,
    abnormalBehaviour: 3,
    mood: 4,
    beliefs: 5,
    eatingHabits: 6,
    sleep: 7,
    stereotypicMotor: 8,
    motivation: 9,
  };

  // ============================================================
  // JSX RENDERING
  // ============================================================

  return (
    <>
      {/* ===== TERMS & CONDITIONS MODAL ===== */}
      {showTermsModal && (
        <TermsModal
          onAccept={handleAcceptTerms}
          onDecline={handleDeclineTerms}
        />
      )}

      {/* ===== MAIN PAGE CONTENT ===== */}
      {hasAcceptedTerms && (
        <div className="space-y-3 max-w-7xl mx-auto pb-16">

          {/*
           * Inline success banner — replaces the disruptive native alert() that
           * previously appeared on submission. Auto-dismisses after 4 seconds
           * via the setTimeout in handleSubmit. Fixed top-right so it appears
           * above all content without shifting the page layout.
           */}
          {submitSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
              <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
                <div className="px-8 pt-8 pb-6">
                  <p className="text-slate-500 text-lg leading-relaxed">
                    {isResubmission
                      ? "Report updated successfully! See below for score summaries and graphs."
                      : "Scores submitted successfully! See below for score summaries and graphs."}
                  </p>
                </div>
                <div className="border-t border-slate-200 px-8 py-4 flex justify-end">
                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="text-blue-500 font-semibold text-base hover:text-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ----- Informational Alert Banner ----- */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="block w-full text-slate-700 leading-relaxed">
              This tool is based on data from Foxe et al. The Cambridge
              Behavioural Inventory-Revised: Normative Characteristics and
              Interpretation{" "}
              <a
                href="https://osf.io/7emb8/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                https://osf.io/7emb8/
              </a>
              . It is intended for use by clinicians experienced in
              administering and interpreting the CBI-R. Please review the{" "}
              <Link
                href="/about"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                About section
              </Link>{" "}
              before proceeding.
            </AlertDescription>
          </Alert>

          {/* ----- Page Heading + Instructions ----- */}
          <div>
            <h2 className="text-2xl text-slate-900 mb-1">
              Enter the Patient&apos;s Scores
            </h2>
            <p className="text-sm text-slate-600">
              Complete the assessment by entering a score for each item. Select
              the number that best describes the frequency of the behavioural
              change over the past month. Some everyday skills may not apply
              (for example, if the person has never done the shopping). In
              these cases, select N/A (Not applicable).
            </p>
          </div>

          {/* ----- Sticky Scoring Scale Reference Card ----- */}
          <div className="sticky top-0 z-10 bg-white pt-2 pb-2">
            <Card className="bg-slate-50 border-slate-200 shadow-md">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-2 text-sm">
                      Scoring Scale
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                      {[
                        { label: "N/A", desc: "Not applicable" },
                        { label: "0", desc: "Never" },
                        { label: "1", desc: "A few times per month" },
                        { label: "2", desc: "A few times per week" },
                        { label: "3", desc: "Daily" },
                        { label: "4", desc: "Constantly" },
                      ].map(({ label, desc }) => (
                        <div key={label} className="space-y-0.5">
                          <div className="text-xl font-bold text-slate-900">
                            {label}
                          </div>
                          <div className="text-xs text-slate-600">{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===== ASSESSMENT FORM ===== */}
          <form
            onSubmit={handleSubmit}
            id="assessment-form"
            className="space-y-3"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

              {/*
               * Columns 1 and 2 now use the shared CategoryColumn component
               * instead of duplicated JSX. indexOffset 0 for col 1, 5 for col 2.
               */}
              <CategoryColumn
                categoriesSlice={categories.slice(0, 5)}
                indexOffset={0}
                allCategories={categories}
                scores={scores}
                onScoreChange={handleScoreChange}
                getRadioButtonClass={getRadioButtonClass}
              />

              <CategoryColumn
                categoriesSlice={categories.slice(5)}
                indexOffset={5}
                allCategories={categories}
                scores={scores}
                onScoreChange={handleScoreChange}
                getRadioButtonClass={getRadioButtonClass}
              />

              {/* ===== COLUMN 3: Summary / Heat Map Panel ===== */}
              <div className="space-y-3">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 sticky top-32">
                  <CardHeader className="pb-2 pt-3 px-4" />
                  <CardContent className="pt-0 pb-3 px-4">
                    <Tabs defaultValue="summary" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-3 bg-white border border-slate-200">
                        <TabsTrigger
                          value="summary"
                          className="text-xs font-semibold data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=inactive]:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all duration-150"
                        >
                          Summary
                        </TabsTrigger>
                        <TabsTrigger
                          value="heatmap"
                          className="text-xs font-semibold data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=inactive]:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all duration-150"
                        >
                          Heat Map
                        </TabsTrigger>
                      </TabsList>

                      {/* ----- Summary Tab Content ----- */}
                      <TabsContent value="summary" className="space-y-3 mt-0">
                        {allCategoriesWithStatus.map((category) => {
                          const Icon = category.icon;
                          if (category.isComplete) {
                            return (
                              <div
                                key={category.index}
                                className="bg-white rounded-lg p-3 border border-slate-200"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon className="h-3.5 w-3.5 text-blue-600" />
                                  <h4 className="text-xs font-semibold text-slate-900">
                                    {category.title}
                                  </h4>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-600">
                                      Total Score:
                                    </span>
                                    <span className="text-xs font-bold text-slate-900">
                                      {category.score} / {category.maxScore}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {category.items.map((_, itemIndex) => {
                                      const itemKey = `${category.index}-${itemIndex}`;
                                      const itemScore = scores[itemKey] || "";
                                      const isNA = itemScore === "N/A";
                                      return (
                                        <div
                                          key={itemIndex}
                                          className="flex flex-col items-center gap-0.5"
                                          title={`Item ${
                                            category.startingNumber +
                                            itemIndex +
                                            1
                                          }: Score ${itemScore}`}
                                        >
                                          <div
                                            className={`w-2.5 h-2.5 rounded-full ${getScoreIndicatorColor(
                                              itemScore
                                            )}`}
                                          />
                                          <span
                                            className={`text-[9px] text-slate-500 ${
                                              isNA
                                                ? "line-through opacity-40"
                                                : ""
                                            }`}
                                          >
                                            {category.startingNumber +
                                              itemIndex +
                                              1}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                      <div
                                        className="bg-slate-600 h-1.5 rounded-full transition-all duration-300"
                                        style={{
                                          width: `${
                                            (category.score /
                                              category.maxScore) *
                                            100
                                          }%`,
                                        }}
                                      />
                                    </div>
                                    <p className="text-[9px] text-slate-600 text-right">
                                      {Math.round(
                                        (category.score /
                                          category.maxScore) *
                                          100
                                      )}
                                      % of max
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={category.index}
                              className="bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className="h-3.5 w-3.5 text-gray-400" />
                                <h4 className="text-xs font-semibold text-gray-500">
                                  {category.title}
                                </h4>
                              </div>
                              <p className="text-[10px] text-gray-400 italic">
                                Not completed
                              </p>
                            </div>
                          );
                        })}
                      </TabsContent>

                      {/* ----- Heat Map Tab Content ----- */}
                      <TabsContent value="heatmap" className="space-y-2 mt-0">
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                            <span className="text-[9px] text-slate-600 font-semibold">
                              Intensity:
                            </span>
                            <div className="flex gap-1">
                              {[
                                { bg: "#FFFFFF", title: "0" },
                                { bg: "#BBDEFB", title: "1" },
                                { bg: "#64B5F6", title: "2" },
                                { bg: "#42A5F5", title: "3" },
                                { bg: "#1565C0", title: "4" },
                              ].map(({ bg, title }) => (
                                <div
                                  key={title}
                                  className="w-4 h-3 border border-slate-300"
                                  style={{ backgroundColor: bg }}
                                  title={title}
                                />
                              ))}
                            </div>
                            <span className="text-[9px] text-slate-500">
                              (0 → 4)
                            </span>
                          </div>

                          {/* Overall Grid */}
                          <div className="grid grid-cols-9 gap-0.5 mb-3">
                            {allCategoriesWithStatus.flatMap((category) =>
                              category.items.map((_, itemIndex) => {
                                const itemKey = `${category.index}-${itemIndex}`;
                                const itemScore = scores[itemKey] || "";
                                const questionNumber =
                                  category.startingNumber + itemIndex + 1;
                                const isNA = itemScore === "N/A";
                                return (
                                  <div
                                    key={itemKey}
                                    className={`aspect-square ${getHeatMapColor(
                                      itemScore
                                    )} border border-slate-300 transition-colors flex items-center justify-center relative group`}
                                    title={`Q${questionNumber} (${category.title}): ${
                                      itemScore || "No data"
                                    }`}
                                    style={getHeatMapStyle(itemScore)}
                                  >
                                    <span
                                      className={`text-[8px] font-semibold text-slate-700 opacity-70 ${
                                        isNA ? "line-through" : ""
                                      }`}
                                    >
                                      {questionNumber}
                                    </span>
                                    <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9px] px-2 py-1 rounded shadow-lg z-10 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                      Q{questionNumber}: {itemScore || "—"}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Grouped by Category */}
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            {allCategoriesWithStatus.map((category) => {
                              const Icon = category.icon;
                              const startQ = category.startingNumber + 1;
                              const endQ =
                                category.startingNumber +
                                category.items.length;
                              return (
                                <div
                                  key={category.index}
                                  className="space-y-0.5"
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Icon className="h-3 w-3 text-slate-600" />
                                    <span className="text-[10px] font-semibold text-slate-700">
                                      {category.title}
                                    </span>
                                    <span className="text-[9px] text-slate-400">
                                      (Q{startQ}-{endQ})
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-0.5">
                                    {category.items.map((_, itemIndex) => {
                                      const itemKey = `${category.index}-${itemIndex}`;
                                      const itemScore =
                                        scores[itemKey] || "";
                                      const questionNumber =
                                        category.startingNumber +
                                        itemIndex +
                                        1;
                                      const isNA = itemScore === "N/A";
                                      return (
                                        <div
                                          key={itemKey}
                                          className={`w-9 h-9 ${getHeatMapColor(
                                            itemScore
                                          )} border border-slate-300 transition-colors flex items-center justify-center relative group`}
                                          title={`Q${questionNumber}: ${
                                            itemScore || "No data"
                                          }`}
                                          style={getHeatMapStyle(itemScore)}
                                        >
                                          <span
                                            className={`text-[9px] font-semibold text-slate-700 ${
                                              isNA
                                                ? "line-through opacity-40"
                                                : ""
                                            }`}
                                          >
                                            {questionNumber}
                                          </span>
                                          <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9px] px-2 py-1 rounded shadow-lg z-10 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            Q{questionNumber}:{" "}
                                            {itemScore || "—"}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

            </div>
          </form>

          {/* ===== STICKY SUBMIT / EXPORT BAR ===== */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg py-3 z-20">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">

                {/* Progress indicator */}
                <div className="w-full sm:flex-1 sm:max-w-md">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">Progress</span>
                    <span className="font-semibold text-slate-900">
                      {completedQuestions} / {totalQuestions}
                    </span>
                  </div>
                  {/*
                   * Progress bar with ARIA attributes so screen readers can
                   * announce the completion state without relying on the
                   * visual bar width alone.
                   */}
                  <div
                    role="progressbar"
                    aria-valuenow={completedQuestions}
                    aria-valuemin={0}
                    aria-valuemax={totalQuestions}
                    aria-label="Assessment completion progress"
                    className="w-full bg-slate-200 rounded-full h-2"
                  >
                    <div
                      className="bg-black h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex w-full sm:w-auto gap-2 sm:gap-3 shrink-0">
                  <Button
                    type="submit"
                    form="assessment-form"
                    disabled={completedQuestions !== totalQuestions}
                    className={`h-10 px-6 transition-all shadow-md hover:shadow-lg ${
                      isSubmitted
                        ? "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                        : "bg-blue-600 hover:bg-gray-800 active:bg-gray-900 text-white disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                    }`}
                  >
                    {isSubmitted ? "Re-Submit to Update Report" : "Submit Assessment"}
                  </Button>

                  {isSubmitted && (
                    <Button
                      type="button"
                      onClick={exportToPDF}
                      disabled={completedQuestions === 0}
                      className="h-10 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer transition-all shadow-md hover:shadow-lg"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export to PDF
                    </Button>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* ===== ASSESSMENT REPORT ===== */}
          {isSubmitted && (
            <div className="mt-8 space-y-6">
              <Accordion
                type="multiple"
                defaultValue={[
                  "domain-summary",
                  "domain-plots",
                  "item-scores",
                ]}
                className="w-full bg-white border border-slate-200 rounded-lg"
              >

                {/* ===== ACCORDION SECTION 1: Domain Summary ===== */}
                <AccordionItem value="domain-summary">
                  <AccordionTrigger className="px-6 hover:no-underline hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-slate-900">
                          CBI-R domain summary
                        </h3>
                        <p className="text-xs text-slate-500">
                          Higher scores reflect more frequent behavioural,
                          cognitive, or mood-related concerns. Total domain
                          scores are evaluated against a normative threshold:
                          scores below the threshold are categorised as within
                          normal limits (WNL), while scores above the threshold
                          are classified as above normal (Above Norm). If a 
                          domain has too few answered items, it will be flagged
                          as having insuffient data.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8">

                      {/* Domain Summary Table */}
                      <div className="overflow-x-auto flex items-center">
                        <table className="border-collapse">
                          <thead>
                            <tr
                              className="text-white"
                              style={{ backgroundColor: "#5B6B7E" }}
                            >
                              <th className="text-left py-2 px-3 font-semibold text-xs">
                                Subdomain
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-xs">
                                Total
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-xs">
                                Corrected %
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-xs">
                                % Threshold
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-xs">
                                Summary
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {allCategoriesWithStatus.map((category, idx) => {
                              const Icon = category.icon;
                              const correctedPct =
                                category.maxScore > 0
                                  ? (category.score / category.maxScore) * 100
                                  : 0;
                              const thresholdPct =
                                domainThresholdPercentages[category.index] ?? 0;
                              const summary = !category.hasMinimumData
                                ? "Insufficient data"
                                : correctedPct >= thresholdPct
                                ? "Above Norm"
                                : "WNL";
                              const summaryColor = !category.hasMinimumData
                                ? "text-slate-400"
                                : correctedPct >= thresholdPct
                                ? "text-red-700"
                                : "text-slate-600";
                              return (
                                <tr
                                  key={category.index}
                                  className={
                                    idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                                  }
                                >
                                  <td className="py-2 px-3 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                      <span className="text-xs text-slate-800 whitespace-nowrap">
                                        {category.title}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center border-b border-slate-200">
                                    <span className="text-xs text-slate-800">
                                      {category.score} / {category.maxScore}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-center border-b border-slate-200">
                                    <span className="text-xs text-slate-800">
                                      {correctedPct.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-center border-b border-slate-200">
                                    <span className="text-xs text-slate-800">
                                      {thresholdPct}%
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-center border-b border-slate-200">
                                    <span
                                      className={`text-xs font-medium ${summaryColor} whitespace-nowrap`}
                                    >
                                      {summary}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Recharts Radar Chart */}
                      <div
                        className="flex flex-col"
                        id="radar-chart-container"
                      >
                        <h4 className="text-sm font-semibold text-slate-900 mb-2 text-center">
                          CBI-R domain profile with normative thresholds
                        </h4>
                        <ResponsiveContainer width="100%" height={400}>
                          <RadarChart
                            margin={{ top: 10, right: 30, bottom: 10, left: 80 }}
                            data={allCategoriesWithStatus.map((category) => {
                              const patientPercentage =
                                category.maxScore > 0
                                  ? (category.score / category.maxScore) * 100
                                  : 0;
                              const thresholdPercentage =
                                domainThresholdPercentages[category.index] ?? 0;
                              return {
                                domain: category.title,
                                "Patient Score": Math.round(patientPercentage),
                                "Normative Threshold":
                                  Math.round(thresholdPercentage),
                                aboveNorm: category.hasMinimumData && patientPercentage >= thresholdPercentage,
                                hasMinimumData: category.hasMinimumData,
                              };
                            })}
                          >
                            <PolarGrid stroke="#cbd5e1" />
                            <PolarAngleAxis
                              dataKey="domain"
                              tick={(props: any) => {
                                const { x, y, payload, textAnchor } = props;
                                const label: string = payload.value;
                                const lines =
                                  label === "Stereotypic and Motor Behaviours"
                                    ? ["Stereotypic and", "Motor Behaviours"]
                                    : [label];
                                return (
                                  <text x={x} y={y} textAnchor={textAnchor} fill="#475569" fontSize={10}>
                                    {lines.map((line, i) => (
                                      <tspan
                                        key={i}
                                        x={x}
                                        dy={i === 0 ? (lines.length > 1 ? "-0.6em" : "-0.1em") : "1.1em"}
                                      >
                                        {line}
                                      </tspan>
                                    ))}
                                  </text>
                                );
                              }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={{ fill: "#64748b", fontSize: 9 }}
                            />
                            <Radar
                              name="Normative Threshold"
                              dataKey="Normative Threshold"
                              stroke="#9ca3af"
                              fill="#9ca3af"
                              fillOpacity={0.3}
                            />
                            <Radar
                              name="Patient Score"
                              dataKey="Patient Score"
                              stroke="#3b82f6"
                              fill="#3b82f6"
                              fillOpacity={0.5}
                              dot={(props: any) => {
                                const { cx, cy, payload } = props;
                                if (!payload.hasMinimumData) {
                                  return (
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={4}
                                      fill="white"
                                      stroke="#3b82f6"
                                      strokeWidth={2}
                                    />
                                  );
                                }
                                if (payload.aboveNorm) {
                                  return (
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={4}
                                      fill="#b91c1c"
                                      stroke="#b91c1c"
                                      strokeWidth={2}
                                    />
                                  );
                                }
                                return <></>;
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                            <RechartsTooltip
                              contentStyle={{
                                fontSize: "12px",
                                backgroundColor: "white",
                                border: "1px solid #e2e8f0",
                              }}
                              formatter={(value: any) => `${value}%`}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-slate-600 mt-2 text-center">
                          Scores are shown as a percentage of the maximum
                          possible domain score. Higher scores indicate more
                          frequent behavioural, cognitive, or mood-related
                          concerns. Red markers indicate patient domain scores 
                          above the normative threshold. Hollow markers indicate 
                          that there is insufficient data.
                        </p>
                      </div>

                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ===== ACCORDION SECTION 2: Domain Distribution Plots ===== */}
                <AccordionItem value="domain-plots">
                  <AccordionTrigger className="px-6 hover:no-underline hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-slate-900">
                          CBI-R domain distribution plots
                        </h3>
                        <p className="text-xs text-slate-500">
                          The below graph compares the patient's CBI-R domain
                          scores with dementia and healthy control reference
                          distributions. Scores are shown as a percentage of
                          the maximum possible score. Higher scores indicate
                          more frequent behavioural, cognitive, or mood-related
                          concerns. Scores to the right of the dotted line are
                          above normal. If a domain has too few answered items, it
                          will be flagged as having insufficient data, and the plot
                          will therefore be greyed out.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_auto] gap-8">

                      {/* Distribution Plots Grid */}
                      <div
                        className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3"
                        id="distribution-plots-container"
                        >
                        {/* Left sub-column: domains 0–4 */}
                        <div className="space-y-3">
                          {domains.slice(0, 5).map((domain, idx) => {
                            const categoryIndex =
                              domainKeyToCategoryIndex[domain.key] ?? 0;
                            const category =
                              allCategoriesWithStatus[categoryIndex];
                            if (!category) return null;
                            const patientPercentage =
                              category.maxScore > 0
                                ? (category.score / category.maxScore) * 100
                                : 0;
                            const thresholdPercentage =
                              domainThresholdPercentages[categoryIndex] ?? 0;
                            return (
                              <DistributionPlot
                                key={domain.key}
                                domain={domain}
                                idx={idx}
                                category={category}
                                patientPercentage={patientPercentage}
                                thresholdPercentage={thresholdPercentage}
                                calculateDensity={calculateDensity}
                                cohortData={cohortData as CohortEntry[]}
                              />
                            );
                          })}
                        </div>

                        {/* Right sub-column: domains 5–9 */}
                        <div className="space-y-3">
                          {domains.slice(5).map((domain, idx) => {
                            const categoryIndex =
                              domainKeyToCategoryIndex[domain.key] ?? 0;
                            const category =
                              allCategoriesWithStatus[categoryIndex];
                            if (!category) return null;
                            const patientPercentage =
                              category.maxScore > 0
                                ? (category.score / category.maxScore) * 100
                                : 0;
                            const thresholdPercentage =
                              domainThresholdPercentages[categoryIndex] ?? 0;
                            return (
                              <DistributionPlot
                                key={domain.key}
                                domain={domain}
                                idx={idx}
                                category={category}
                                patientPercentage={patientPercentage}
                                thresholdPercentage={thresholdPercentage}
                                calculateDensity={calculateDensity}
                                cohortData={cohortData as CohortEntry[]}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Distribution Plots Legend */}
                      <div className="flex flex-col gap-3 min-w-[180px] justify-center">
                        <div className="bg-white p-3 rounded border border-slate-200">
                          <h4 className="text-xs font-semibold text-slate-900 mb-3">
                            Legend
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div
                                className="w-5 h-3 rounded mt-0.5"
                                style={{
                                  backgroundColor: "#93c5fd",
                                  border: "1px solid #60a5fa",
                                }}
                              />
                              <span className="text-xs text-slate-700">
                                Distribution of
                                <br />
                                control participants
                                <br />
                                (above the line)
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div
                                className="w-5 h-3 rounded mt-0.5"
                                style={{
                                  backgroundColor: "#3b82f6",
                                  border: "1px solid #2563eb",
                                }}
                              />
                              <span className="text-xs text-slate-700">
                                Distribution of
                                <br />
                                persons living
                                <br />
                                with dementia
                                <br />
                                (below the line)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg width="20" height="12">
                                <line
                                  x1="0"
                                  y1="6"
                                  x2="20"
                                  y2="6"
                                  stroke="#000000"
                                  strokeWidth="2"
                                />
                              </svg>
                              <span className="text-xs text-slate-700">
                                Current Patient
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg width="20" height="12">
                                <line
                                  x1="0"
                                  y1="6"
                                  x2="20"
                                  y2="6"
                                  stroke="#b91c1c"
                                  strokeWidth="1.5"
                                  strokeDasharray="3,3"
                                />
                              </svg>
                              <span className="text-xs text-slate-700">
                                Normative
                                <br />
                                Threshold
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ===== ACCORDION SECTION 3: Item Scores ===== */}
                <AccordionItem value="item-scores">
                  <AccordionTrigger className="px-6 hover:no-underline hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <ClipboardList className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-slate-900">
                          CBI-R item scores
                        </h3>
                        <p className="text-xs text-slate-500">
                          Items reflect the frequency of behavioural change,
                          rated as: 0 = Never; 1 = a few times/month; 2 = a
                          few times/week; 3 = daily; 4 = constantly. WNL
                          (Within Normal Limits): Scores within the expected
                          normative range. Above Norm: Scores exceeding the
                          expected normative range, indicating more frequent
                          behaviour than typical.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6">
                    {/*
                     * Left and right columns now use the shared DomainScoreTable
                     * component instead of duplicated JSX.
                     */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
                      <DomainScoreTable
                        categories={allCategoriesWithStatus.slice(0, 5)}
                        scores={scores}
                        itemThresholds={itemThresholds}
                      />
                      <DomainScoreTable
                        categories={allCategoriesWithStatus.slice(5)}
                        scores={scores}
                        itemThresholds={itemThresholds}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          )}

        </div>
      )}
    </>
  );
}