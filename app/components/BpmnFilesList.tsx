'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiDocumentText, HiCalendar, HiUser, HiEye } from 'react-icons/hi';
import { getBpmnTreeFromAPI, convertNodeToProject } from '../utils/bpmnNodeStorage';
import { BpmnProject } from '../utils/projectStorage';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileNode[];
  projectData?: BpmnProject;
  parentId?: string;
  path: string;
  content?: string;
  processMetadata?: {
    processName: string;
    description: string;
    processOwner: string;
    processManager: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface BpmnFilesListProps {
  user: User | null;
}

const BpmnFilesList: React.FC<BpmnFilesListProps> = ({ user }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const router = useRouter();

  // Fetch all BPMN files from the file tree
  const fetchBpmnFiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching BPMN files for user:', user.id);
      const savedTree = await getBpmnTreeFromAPI(user.id);
      console.log('Retrieved BPMN tree:', savedTree);
      
      // Extract all files from the tree (flatten the hierarchy)
      const extractFiles = (nodes: any[]): FileNode[] => {
        let allFiles: FileNode[] = [];
        
        nodes.forEach(node => {
          if (node.type === 'file') {
            // Convert node to project format using the same function as BPMN file tree
            const project = convertNodeToProject(node);
            console.log('Converting node to project:', node.name, project);
            allFiles.push({
              id: node.id,
              name: node.name,
              type: 'file',
              projectData: project,
              path: node.path || node.name
            });
          }
          
          if (node.children && node.children.length > 0) {
            allFiles = [...allFiles, ...extractFiles(node.children)];
          }
        });
        
        return allFiles;
      };
      
      const allFiles = extractFiles(savedTree);
      console.log('Extracted files:', allFiles);
      setFiles(allFiles);
    } catch (error) {
      console.error('Error fetching BPMN files:', error);
      toast.error('Failed to load BPMN files');
    } finally {
      setIsLoading(false);
    }
  };

  // Load files when component mounts or user changes
  useEffect(() => {
    fetchBpmnFiles();
  }, [user]);

  // Handle file click - open in BPMN editor
  const handleFileClick = async (file: FileNode) => {
    if (file.projectData) {
      setOpeningFileId(file.id);
      try {
        // Save the current view to sessionStorage
        sessionStorage.setItem('currentView', 'bpmn');
        
        // Simulate a small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 500));
        
        toast.success(`Opening "${file.name}" in editor...`);
        
        // Navigate to the root with the bpmn view active and the file selected
        router.push(`/?bpmnFile=${encodeURIComponent(JSON.stringify(file.projectData))}`);
      } catch (error) {
        console.error('Error opening file:', error);
        toast.error('Failed to open file');
      } finally {
        setOpeningFileId(null);
      }
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading BPMN files...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Files count info */}
      <div className="mb-4">
        <p className="text-xs text-gray-500">
          {files.length === 0 
            ? "No BPMN diagrams found. Create your first diagram to get started."
            : `${files.length} diagram${files.length === 1 ? '' : 's'} found`
          }
        </p>
      </div>

      {/* Files List */}
      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFileClick(file)}
              className={`bg-white border border-gray-200 rounded-lg p-2 transition-all duration-200 group ${
                openingFileId === file.id 
                  ? 'border-blue-300 shadow-md cursor-wait opacity-75' 
                  : 'hover:border-blue-300 hover:shadow-md cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <HiDocumentText className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {file.name}
                    </h3>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <HiCalendar className="h-3 w-3" />
                        <span>{formatDate(file.projectData?.lastEdited || '')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <HiUser className="h-3 w-3" />
                        <span>{file.projectData?.createdBy || user?.name || user?.email || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <HiDocumentText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No BPMN Diagrams</h3>
          <p className="text-gray-600 mb-4">
            You haven&apos;t created any BPMN diagrams yet. Start by creating your first diagram.
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem('currentView', 'bpmn');
              router.push('/');
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <HiDocumentText className="h-4 w-4 mr-2" />
            Create First Diagram
          </button>
        </div>
      )}

      {/* Refresh Button */}
      {files.length > 0 && (
        <div className="mt-3 text-center">
          <button
            onClick={fetchBpmnFiles}
            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs"
          >
            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh List
          </button>
        </div>
      )}
    </div>
  );
};

export default BpmnFilesList; 