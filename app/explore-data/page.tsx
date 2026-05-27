'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { cohortData, domains, type DataPoint, type DomainKey, DIAGNOSIS_TYPES, type DiagnosisType } from '@/processed_data/cohortData';
import { Brain, Wrench, User, AlertCircle, Heart, Eye, Utensils, Moon, RotateCw, Target } from 'lucide-react';
import { usePatientScores, usePatientMinimumData } from '@/contexts/PatientScoresContext';

// Deterministic jitter function based on string hash
function getJitter(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return ((hash % 100) / 100 - 0.5) * 0.3;
}

// Map domain keys to their icons
const domainIcons: Record<DomainKey, React.ElementType> = {
  memoryOrientation: Brain,
  everydaySkills: Wrench,
  selfCare: User,
  abnormalBehaviour: AlertCircle,
  mood: Heart,
  beliefs: Eye,
  eatingHabits: Utensils,
  sleep: Moon,
  stereotypicMotor: RotateCw,
  motivation: Target,
};

interface ChartProps {
  title: string;
  domainKey: DomainKey;
  data: Array<{
    score: number;
    diagnosisGroup: string;
    id: string;
    jitter: number;
  }>;
  patientScore?: number | null;
  hasMinimumData?: boolean | null;
}

function DomainChart({ title, domainKey, data, patientScore, hasMinimumData }: ChartProps) {
  const Icon = domainIcons[domainKey];
  const [hoveredPoint, setHoveredPoint] = useState<{ score: number; diagnosisGroup: string; x: number; y: number } | null>(null);
  const [isHoveringPatientLine, setIsHoveringPatientLine] = useState(false);

  // Check if patientScore is a valid number
  const hasValidPatientScore = patientScore != null && typeof patientScore === 'number' && !isNaN(patientScore);

  // Grey out patient marker when domain has insufficient data
  const isInsufficient = hasMinimumData === false;
  const patientColor = isInsufficient ? '#9ca3af' : '#000000';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="relative" style={{ height: '170px' }}>
        <svg width="100%" height="100%" viewBox="0 0 400 170" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines - vertical lines for percentage scores (100 on left, 0 on right) */}
          {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((percent) => {
            const x = 40 + (percent / 100) * 320;
            return (
              <line key={percent} x1={x} y1="30" x2={x} y2="120" stroke="#f3f4f6" strokeWidth="1" />
            );
          })}

          {/* Data points */}
          {data.map((point, index) => {
            const x = 40 + (point.score / 100) * 320;
            // Center points vertically with minimal jitter
            const y = 75 + (point.jitter * 50);
            const color = point.diagnosisGroup === 'Dementia' ? '#ef4444' : '#3b82f6';

            return (
              <circle
                key={point.id}
                cx={x}
                cy={y}
                r="3.5"
                fill={color}
                opacity="0.4"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint({ score: point.score, diagnosisGroup: point.diagnosisGroup, x, y })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}

          {/* X-axis labels (percentages from 100 to 0) */}
          {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((percent) => {
            const x = 40 + (percent / 100) * 320;
            return (
              <text key={percent} x={x} y="145" textAnchor="middle" fontSize="10" fill="#6b7280">
                {percent}
              </text>
            );
          })}

          {/* Patient Score Line */}
          {hasValidPatientScore && (
            <>
              <line
                x1={40 + (patientScore! / 100) * 320}
                y1="30"
                x2={40 + (patientScore! / 100) * 320}
                y2="120"
                stroke={patientColor}
                strokeWidth="2"
                onMouseEnter={() => setIsHoveringPatientLine(true)}
                onMouseLeave={() => setIsHoveringPatientLine(false)}
              />
              {/* Label */}
              <text
                x={40 + (patientScore! / 100) * 320}
                y="18"
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={patientColor}
              >
                Current Patient
              </text>
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-white border border-gray-300 rounded-md shadow-lg px-3 py-2 text-xs pointer-events-none z-10"
            style={{
              left: `${(hoveredPoint.x / 400) * 100}%`,
              top: `${(hoveredPoint.y / 140) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <div className="font-semibold text-gray-900">{hoveredPoint.diagnosisGroup}</div>
            <div className="text-gray-600">Score: {hoveredPoint.score.toFixed(1)}%</div>
          </div>
        )}

        {/* Patient Score Tooltip */}
        {isHoveringPatientLine && hasValidPatientScore && (
          <div
            className="absolute bg-white border border-gray-300 rounded-md shadow-lg px-3 py-2 text-xs pointer-events-none z-10"
            style={{
              left: `${(40 + ((100 - patientScore!) / 100) * 320) / 400 * 100}%`,
              top: '50%',
              transform: 'translate(-50%, calc(-50% - 10px))',
            }}
          >
            <div className="font-semibold text-gray-900">Patient Score</div>
            <div className="text-gray-600">Score: {patientScore!.toFixed(1)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExploreDataPage() {
  const [sexFilter, setSexFilter] = useState<string>('All');
  const [ageFilter, setAgeFilter] = useState<string>('All');
  const [diagnosisFilter, setDiagnosisFilter] = useState<string>('All');

  const filteredData = useMemo(() => {
    console.log('Current filters:', { sexFilter, ageFilter, diagnosisFilter });
    const filtered = cohortData.filter(point => {
      // Sex filter
      if (sexFilter !== 'All' && point.sex !== sexFilter) return false;

      // Age filter - match exact bucket string
      if (ageFilter !== 'All') {
        if (ageFilter === '<55' && point.ageBucket !== '<55') return false;
        if (ageFilter === '55-64' && point.ageBucket !== '55-64') return false;
        if (ageFilter === '65-75' && point.ageBucket !== '65-74' && point.ageBucket !== '65-75') return false;
        if (ageFilter === '76+' && point.ageBucket !== '75+' && point.ageBucket !== '76+') return false;
      }

      // Diagnosis filter
      if (diagnosisFilter !== 'All' && point.diagnosis !== diagnosisFilter) return false;

      return true;
    });
    console.log('Filtered data count:', filtered.length, 'Total:', cohortData.length);
    return filtered;
  }, [sexFilter, ageFilter, diagnosisFilter]);

  const chartDataByDomain = useMemo(() => {
    const result: Record<DomainKey, any[]> = {} as any;

    domains.forEach((domain) => {
      result[domain.key] = filteredData
        .map((point) => ({
          score: point[domain.key] as number,
          diagnosisGroup: point.diagnosisGroup,
          id: point.id,
          jitter: getJitter(point.id + domain.key),
        }))
        .filter(d => typeof d.score === 'number' && !isNaN(d.score)); // Filter out invalid scores
    });

    return result;
  }, [filteredData]);

  const resetFilters = () => {
    setSexFilter('All');
    setAgeFilter('All');
    setDiagnosisFilter('All');
  };

  const patientScores = usePatientScores();
  const patientMinimumData = usePatientMinimumData();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Left Sidebar - Title, Description, and Filters */}
          <div className="w-64 flex-shrink-0 flex flex-col">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Explore Our Cohort</h1>
              <p className="text-gray-700">
                Use the filters here to explore the cohort based on various characteristics. If you{' '}
                <Link href="/" className="text-blue-600 hover:underline">enter scores for a patient</Link>, their score will be plotted so you can compare them to the cohort. If there is insufficient data for a domain, the "Current Patient" marker will be greyed out.
              </p>
            </div>

            {/* Legend Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 mb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-900">Dementia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-900">Non-dementia</span>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Filters</h3>

              {/* Sex Filter */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sex</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="All"
                      checked={sexFilter === 'All'}
                      onChange={(e) => setSexFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">All</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="Male"
                      checked={sexFilter === 'Male'}
                      onChange={(e) => setSexFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="Female"
                      checked={sexFilter === 'Female'}
                      onChange={(e) => setSexFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">Female</span>
                  </label>
                </div>
              </div>

              {/* Age Group Filter */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Age group</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="age"
                      value="All"
                      checked={ageFilter === 'All'}
                      onChange={(e) => setAgeFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">All</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="age"
                      value="<55"
                      checked={ageFilter === '<55'}
                      onChange={(e) => setAgeFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">&lt;55</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="age"
                      value="55-64"
                      checked={ageFilter === '55-64'}
                      onChange={(e) => setAgeFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">55-64</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="age"
                      value="65-75"
                      checked={ageFilter === '65-75'}
                      onChange={(e) => setAgeFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">65-75</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="age"
                      value="76+"
                      checked={ageFilter === '76+'}
                      onChange={(e) => setAgeFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">76+</span>
                  </label>
                </div>
              </div>

              {/* Diagnosis Filter */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Diagnosis</h3>
                <select
                  value={diagnosisFilter}
                  onChange={(e) => setDiagnosisFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="All">All</option>
                  {DIAGNOSIS_TYPES.map(diagnosis => (
                    <option key={diagnosis} value={diagnosis}>{diagnosis}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  *The bvFTD group included three patients with an undefined FTD syndrome.
                </p>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetFilters}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
              >
                Reset filters
              </button>
            </div>

            {/* Patient Count Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-8" style={{ marginTop: '25px' }}>
              <div className="text-sm text-gray-900">
                {sexFilter === 'All' && ageFilter === 'All' && diagnosisFilter === 'All' ? (
                  <span>
                    Showing <strong>{cohortData.length}</strong> participants
                  </span>
                ) : (
                  <span>
                    Showing <strong>{filteredData.length}</strong> out of <strong>{cohortData.length}</strong> participants
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Charts Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-6">
              <DomainChart
                title="Memory and Orientation"
                domainKey="memoryOrientation"
                data={chartDataByDomain.memoryOrientation}
                patientScore={patientScores?.memoryOrientation}
                hasMinimumData={patientMinimumData?.memoryOrientation}
              />
              <DomainChart
                title="Everyday Skills"
                domainKey="everydaySkills"
                data={chartDataByDomain.everydaySkills}
                patientScore={patientScores?.everydaySkills}
                hasMinimumData={patientMinimumData?.everydaySkills}
              />
              <DomainChart
                title="Self Care"
                domainKey="selfCare"
                data={chartDataByDomain.selfCare}
                patientScore={patientScores?.selfCare}
                hasMinimumData={patientMinimumData?.selfCare}
              />
              <DomainChart
                title="Abnormal Behaviour"
                domainKey="abnormalBehaviour"
                data={chartDataByDomain.abnormalBehaviour}
                patientScore={patientScores?.abnormalBehaviour}
                hasMinimumData={patientMinimumData?.abnormalBehaviour}
              />
              <DomainChart
                title="Mood"
                domainKey="mood"
                data={chartDataByDomain.mood}
                patientScore={patientScores?.mood}
                hasMinimumData={patientMinimumData?.mood}
              />
              <DomainChart
                title="Beliefs"
                domainKey="beliefs"
                data={chartDataByDomain.beliefs}
                patientScore={patientScores?.beliefs}
                hasMinimumData={patientMinimumData?.beliefs}
              />
              <DomainChart
                title="Eating Habits"
                domainKey="eatingHabits"
                data={chartDataByDomain.eatingHabits}
                patientScore={patientScores?.eatingHabits}
                hasMinimumData={patientMinimumData?.eatingHabits}
              />
              <DomainChart
                title="Sleep"
                domainKey="sleep"
                data={chartDataByDomain.sleep}
                patientScore={patientScores?.sleep}
                hasMinimumData={patientMinimumData?.sleep}
              />
              <DomainChart
                title="Stereotypic and Motor Behaviours"
                domainKey="stereotypicMotor"
                data={chartDataByDomain.stereotypicMotor}
                patientScore={patientScores?.stereotypicMotor}
                hasMinimumData={patientMinimumData?.stereotypicMotor}
              />
              <DomainChart
                title="Motivation"
                domainKey="motivation"
                data={chartDataByDomain.motivation}
                patientScore={patientScores?.motivation}
                hasMinimumData={patientMinimumData?.motivation}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
