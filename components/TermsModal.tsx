"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

interface TermsModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsModal({ onAccept, onDecline }: TermsModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth animation
    setIsVisible(true);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-4">
      <Card 
        className={`max-w-2xl w-full border border-slate-200 shadow-lg transition-all duration-300 ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <CardContent className="p-10">
          {/* Header with Logo */}
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-800">
              Terms and Conditions of Use
            </h2>
            <Image 
              src={`${process.env.NEXT_PUBLIC_BASE_PATH}/Frontier_logo_2020.png`}
              alt="Frontier Logo"
              width={85}
              height={85} 
              className="ml-4 object-contain"
            />
          </div>
          <div className="border-t border-slate-200 mb-6"></div>

          {/* Main Content */}
          <div className="mb-8">
            <p className="text-lg leading-relaxed text-slate-700">
              This tool is designed exclusively for use by qualified health professionals. The CBI-R screening tool is not intended for self-evaluation and must not be self-administered under any circumstances.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={onAccept}
              className="h-11 px-8 bg-blue-600 text-white font-medium text-base shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              Accept
            </Button>
            <Button
              onClick={onDecline}
              variant="outline"
              className="h-11 px-8 border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-medium text-base transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}