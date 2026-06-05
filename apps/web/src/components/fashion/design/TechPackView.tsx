'use client';

import React from 'react';
import { TechPack } from '../../../types/fashion';
import { Ruler, Scissors, Layers, Download } from 'lucide-react';

export default function TechPackView({ techPack }: { techPack?: TechPack }) {
  if (!techPack) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Layers className="w-12 h-12 mb-4 opacity-50" />
        <p>No Tech Pack created for this design yet.</p>
        <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Create Tech Pack
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex justify-end">
        <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Sketches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Front Sketch</h3>
          <div className="aspect-[3/4] bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600">
            {techPack.sketches.front ? (
                <img src={techPack.sketches.front} alt="Front Sketch" className="w-full h-full object-contain" />
            ) : <span className="text-slate-400">Upload Sketch</span>}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Back Sketch</h3>
          <div className="aspect-[3/4] bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600">
            {techPack.sketches.back ? (
                <img src={techPack.sketches.back} alt="Back Sketch" className="w-full h-full object-contain" />
            ) : <span className="text-slate-400">Upload Sketch</span>}
          </div>
        </div>
      </div>

      {/* Construction Details */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-indigo-500" />
          Construction & Specs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Construction Details</label>
                <p className="text-slate-600 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[80px]">
                    {techPack.constructionDetails || 'No details added.'}
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stitching Specs</label>
                <p className="text-slate-600 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[80px]">
                    {techPack.stitchingSpecs || 'No specs added.'}
                </p>
            </div>
        </div>
      </div>

      {/* Measurements (Placeholder for table) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Ruler className="w-5 h-5 text-indigo-500" />
          Measurements & Grading
        </h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                    <tr>
                        <th className="p-3">Point of Measure</th>
                        <th className="p-3">Tol (+/-)</th>
                        <th className="p-3">XS</th>
                        <th className="p-3">S</th>
                        <th className="p-3">M</th>
                        <th className="p-3">L</th>
                        <th className="p-3">XL</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Mock Rows */}
                    <tr>
                        <td className="p-3 font-medium">Total Length</td>
                        <td className="p-3 text-slate-500">0.5</td>
                        <td className="p-3">68</td>
                        <td className="p-3">70</td>
                        <td className="p-3">72</td>
                        <td className="p-3">74</td>
                        <td className="p-3">76</td>
                    </tr>
                    <tr>
                        <td className="p-3 font-medium">Chest Width</td>
                        <td className="p-3 text-slate-500">0.5</td>
                        <td className="p-3">48</td>
                        <td className="p-3">50</td>
                        <td className="p-3">52</td>
                        <td className="p-3">54</td>
                        <td className="p-3">56</td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>

       {/* BOM (Bill of Materials) */}
       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          Bill of Materials (BOM)
        </h3>
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                <tr>
                    <th className="p-3">Placement</th>
                    <th className="p-3">Item / Material</th>
                    <th className="p-3">Consumption</th>
                    <th className="p-3">Wastage %</th>
                    <th className="p-3">Cost</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                    <td className="p-3">Main Body</td>
                    <td className="p-3">Cotton Jersey</td>
                    <td className="p-3">1.5 m</td>
                    <td className="p-3">5%</td>
                    <td className="p-3">$18.75</td>
                </tr>
                <tr>
                    <td className="p-3">Neck Label</td>
                    <td className="p-3">Woven Brand Label</td>
                    <td className="p-3">1 pc</td>
                    <td className="p-3">0%</td>
                    <td className="p-3">$0.15</td>
                </tr>
            </tbody>
        </table>
      </div>
    </div>
  );
}
