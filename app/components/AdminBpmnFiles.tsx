'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ROLES } from '../utils/permissions';
import { toast } from 'react-hot-toast';
import { HiRefresh, HiEye, HiDownload, HiTrash, HiArchive, HiUser, HiFilter, HiFolder, HiDocument, HiChevronRight, HiChevronDown, HiViewBoards } from 'react-icons/hi';
import dynamic from 'next/dynamic';
import { Tree } from 'react-arborist';

const BpmnDiagramViewer = dynamic(() => import('./BpmnDiagramViewer'), { ssr: false });

interface AdminBpmnFileRow {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  archived?: boolean;
  userId?: string;
  ownerUserId?: string;
}

interface AdminBpmnFilesProps {
  userRole?: string;
}

const AdminBpmnFiles: React.FC<AdminBpmnFilesProps> = ({ userRole = 'user' }) => {
  const [rows, setRows] = useState<AdminBpmnFileRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [archivedRows, setArchivedRows] = useState<AdminBpmnFileRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('latest');
  const [showSortMenu, setShowSortMenu] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [treeData, setTreeData] = useState<any[]>([]);

  const isAdmin = useMemo(() => userRole === ROLES.ADMIN, [userRole]);

  const fetchAll = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/bpmn-files', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load files');
      }
      const data = await res.json();
      setRows(data.files || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load BPMN files');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const fetchTree = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/bpmn-files?format=tree', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTreeData(Array.isArray(data.tree) ? data.tree : []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load folder tree');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (viewMode === 'tree') {
      fetchTree();
    }
  }, [viewMode, fetchTree]);

  const handlePreview = async (row: AdminBpmnFileRow) => {
    try {
      const res = await fetch(`/api/admin/bpmn-files/${encodeURIComponent(row.id)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPreviewData(data.file);
      setShowPreview(true);
    } catch {
      toast.error('Failed to load preview');
    }
  };

  const handleDownload = async (row: AdminBpmnFileRow) => {
    try {
      const res = await fetch(`/api/admin/bpmn-files/${encodeURIComponent(row.id)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const blob = new Blob([data.file?.content || ''], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.name || row.id}.bpmn.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (row: AdminBpmnFileRow) => {
    if (!confirm(`Delete ${row.name}?`)) return;
    try {
      const res = await fetch(`/api/admin/bpmn-files/${encodeURIComponent(row.id)}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Deleted');
      fetchAll();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleToggleArchive = async (row: AdminBpmnFileRow) => {
    try {
      const res = await fetch(`/api/admin/bpmn-files/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !row.archived }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchAll();
    } catch {
      toast.error('Archive toggle failed');
    }
  };

  const handleReassign = async (row: AdminBpmnFileRow) => {
    const newOwner = prompt('Enter new owner userId');
    if (!newOwner) return;
    try {
      const res = await fetch(`/api/admin/bpmn-files/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newOwner, ownerUserId: newOwner }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Reassigned');
      fetchAll();
    } catch {
      toast.error('Reassign failed');
    }
  };

  const displayedRows = useMemo(() => {
    let list = [...rows];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.createdBy || '').toLowerCase().includes(q)
      );
    }
    switch (sortOption) {
      case 'latest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'a-z':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'z-a':
        list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'updated':
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      default:
        break;
    }
    return list;
  }, [rows, searchQuery, sortOption]);

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <p className="text-xl font-semibold text-red-600 mb-2">Access Denied</p>
          <p className="text-gray-600">Only admins can view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">BPMN Files</h2>
            <p className="text-gray-600">List of all BPMN files across all users</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 relative">
            <div className="flex rounded-lg overflow-hidden border">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="List view"
              >List</button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-2 text-sm border-l ${viewMode === 'tree' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Folder tree"
              >Tree</button>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-80 md:w-96 px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => setShowSortMenu((s) => !s)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm shadow-sm"
              title="Filter"
            >
              <HiFilter className="h-5 w-5" />
              <span>Filter</span>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-11 z-10 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                <div className="px-2 py-1 text-xs uppercase tracking-wider text-gray-500">Sort by</div>
                <ul className="py-1">
                  {[
                    { id: 'latest', label: 'Latest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'a-z', label: 'A–Z' },
                    { id: 'z-a', label: 'Z–A' },
                    { id: 'updated', label: 'Recently updated' },
                  ].map(opt => (
                    <li key={opt.id}>
                      <button
                        onClick={() => { setSortOption(opt.id); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 ${sortOption === opt.id ? 'bg-gray-100 font-medium' : ''}`}
                      >{opt.label}</button>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end gap-2 px-2 pb-2">
                  <button onClick={() => { setSortOption('latest'); setShowSortMenu(false); }} className="px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Reset</button>
                  <button onClick={() => setShowSortMenu(false)} className="px-3 py-1 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Done</button>
                </div>
              </div>
            )}
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/bpmn-files/archived', { credentials: 'include' });
                  if (!res.ok) throw new Error('Failed');
                  const data = await res.json();
                  setArchivedRows(data.files || []);
                  setShowArchived(true);
                } catch {
                  toast.error('Failed to load archived files');
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              title="View archived"
            >
              <HiArchive className="h-5 w-5 text-amber-600" />
              <span>Archived</span>
            </button>
            <button
              onClick={fetchAll}
              disabled={isLoading}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium ${isLoading ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}`}
              title="Refresh"
            >
              <HiRefresh className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            </div>
            <div className="text-xs text-gray-500">Total files: {rows.length}</div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modification Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading && (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={6}>Loading...</td>
                    </tr>
                  )}
                  {!isLoading && rows.length === 0 && (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={6}>No files found</td>
                    </tr>
                  )}
                  {!isLoading && displayedRows.map((row) => (
                    <tr key={row.id} className={`hover:bg-gray-50 ${row.archived ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{(row as any).path || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.createdBy || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{new Date(row.updatedAt).toLocaleString()}</td>
                      <td className="px-6 py-2 text-sm text-gray-700">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreview(row)}
                            className="p-2 rounded hover:bg-gray-100"
                            title="Preview"
                          >
                            <HiEye className="h-5 w-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDownload(row)}
                            className="p-2 rounded hover:bg-gray-100"
                            title="Download"
                          >
                            <HiDownload className="h-5 w-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleToggleArchive(row)}
                            className="p-2 rounded hover:bg-gray-100"
                            title={row.archived ? 'Unarchive' : 'Archive'}
                          >
                            <HiArchive className={`h-5 w-5 ${row.archived ? 'text-amber-600' : 'text-gray-600'}`} />
                          </button>
                          <button
                            onClick={() => handleReassign(row)}
                            className="p-2 rounded hover:bg-gray-100"
                            title="Reassign owner"
                          >
                            <HiUser className="h-5 w-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="p-2 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <HiTrash className="h-5 w-5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-[60vh] overflow-auto p-2">
              {isLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading tree...</div>
              ) : treeData.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No folders or files</div>
              ) : (
                <Tree data={treeData} indent={20} rowHeight={32} openByDefault={false}>
                  {({ node, style }) => (
                    <div
                      style={style}
                      className="flex items-center px-3 py-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        if (node.data.type === 'folder') {
                          node.toggle();
                        } else if (node.data.type === 'file') {
                          const row: AdminBpmnFileRow = { id: node.data.id, name: node.data.name, createdBy: '', createdAt: new Date(), updatedAt: new Date() } as any;
                          handlePreview(row);
                        }
                      }}
                      title={node.data.name}
                    >
                      {node.data.type === 'folder' && (
                        <span className="mr-1 text-gray-400">{node.isOpen ? <HiChevronDown className="w-4 h-4" /> : <HiChevronRight className="w-4 h-4" />}</span>
                      )}
                      <span className={`mr-2 ${node.data.type === 'folder' ? 'text-yellow-500' : 'text-blue-500'}`}>
                        {node.data.type === 'folder' ? <HiFolder className="w-4 h-4" /> : <HiDocument className="w-4 h-4" />}
                      </span>
                      <span className="text-sm text-gray-800 truncate">{node.data.name}</span>
                    </div>
                  )}
                </Tree>
              )}
            </div>
          </div>
        )}

        {showPreview && previewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-5xl h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-lg font-semibold truncate">Preview: {previewData?.name || ''}</h3>
                <button onClick={() => { setShowPreview(false); setPreviewData(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                 <div className="lg:col-span-2 border rounded overflow-auto max-h-[65vh]">
                   <div className="min-h-[65vh] relative">
                     {/* Single mount point to avoid duplicate canvases */}
                     <BpmnDiagramViewer key={previewData?.id || previewData?._id || previewData?.name} xml={previewData?.content || ''} className="w-full h-[65vh]" />
                   </div>
                 </div>
                <div className="lg:col-span-1 space-y-4 overflow-auto">
                  <div className="border rounded p-3">
                    <h4 className="font-semibold text-gray-800 mb-2">Process Details</h4>
                    <dl className="text-sm text-gray-700 grid grid-cols-3 gap-2">
                      <dt className="col-span-1 text-gray-500">Process Name</dt>
                      <dd className="col-span-2">{previewData?.processMetadata?.processName || '-'}</dd>
                      <dt className="col-span-1 text-gray-500">Owner</dt>
                      <dd className="col-span-2">{previewData?.processMetadata?.processOwner || '-'}</dd>
                      <dt className="col-span-1 text-gray-500">Manager</dt>
                      <dd className="col-span-2">{previewData?.processMetadata?.processManager || '-'}</dd>
                      <dt className="col-span-1 text-gray-500">Description</dt>
                      <dd className="col-span-2">{previewData?.processMetadata?.description || '-'}</dd>
                    </dl>
                  </div>
                  <div className="border rounded p-3">
                    <h4 className="font-semibold text-gray-800 mb-2">Advanced Details</h4>
                    <dl className="text-sm text-gray-700 grid grid-cols-3 gap-2">
                      <dt className="col-span-1 text-gray-500">Version</dt>
                      <dd className="col-span-2">{previewData?.advancedDetails?.versionNo || '-'}</dd>
                      <dt className="col-span-1 text-gray-500">Status</dt>
                      <dd className="col-span-2">{previewData?.advancedDetails?.processStatus || '-'}</dd>
                      <dt className="col-span-1 text-gray-500">Classification</dt>
                      <dd className="col-span-2">{previewData?.advancedDetails?.classification || '-'}</dd>
                      <dt className="col-span-1 text-gray-500">Created</dt>
                      <dd className="col-span-2">{previewData?.advancedDetails?.dateOfCreation || new Date(previewData?.createdAt).toLocaleString()}</dd>
                      <dt className="col-span-1 text-gray-500">Modified</dt>
                      <dd className="col-span-2">{previewData?.advancedDetails?.modificationDate || new Date(previewData?.updatedAt).toLocaleString()}</dd>
                      <dt className="col-span-1 text-gray-500">Created By</dt>
                      <dd className="col-span-2">{previewData?.advancedDetails?.createdBy || '-'}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t text-right">
                <button onClick={() => { setShowPreview(false); setPreviewData(null); }} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800">Close</button>
              </div>
            </div>
          </div>
        )}

        {showArchived && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-lg font-semibold">Archived BPMN Files</h3>
                <button onClick={() => setShowArchived(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="max-h-[60vh] overflow-auto p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {archivedRows.length === 0 && (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>No archived files found</td>
                      </tr>
                    )}
                    {archivedRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.createdBy || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{new Date(row.updatedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleToggleArchive(row)}
                              className="px-3 py-1 rounded-md border text-sm bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                            >Unarchive</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t flex justify-end">
                <button onClick={() => setShowArchived(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBpmnFiles;


