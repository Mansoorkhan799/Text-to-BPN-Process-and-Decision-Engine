'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  HiOutlinePlus, HiOutlineTrash, HiOutlineX, HiOutlineSave, HiOutlineDownload, 
  HiOutlineUpload, HiOutlinePlay, HiOutlineCog, HiOutlineCube, HiOutlineCheck, 
  HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineDotsVertical, HiOutlinePencil,
  HiOutlineDuplicate, HiOutlineRefresh, HiOutlineDocumentReport
} from 'react-icons/hi';
import { DecisionRule, RuleCondition, RuleAction, ExecutionResult } from '../types';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

interface DecisionEngineProps {
  user?: any;
}

interface DataRow {
  [key: string]: any;
}

export default function DecisionEngine({ user }: DecisionEngineProps) {
  const [rules, setRules] = useState<DecisionRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<DecisionRule | null>(null);
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [showOnlyMatches, setShowOnlyMatches] = useState(false);
  const [showSavedFiles, setShowSavedFiles] = useState(false);
  const [savedFiles, setSavedFiles] = useState<Array<{ _id: string; name: string; size: number; mimeType: string; createdAt: string }>>([]);
  
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rules: [{
      id: uuidv4(),
      name: 'Rule 1',
      conditions: [{ id: uuidv4(), field: '', operator: '==' as any, value: '' }],
      logicOperator: 'AND' as 'AND' | 'OR',
      actions: [{ id: uuidv4(), type: 'assign' as any, value: '', targetField: '', description: '' }],
      priority: 0
    }]
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);

  // Add condition to a rule item
  const addCondition = (ruleIndex: number) => {
    const updatedRules = [...newRule.rules];
    updatedRules[ruleIndex].conditions.push({
      id: uuidv4(),
      field: '',
      operator: '==',
      value: ''
    });
    setNewRule({ ...newRule, rules: updatedRules });
  };

  // Remove condition from a rule item
  const removeCondition = (ruleIndex: number, conditionIndex: number) => {
    const updatedRules = [...newRule.rules];
    updatedRules[ruleIndex].conditions.splice(conditionIndex, 1);
    setNewRule({ ...newRule, rules: updatedRules });
  };

  // Add action to a rule item
  const addAction = (ruleIndex: number) => {
    const updatedRules = [...newRule.rules];
    updatedRules[ruleIndex].actions.push({
      id: uuidv4(),
      type: 'assign',
      value: '',
      targetField: '',
      description: ''
    });
    setNewRule({ ...newRule, rules: updatedRules });
  };

  // Remove action from a rule item
  const removeAction = (ruleIndex: number, actionIndex: number) => {
    const updatedRules = [...newRule.rules];
    updatedRules[ruleIndex].actions.splice(actionIndex, 1);
    setNewRule({ ...newRule, rules: updatedRules });
  };

  // Add new rule item
  const addRuleItem = () => {
    setNewRule({
      ...newRule,
      rules: [...newRule.rules, {
        id: uuidv4(),
        name: `Rule ${newRule.rules.length + 1}`,
        conditions: [{ id: uuidv4(), field: '', operator: '==' as any, value: '' }],
        logicOperator: 'AND' as 'AND' | 'OR',
        actions: [{ id: uuidv4(), type: 'assign' as any, value: '', targetField: '', description: '' }],
        priority: 0
      }]
    });
  };

  // Remove rule item
  const removeRuleItem = (ruleIndex: number) => {
    const updatedRules = newRule.rules.filter((_, idx) => idx !== ruleIndex);
    setNewRule({ ...newRule, rules: updatedRules });
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // ensure refresh of rules after login/session change
  useEffect(() => {
    const handler = () => fetchRules();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, []);

  const fetchRules = async () => {
    try {
      console.log('[Frontend] Fetching rules...');
      const response = await fetch('/api/decision/rules', { credentials: 'include', cache: 'no-store' });
      console.log('[Frontend] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[Frontend] Fetched rules count:', data.rules?.length || 0);
        setRules(data.rules || []);
      } else {
        const errorData = await response.json();
        console.error('[Frontend] API error:', errorData);
        toast.error('Failed to load rules');
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast.error('Failed to load rules');
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/decision/import', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setDataRows(data.data);
          setColumns(data.columns.map((c: any) => c.field));
          toast.success(`Imported ${data.data.length} rows successfully`);
        }
      } else {
        toast.error('Failed to import file');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import file');
    }
  };

  const handleExport = async () => {
    if (results.length === 0) {
      toast.error('No results to export');
      return;
    }

    try {
      const exportData = results
        .filter(Boolean)
        .map((r: any) => ({
          ...r.data,
          _matchedRules: (r.matchedRules || []).map((m: any) => m.ruleName).join(', '),
          _finalAction: r.finalAction
        }));

      const response = await fetch('/api/decision/export', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: exportData,
          filename: 'decision-results.xlsx',
          save: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([Buffer.from(data.data, 'base64')], {
          type: data.mimeType
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Results exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export results');
    }
  };

  const fetchSavedFiles = async () => {
    try {
      const res = await fetch('/api/decision/export', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setSavedFiles(data.files || []);
      } else {
        toast.error('Failed to load saved files');
      }
    } catch (e) {
      console.error('Saved files fetch error:', e);
      toast.error('Failed to load saved files');
    }
  };

  const downloadSavedFile = async (id: string) => {
    try {
      const res = await fetch(`/api/decision/export?id=${id}`, { credentials: 'include' });
      if (!res.ok) {
        toast.error('Download failed');
        return;
      }
      const data = await res.json();
      const blob = new Blob([Buffer.from(data.data, 'base64')], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
      toast.error('Download failed');
    }
  };

  const executeRules = async () => {
    if (dataRows.length === 0) {
      toast.error('No data to execute rules on');
      return;
    }

    if (selectedRuleIds.size === 0) {
      toast.error('Please select at least one rule');
      return;
    }

    if (rules.filter(r => r.status === 'active').length === 0) {
      toast.error('No active rules to execute');
      return;
    }

    setIsExecuting(true);
    try {
      // Decide which rows to process: selected rows only if any selected, otherwise all
      const indicesToProcess = selectedRows.size > 0
        ? Array.from(selectedRows).sort((a, b) => a - b)
        : dataRows.map((_, idx) => idx);
      const rowsToProcess = indicesToProcess.map(idx => dataRows[idx]);

      const response = await fetch('/api/decision/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: rowsToProcess, ruleIds: Array.from(selectedRuleIds) })
      });

      if (response.ok) {
        const data = await response.json();
        // Map returned results back to their original row indices
        const mappedResults: any[] = new Array(dataRows.length).fill(undefined);
        (data.results || []).forEach((res: any, i: number) => {
          const originalIndex = indicesToProcess[i];
          if (typeof originalIndex === 'number') {
            mappedResults[originalIndex] = res;
          }
        });
        setResults(mappedResults as any);
        setShowResults(true);
        setShowOnlyMatches(true);
        toast.success(selectedRows.size > 0 ? 'Rules applied to selected rows' : 'Rules applied to all rows');
      } else {
        toast.error('Failed to execute rules');
      }
    } catch (error) {
      console.error('Execution error:', error);
      toast.error('Failed to execute rules');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveRule = async () => {
    if (!newRule.name.trim()) {
      toast.error('Please enter a rule name');
      return;
    }

    try {
      const isEditing = !!selectedRule?._id;
      const response = await fetch('/api/decision/rules', {
        method: isEditing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { _id: selectedRule?._id, ...newRule } : newRule)
      });

      if (response.ok) {
        toast.success(isEditing ? 'Rule updated' : 'Rule saved successfully');
        fetchRules();
        setShowRuleBuilder(false);
        setSelectedRule(null);
        setNewRule({ 
          name: '', 
          description: '', 
          rules: [{
            id: uuidv4(),
            name: 'Rule 1',
            conditions: [{ id: uuidv4(), field: '', operator: '==' as any, value: '' }],
            logicOperator: 'AND' as 'AND' | 'OR',
            actions: [{ id: uuidv4(), type: 'assign' as any, value: '', targetField: '', description: '' }],
            priority: 0
          }]
        });
      } else {
        toast.error('Failed to save rule');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save rule');
    }
  };

  const handleAddRow = () => {
    const newRow: DataRow = {};
    columns.forEach(col => {
      newRow[col] = '';
    });
    setDataRows([...dataRows, newRow]);
  };

  const handleDeleteRows = () => {
    if (selectedRows.size === 0) {
      toast.error('No rows selected');
      return;
    }
    const newRows = dataRows.filter((_, idx) => !selectedRows.has(idx));
    setDataRows(newRows);
    setSelectedRows(new Set());
    toast.success('Rows deleted successfully');
  };

  const handleCellChange = (row: number, col: string, value: any) => {
    const newRows = [...dataRows];
    newRows[row][col] = value;
    setDataRows(newRows);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-2 rounded-lg">
              <HiOutlineCube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Decision Engine
              </h1>
              <p className="text-sm text-gray-600">Rule-based logical engine for workflow automation</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRuleBuilder(true)}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center space-x-2"
            >
              <HiOutlinePlus className="w-4 h-4" />
              <span>New Rule</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all flex items-center space-x-2"
            >
              <HiOutlineUpload className="w-4 h-4" />
              <span>Import</span>
            </button>
            <button
              onClick={handleExport}
              disabled={results.length === 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiOutlineDownload className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => { setShowSavedFiles(true); fetchSavedFiles(); }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition flex items-center space-x-1"
            >
              <HiOutlineDocumentReport className="w-4 h-4" />
              <span>Saved Files</span>
            </button>
            {showResults && (
              <button
                onClick={() => setShowOnlyMatches(prev => !prev)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                title={showOnlyMatches ? 'Show all rows' : 'Show only matching rows'}
              >
                {showOnlyMatches ? 'Show all rows' : 'Show matches only'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Rules Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Rules</h2>
              <button
                onClick={fetchRules}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                title="Refresh rules"
              >
                <HiOutlineRefresh className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="p-2 space-y-1">
            {rules.length === 0 && (
              <div className="px-3 py-6 text-xs text-gray-500">
                No rules found.
              </div>
            )}
            {rules.map((rule) => (
              <div
                key={rule._id}
                className={`p-3 rounded-lg transition-all group ${
                  selectedRuleIds.has(rule._id as string)
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedRuleIds.has(rule._id as string)}
                      onChange={(e) => {
                        const next = new Set(selectedRuleIds);
                        const id = rule._id as string;
                        if (e.target.checked) next.add(id); else next.delete(id);
                        setSelectedRuleIds(next);
                      }}
                      className="w-4 h-4 rounded-full border-gray-300 text-green-600 focus:ring-green-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium text-sm">{rule.name}</span>
                  </div>
                  {selectedRuleIds.has(rule._id as string) && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                      selected
                    </span>
                  )}
                </div>
                {rule.description && (
                  <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                )}
                
                {/* Hover Actions */}
                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setShowRuleBuilder(true);
                      setNewRule({ name: rule.name, description: rule.description || '', rules: rule.rules as any });
                      setSelectedRule(rule);
                    }}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-all"
                  >
                    <HiOutlinePencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/decision/rules?id=${rule._id}`, { method: 'DELETE', credentials: 'include' });
                      if (res.ok) {
                        toast.success('Rule deleted');
                        fetchRules();
                        if (selectedRule?._id === rule._id) setSelectedRule(null);
                        const next = new Set(selectedRuleIds); next.delete(rule._id as string); setSelectedRuleIds(next);
                      } else {
                        toast.error('Failed to delete rule');
                      }
                    }}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all"
                  >
                    <HiOutlineTrash className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-white border-b">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all flex items-center space-x-1 text-sm"
              >
                <HiOutlinePlus className="w-4 h-4" />
                <span>Add Row</span>
              </button>
              <button
                onClick={handleDeleteRows}
                disabled={selectedRows.size === 0}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-sm"
              >
                <HiOutlineTrash className="w-4 h-4" />
                <span>Delete</span>
              </button>
              <button
                onClick={executeRules}
                disabled={isExecuting || dataRows.length === 0 || selectedRuleIds.size === 0}
                className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-sm"
              >
                {isExecuting ? (
                  <HiOutlineRefresh className="w-4 h-4 animate-spin" />
                ) : (
                  <HiOutlinePlay className="w-4 h-4" />
                )}
                <span>Execute Rules</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {dataRows.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <HiOutlineCube className="w-16 h-16 mx-auto text-gray-300" />
                  <p className="text-gray-600 mt-4">No data loaded</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-green-600 hover:text-green-700"
                  >
                    Import a file to get started
                  </button>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="border border-gray-200 p-2 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            const visible = (showOnlyMatches && showResults)
                              ? dataRows
                                  .map((_, idx) => idx)
                                  .filter(idx => !!results[idx] && (results[idx].success || (results[idx].matchedRules || []).length > 0))
                              : dataRows.map((_, idx) => idx);
                            setSelectedRows(new Set(visible));
                          } else {
                            setSelectedRows(new Set());
                          }
                        }}
                      />
                    </th>
                    {columns.map((col) => (
                      <th key={col} className="border border-gray-200 p-2 text-left text-sm font-semibold text-gray-700">
                        {col}
                      </th>
                    ))}
                    {showResults && (
                      <th className="border border-gray-200 p-2 text-left text-sm font-semibold text-gray-700">
                        Results
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(showOnlyMatches && showResults
                    ? dataRows.map((_, idx) => idx).filter(idx => !!results[idx] && (results[idx].success || (results[idx].matchedRules || []).length > 0))
                    : dataRows.map((_, idx) => idx)
                  ).map((rowIdx) => (
                    <tr key={rowIdx} className={selectedRows.has(rowIdx) ? 'bg-green-50' : ''}>
                      <td className="border border-gray-200 p-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(rowIdx)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedRows);
                            if (e.target.checked) {
                              newSelected.add(rowIdx);
                            } else {
                              newSelected.delete(rowIdx);
                            }
                            setSelectedRows(newSelected);
                          }}
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col} className="border border-gray-200 p-2">
                          {editingCell?.row === rowIdx && editingCell?.col === col ? (
                            <input
                              type="text"
                              value={dataRows[rowIdx][col] || ''}
                              onChange={(e) => handleCellChange(rowIdx, col, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingCell(null);
                              }}
                              className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() => setEditingCell({ row: rowIdx, col })}
                              className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                            >
                              {dataRows[rowIdx][col] || ''}
                            </div>
                          )}
                        </td>
                      ))}
                      {showResults && (
                        <td className="border border-gray-200 p-2">
                      {results[rowIdx] && results[rowIdx] !== undefined && (
                            <div className="flex flex-col space-y-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                results[rowIdx].success ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {results[rowIdx].finalAction}
                              </span>
                              {results[rowIdx].matchedRules.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {results[rowIdx].matchedRules.length} rule(s) matched
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Results Panel */}
        {showResults && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Execution Results</h3>
              <button onClick={() => setShowResults(false)} className="text-gray-500 hover:text-gray-700">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {results.filter(Boolean).map((result: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Row {idx + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      result.success ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {result.success ? 'Matched' : 'No Match'}
                    </span>
                  </div>
                  {result.matchedRules.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-700">Matched Rules:</p>
                      {result.matchedRules.map((match: any, midx: number) => (
                        <div key={midx} className="text-xs pl-2 border-l-2 border-green-300">
                          <p className="font-medium text-gray-700">{match.ruleName}</p>
                          <p className="text-gray-600">Priority: {match.priority}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.finalAction && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Files Modal */}
        {showSavedFiles && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Saved Exported Files</h3>
                <button onClick={() => setShowSavedFiles(false)} className="text-gray-500 hover:text-gray-700">
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                {savedFiles.length === 0 ? (
                  <p className="text-sm text-gray-500">No saved exports found.</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {savedFiles.map(file => (
                      <li key={file._id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadSavedFile(file._id)}
                          className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rule Builder Modal */}
      {showRuleBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Create New Decision Rule</h2>
                <button onClick={() => setShowRuleBuilder(false)} className="text-white hover:text-gray-200">
                  <HiOutlineX className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 max-h-[calc(90vh-150px)] overflow-y-auto">
              {/* Rule Name & Description */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name *</label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Age Verification for Loan Approval"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={2}
                    placeholder="Describe what this decision rule does..."
                  />
                </div>
              </div>

              {/* Rule Items */}
              {newRule.rules.map((ruleItem, ruleIndex) => (
                <div key={ruleItem.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Rule Item {ruleIndex + 1}</h3>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={ruleItem.name}
                        onChange={(e) => {
                          const updatedRules = [...newRule.rules];
                          updatedRules[ruleIndex].name = e.target.value;
                          setNewRule({ ...newRule, rules: updatedRules });
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Rule name"
                      />
                      <button
                        onClick={() => removeRuleItem(ruleIndex)}
                        disabled={newRule.rules.length === 1}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Conditions */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Conditions</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={ruleItem.logicOperator}
                          onChange={(e) => {
                            const updatedRules = [...newRule.rules];
                            updatedRules[ruleIndex].logicOperator = e.target.value as 'AND' | 'OR';
                            setNewRule({ ...newRule, rules: updatedRules });
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                        <button
                          onClick={() => addCondition(ruleIndex)}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                        >
                          <HiOutlinePlus className="w-4 h-4 inline" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {ruleItem.conditions.map((condition, conditionIndex) => (
                        <div key={condition.id} className="flex items-center space-x-2">
                          <select
                            value={condition.field}
                            onChange={(e) => {
                              const updatedRules = [...newRule.rules];
                              updatedRules[ruleIndex].conditions[conditionIndex].field = e.target.value;
                              setNewRule({ ...newRule, rules: updatedRules });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Select Field</option>
                            {columns.length > 0 ? columns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            )) : (
                              <option value="">No columns available</option>
                            )}
                          </select>
                          <select
                            value={condition.operator}
                            onChange={(e) => {
                              const updatedRules = [...newRule.rules];
                              updatedRules[ruleIndex].conditions[conditionIndex].operator = e.target.value as any;
                              setNewRule({ ...newRule, rules: updatedRules });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="==">=</option>
                            <option value="!=">!=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="<=">&lt;=</option>
                            <option value="contains">contains</option>
                            <option value="startsWith">starts with</option>
                            <option value="endsWith">ends with</option>
                            <option value="in">in</option>
                            <option value="notIn">not in</option>
                          </select>
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => {
                              const updatedRules = [...newRule.rules];
                              updatedRules[ruleIndex].conditions[conditionIndex].value = e.target.value;
                              setNewRule({ ...newRule, rules: updatedRules });
                            }}
                            placeholder="Value"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <button
                            onClick={() => removeCondition(ruleIndex, conditionIndex)}
                            disabled={ruleItem.conditions.length === 1}
                            className="px-2 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Actions</label>
                      <button
                        onClick={() => addAction(ruleIndex)}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                      >
                        <HiOutlinePlus className="w-4 h-4 inline" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {ruleItem.actions.map((action, actionIndex) => (
                        <div key={action.id} className="flex items-center space-x-2">
                          <select
                            value={action.type}
                            onChange={(e) => {
                              const updatedRules = [...newRule.rules];
                              updatedRules[ruleIndex].actions[actionIndex].type = e.target.value as any;
                              setNewRule({ ...newRule, rules: updatedRules });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="assign">Assign</option>
                            <option value="notify">Notify</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                            <option value="custom">Custom</option>
                          </select>
                          <input
                            type="text"
                            value={action.value}
                            onChange={(e) => {
                              const updatedRules = [...newRule.rules];
                              updatedRules[ruleIndex].actions[actionIndex].value = e.target.value;
                              setNewRule({ ...newRule, rules: updatedRules });
                            }}
                            placeholder="Action value"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <button
                            onClick={() => removeAction(ruleIndex, actionIndex)}
                            disabled={ruleItem.actions.length === 1}
                            className="px-2 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority: {ruleItem.priority}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ruleItem.priority}
                      onChange={(e) => {
                        const updatedRules = [...newRule.rules];
                        updatedRules[ruleIndex].priority = parseInt(e.target.value);
                        setNewRule({ ...newRule, rules: updatedRules });
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Rule Item Button */}
              <button
                onClick={addRuleItem}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all flex items-center justify-center space-x-2 text-gray-600"
              >
                <HiOutlinePlus className="w-5 h-5" />
                <span>Add Another Rule Item</span>
              </button>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveRule}
                  disabled={!newRule.name.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiOutlineSave className="w-5 h-5" />
                  <span className="font-semibold">Save Rule</span>
                </button>
                <button
                  onClick={() => {
                    setShowRuleBuilder(false);
                    setNewRule({ 
                      name: '', 
                      description: '', 
                      rules: [{
                        id: uuidv4(),
                        name: 'Rule 1',
                        conditions: [{ id: uuidv4(), field: '', operator: '==' as any, value: '' }],
                        logicOperator: 'AND' as 'AND' | 'OR',
                        actions: [{ id: uuidv4(), type: 'assign' as any, value: '', targetField: '', description: '' }],
                        priority: 0
                      }]
                    });
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

