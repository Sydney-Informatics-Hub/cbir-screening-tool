"use client";

import Image from "next/image";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black">
            About the CBI-R Online Screening Tool
          </h1>
          <Image
            src="/Frontier_logo_2020.png"
            alt="Frontier Logo"
            width={150}
            height={150}
            className="ml-8 object-contain flex-shrink-0"
          />
        </div>

        {/* Introduction */}
        <div className="mb-8 space-y-4 bg-blue-50 p-8 rounded-lg shadow-sm border border-slate-200">
          <p className="text-base leading-relaxed text-slate-700 text-justify">
            The Cambridge Behavioural Inventory-Revised (CBI-R) Online Screening Tool is intended for use by clinicians trained in the administration and interpretation of the CBI-R.
          </p>
          <p className="text-base leading-relaxed text-slate-700 text-justify">
            This tool provides a standardised, normative summary of behavioural, functional, and mood symptoms based on informant report. It is a screening and decision-support tool, not a diagnostic instrument, and results must be interpreted in the context of comprehensive clinical assessment and professional judgement.
          </p>
        </div>

        {/* About the CBI-R Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-black mb-4 pb-3 border-b border-slate-300">
            About the CBI-R
          </h2>
          <div className="space-y-4 pl-4">
            <p className="text-base leading-relaxed text-black text-justify">
              The Cambridge Behavioural Inventory-Revised (CBI-R) is an informant-based questionnaire developed to assess behavioural, cognitive, and functional changes associated with dementia and related neurodegenerative disorders (Wear et al., 2008).
            </p>
            <p className="text-base leading-relaxed text-black text-justify">
              The CBI-R consists of 45 items across multiple behavioural and functional domains. Each item is rated according to the frequency of symptoms over the preceding month, with higher scores reflecting more frequent problematic change. The questionnaire is completed by a family member or other informant with regular contact with the individual being assessed.
            </p>
          </div>
        </section>

        {/* Normative Data and Interpretation Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-black mb-4 pb-3 border-b border-slate-300">
            Normative Data and Interpretation
          </h2>
          <div className="space-y-4 pl-4">
            <p className="text-base leading-relaxed text-black text-justify">
              Normative thresholds and interpretive guidance presented in this tool are derived from a large case-control dataset collected through the FRONTIER Research Group, Brain and Mind Centre, University of Sydney. The dataset includes 561 participants, comprising 484 individuals with dementia and 77 healthy control participants.
            </p>
            <p className="text-base leading-relaxed text-black text-justify">
              This tool summarises CBI-R responses at the item and domain level (expressed as a percentage of the maximum possible score). Scores are compared with derived normative thresholds and classified as Within Normal Limits (WNL) or Above Normal. Domain-level results are reported only where sufficient item data meet minimum reliability thresholds (Cronbach’s α ≥ 0.70).
            </p>
            <p className="text-base leading-relaxed text-black text-justify">
              Full details regarding dataset characteristics, threshold derivation, and interpretation are described in:
            </p>
            <p className="text-base leading-relaxed text-black text-justify">
              Foxe et al. The Cambridge Behavioural Inventory-Revised: Normative Characteristics and Interpretation:  <a href="https://osf.io/7emb8/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              https://osf.io/7emb8/</a>
            </p>
            <p className="text-base leading-relaxed text-black text-justify">
              Clinicians are strongly encouraged to consult this publication prior to using this tool.
            </p>
          </div>
        </section>

        {/* Funding and Contact Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-black mb-4 pb-3 border-b border-slate-300">
            Funding and Contact
          </h2>
          <div className="space-y-4 pl-4">
            <p className="text-base leading-relaxed text-black text-justify">
              This tool was developed with support from the Dean Family Research Fund and the Edwards Fund for Dementia Research, Brain and Mind Centre, University of Sydney. This tool was also supported in part by funding from the National Health and Medical Research Council (NHMRC) (GNT1037746, GNT2024329, GNT2025228, GNT2008020) and The Australian Research Council (ARC) Centre of Excellence in Cognition and its Disorders Memory Program (CE11000102).
            </p>
            <p className="text-base leading-relaxed text-black text-justify">
              For enquiries, please contact FRONTIER at <a href="mailto:frontier@sydney.edu.au?subject=[CBI-R online screening tool] Type your subject here" className="text-blue-600 underline hover:text-blue-800"> frontier@sydney.edu.au</a>. 
              CBI-R materials are available at: <a href="https://www.frontierftd.org/testsandtools" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline"> https://www.frontierftd.org/testsandtools</a>
              
            </p>
          </div>
        </section>

        {/* References Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-black mb-4 pb-3 border-b border-slate-300">
            References
          </h2>
          <p className="text-base leading-relaxed text-black text-justify pl-4">
            Wear, H. J., Wedderburn, C. J., Mioshi, E., Williams-Gray, C. H., Mason, S. L., Barker, R. A., & Hodges, J. R. (2008). The Cambridge Behavioural Inventory-Revised. Dementia & Neuropsychologia, 2, 102-107.
          </p>
        </section>
      </div>
    </div>
  );
}