'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LatexFilesList from './LatexFilesList';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface LatexDashboardProps {
  user: User | null;
  onNavigate?: (view: string) => void;
}

const LatexDashboard: React.FC<LatexDashboardProps> = ({ user, onNavigate }) => {
    const router = useRouter();

    const handleEditorClick = () => {
        // Use the onNavigate prop if available, otherwise fallback to the old method
        if (onNavigate) {
            onNavigate('latex');
        } else {
            // Fallback to the old navigation method
            if (typeof window !== 'undefined') {
        sessionStorage.setItem('currentView', 'latex');
        router.push('/');
            }
        }
    };

    return (
        <div className="flex flex-col w-full h-full max-h-[600px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {/* Header */}
            <div className="mb-4 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900 mb-1">LaTeX Editor</h2>
                <p className="text-sm text-gray-600">Create and edit professional LaTeX documents.</p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 flex-shrink-0">
                {/* LaTeX Editor */}
                <div
                    onClick={handleEditorClick}
                    className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all duration-200"
                >
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm text-gray-900">LaTeX Editor</h3>
                            <p className="text-xs text-gray-600">Switch between code and visual editing modes</p>
                        </div>
                    </div>
                </div>

                {/* New Document */}
                <div
                    onClick={handleEditorClick}
                    className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-200"
                >
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm text-gray-900">New Document</h3>
                            <p className="text-xs text-gray-600">Create a new LaTeX document from scratch</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* LaTeX Files List */}
            <div className="mt-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-shrink-0">Your LaTeX Documents</h3>
                <div className="flex-1 overflow-y-auto">
                    <LatexFilesList user={user} />
                </div>
            </div>
        </div>
    );
};

export default LatexDashboard; 