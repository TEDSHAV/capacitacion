"use client";

import { CourseTopic } from '@/types';

interface CarnetDebugProps {
  selectedCourseTopic: CourseTopic | null;
  certificateData: any;
}

export function CarnetDebug({ selectedCourseTopic, certificateData }: CarnetDebugProps) {
  const willGenerateCarnet = selectedCourseTopic?.emite_carnet && certificateData.fecha_vencimiento;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h4 className="font-semibold text-yellow-800 mb-2">🔍 Carnet Generation Debug</h4>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center">
          <span className="font-medium w-40">Course Selected:</span>
          <span className={selectedCourseTopic ? "text-green-600" : "text-red-600"}>
            {selectedCourseTopic ? `✅ ${selectedCourseTopic.name}` : "❌ No course selected"}
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="font-medium w-40">Emite Carnet:</span>
          <span className={selectedCourseTopic?.emite_carnet ? "text-green-600" : "text-red-600"}>
            {selectedCourseTopic?.emite_carnet ? "✅ Yes" : "❌ No"}
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="font-medium w-40">Expiration Date:</span>
          <span className={certificateData.fecha_vencimiento ? "text-green-600" : "text-red-600"}>
            {certificateData.fecha_vencimiento 
              ? `✅ ${certificateData.fecha_vencimiento}` 
              : "❌ Not set"}
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="font-medium w-40">Will Generate:</span>
          <span className={willGenerateCarnet ? "text-green-600 font-bold" : "text-red-600"}>
            {willGenerateCarnet ? "🎉 YES - Carnets will be generated!" : "❌ NO - Carnets will NOT be generated"}
          </span>
        </div>
      </div>
      
      {!willGenerateCarnet && selectedCourseTopic && (
        <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
          <strong>To enable carnet generation:</strong>
          <ul className="list-disc list-inside mt-1">
            {!selectedCourseTopic.emite_carnet && <li>Set emite_carnet = true for this course in database</li>}
            {!certificateData.fecha_vencimiento && <li>Set the expiration date in the form</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
