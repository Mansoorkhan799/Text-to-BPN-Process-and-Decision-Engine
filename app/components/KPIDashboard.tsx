'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KPI } from '../types';
import { HiPlus, HiPencil, HiTrash, HiEye, HiEyeOff, HiCheck, HiX, HiChevronDown, HiChevronRight, HiRefresh } from 'react-icons/hi';
import { toast } from 'react-hot-toast';

const KPIDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isAddingKPI, setIsAddingKPI] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [editingCell, setEditingCell] = useState<{kpiId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Drag and drop hierarchy state
  const [draggedKPI, setDraggedKPI] = useState<KPI | null>(null);
  const [dragOverKPI, setDragOverKPI] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{kpiId: string, position: 'before' | 'after' | 'child' | 'blocked'} | null>(null);
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  
  // BPMN processes state
  const [bpmnProcesses, setBpmnProcesses] = useState<Array<{
    id: string;
    title: string;
    owner: string;
    createdAt: Date;
  }>>([]);
  const [isLoadingBPMNProcesses, setIsLoadingBPMNProcesses] = useState(false);
  const [showBPMNProcessesModal, setShowBPMNProcessesModal] = useState(false);
  const [selectedKPIForBPMN, setSelectedKPIForBPMN] = useState<KPI | null>(null);
  
  // Ref to track if initial load toast has been shown
  const hasShownInitialToast = useRef(false);
  
  // Form state for Add/Edit modal
  const [formData, setFormData] = useState<Partial<KPI>>({
    typeOfKPI: 'Effectiveness KPI',
    kpi: '',
    formula: '',
    kpiDirection: 'down',
    targetValue: '',
    frequency: 'Monthly',
    receiver: '',
    source: '',
    active: false,
    mode: 'Manual',
    tag: '',
    category: 'IT Operations',
    associatedBPMNProcesses: []
  });

  // Fetch BPMN processes
  const fetchBPMNProcesses = async () => {
    setIsLoadingBPMNProcesses(true);
    try {
      console.log('Fetching BPMN processes from /api/bpmn-nodes...');
      const response = await fetch('/api/bpmn-nodes?userId=680526996c989b235b85be36');
      console.log('BPMN processes API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('BPMN processes API response data:', data);
        
        if (data.success && data.tree && data.tree.length > 0) {
          // Filter only file type nodes (BPMN processes)
          const processes = data.tree
            .filter((node: any) => node.type === 'file')
            .map((node: any) => ({
              id: node.id,
              title: node.name,
              owner: node.advancedDetails?.createdBy || 'Unknown',
              createdAt: new Date(node.createdAt)
            }));
          console.log('Mapped BPMN processes:', processes);
          setBpmnProcesses(processes);
        } else {
          console.log('No BPMN processes found in response');
          setBpmnProcesses([]);
        }
      } else {
        console.error('BPMN processes API response not ok:', response.status, response.statusText);
        setBpmnProcesses([]);
        toast.error('Failed to load BPMN processes');
      }
    } catch (error) {
      console.error('Error fetching BPMN processes:', error);
      setBpmnProcesses([]);
      toast.error('Error loading BPMN processes');
    } finally {
      setIsLoadingBPMNProcesses(false);
    }
  };

  // Update KPI in database
  const updateKPIInDatabase = async (kpi: KPI) => {
    const updateData = {
      id: kpi.id,
      typeOfKPI: kpi.typeOfKPI,
      kpi: kpi.kpi,
      formula: kpi.formula,
      kpiDirection: kpi.kpiDirection,
      targetValue: kpi.targetValue,
      frequency: kpi.frequency,
      receiver: kpi.receiver,
      source: kpi.source,
      active: kpi.active,
      mode: kpi.mode,
      tag: kpi.tag,
      category: kpi.category,
      parentId: kpi.parentId,
      level: kpi.level,
      order: kpi.order,
      updatedAt: new Date()
    };
    console.log('Updating KPI in database:', updateData);
    
    const response = await fetch('/api/kpis', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error('Failed to update KPI in database');
    }

    const result = await response.json();
    console.log('KPI update result:', result);
    return result;
  };

  // Load both KPIs and BPMN processes on component mount
  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        console.log('Loading KPI Dashboard...');
        
        // Fetch KPIs
        const kpiResponse = await fetch('/api/kpis');
        console.log('KPI API response status:', kpiResponse.status);
        
        if (kpiResponse.ok) {
          const kpiData = await kpiResponse.json();
          console.log('KPI API response data:', kpiData);
          
          if (kpiData.success && kpiData.kpis) {
            console.log('Setting KPIs:', kpiData.kpis.length, 'KPIs found');
            // Map MongoDB _id to id for frontend compatibility
            const mappedKPIs = kpiData.kpis.map((kpi: any) => ({
              ...kpi,
              id: kpi._id || kpi.id
            }));
            console.log('Mapped KPIs with hierarchy:', mappedKPIs.map((k: any) => ({ 
              id: k.id, 
              kpi: k.kpi, 
              parentId: k.parentId, 
              level: k.level, 
              order: k.order 
            })));
            setKpis(mappedKPIs);
          } else {
            console.log('No KPIs found in response');
            setKpis([]);
          }
        } else {
          console.error('KPI API response not ok:', kpiResponse.status, kpiResponse.statusText);
          setKpis([]);
          toast.error('Failed to load KPIs');
        }
        
        // Fetch BPMN processes
        await fetchBPMNProcesses();
        
        // Show single success message for dashboard load (only once)
        if (!hasShownInitialToast.current) {
          toast.success('KPI Dashboard loaded successfully');
          hasShownInitialToast.current = true;
        }
        
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setKpis([]);
        toast.error('Error loading KPI Dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboard();
  }, []);

  // BPMN processes modal handlers
  const openBPMNProcessesModal = (kpi: KPI) => {
    setSelectedKPIForBPMN(kpi);
    setShowBPMNProcessesModal(true);
  };

  const closeBPMNProcessesModal = () => {
    setShowBPMNProcessesModal(false);
    setSelectedKPIForBPMN(null);
  };

  // Refresh KPIs function
  const refreshKPIs = async () => {
    setIsLoading(true);
    try {
      console.log('Refreshing KPIs...');
      const response = await fetch('/api/kpis');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.kpis) {
          console.log('Refreshed KPIs:', data.kpis.length, 'KPIs found');
          // Map MongoDB _id to id for frontend compatibility
          const mappedKPIs = data.kpis.map((kpi: any) => ({
            ...kpi,
            id: kpi._id || kpi.id
          }));
          setKpis(mappedKPIs);
          toast.success(`Refreshed ${mappedKPIs.length} KPIs successfully`);
        } else {
          console.log('No KPIs found in refresh response');
          setKpis([]);
        }
      } else {
        console.error('Failed to refresh KPIs:', response.status, response.statusText);
        toast.error('Failed to refresh KPIs');
      }
    } catch (error) {
      console.error('Error refreshing KPIs:', error);
      toast.error('Error refreshing KPIs');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete KPI function
  const handleDeleteKPI = async (kpiId: string) => {
    if (confirm('Are you sure you want to delete this KPI?')) {
      try {
        // Find the KPI to get its MongoDB _id
        const kpiToDelete = kpis.find(k => k.id === kpiId);
        if (!kpiToDelete) {
          alert('KPI not found');
          return;
        }

        // Use the MongoDB _id for deletion
        const mongoId = (kpiToDelete as any)._id || kpiId;
        const response = await fetch(`/api/kpis?id=${mongoId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          console.log('KPI deleted successfully');
          toast.success('KPI deleted successfully');
          // Refresh the KPIs from the server to ensure consistency
          await refreshKPIs();
        } else {
          const errorData = await response.json();
          console.error('Failed to delete KPI:', errorData);
          toast.error(`Failed to delete KPI: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting KPI:', error);
        toast.error('Error deleting KPI');
      }
    }
  };

  // Update KPI function
  const handleUpdateKPI = async (kpiData: any) => {
    try {
      // Find the KPI to get its MongoDB _id
      const kpiToUpdate = kpis.find(k => k.id === kpiData.id);
      if (!kpiToUpdate) {
        alert('KPI not found');
        return false;
      }

      // Use the MongoDB _id for update
      const mongoId = (kpiToUpdate as any)._id || kpiData.id;
      const updateData = {
        ...kpiData,
        id: mongoId
      };

      const response = await fetch('/api/kpis', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        console.log('KPI updated successfully');
        toast.success('KPI updated successfully');
        // Refresh the KPIs from the server to ensure consistency
        await refreshKPIs();
        return true;
      } else {
        const errorData = await response.json();
        console.error('Failed to update KPI:', errorData);
        toast.error(`Failed to update KPI: ${errorData.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('Error updating KPI:', error);
      toast.error('Error updating KPI');
      return false;
    }
  };

  const filteredKPIs = kpis.filter(kpi => {
      const matchesSearch = kpi.kpi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           kpi.typeOfKPI.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           kpi.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || kpi.category === filterCategory;
      const matchesType = filterType === 'all' || kpi.typeOfKPI === filterType;
      
      return matchesSearch && matchesCategory && matchesType;
    });
    
  console.log('Filtered KPIs:', filteredKPIs);
  console.log('Search term:', searchTerm);
  console.log('Filter category:', filterCategory);
  console.log('Filter type:', filterType);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'neutral':
        return '→';
      default:
        return '→';
    }
  };

  const getStatusColor = (active: boolean) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Automatic':
        return 'bg-blue-100 text-blue-800';
      case 'Semi-Automatic':
        return 'bg-yellow-100 text-yellow-800';
      case 'Manual':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle cell editing
  const handleCellClick = (kpiId: string, field: string, currentValue: string) => {
    setEditingCell({ kpiId, field });
    setEditValue(currentValue);
  };

  const handleCellSave = async () => {
    if (editingCell) {
      try {
        // Find the KPI being edited
        const kpiToUpdate = kpis.find(kpi => kpi.id === editingCell.kpiId);
        if (!kpiToUpdate) {
          toast.error('KPI not found');
          return;
        }

        let processedValue: any = editValue;
        
        // Handle boolean fields
        if (editingCell.field === 'active') {
          processedValue = editValue === 'true';
        } else if (editingCell.field === 'targetValue') {
          processedValue = parseFloat(editValue) || 0;
        }
        
        // Create updated KPI object
        const updatedKPI = {
          ...kpiToUpdate,
          [editingCell.field]: processedValue,
          updatedAt: new Date()
        };

        console.log('Saving cell edit to database:', {
          kpiId: editingCell.kpiId,
          field: editingCell.field,
          oldValue: kpiToUpdate[editingCell.field as keyof KPI],
          newValue: processedValue,
          kpiName: kpiToUpdate.kpi
        });
        
        // Update in database
        await updateKPIInDatabase(updatedKPI);
        
        // Update local state
        setKpis(kpis.map(kpi => {
          if (kpi.id === editingCell.kpiId) {
            return updatedKPI;
          }
          return kpi;
        }));

        toast.success(`${editingCell.field} updated successfully`);
        setEditingCell(null);
        setEditValue('');
      } catch (error) {
        console.error('Error saving cell edit:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to save changes: ${errorMessage}`);
      }
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle form operations
  const handleAddKPI = () => {
    setIsAddingKPI(true);
    setFormData({
      typeOfKPI: 'Effectiveness KPI',
      kpi: '',
      formula: '',
      kpiDirection: 'down',
      targetValue: '',
      frequency: 'Monthly',
      receiver: '',
      source: '',
      active: false,
      mode: 'Manual',
      tag: '',
      category: 'IT Operations'
    });
  };

  const handleEditKPI = (kpi: KPI) => {
    setEditingKPI(kpi);
    setFormData({
      typeOfKPI: kpi.typeOfKPI,
      kpi: kpi.kpi,
      formula: kpi.formula,
      kpiDirection: kpi.kpiDirection,
      targetValue: kpi.targetValue,
      frequency: kpi.frequency,
      receiver: kpi.receiver,
      source: kpi.source,
      active: kpi.active,
      mode: kpi.mode,
      tag: kpi.tag,
      category: kpi.category,
      associatedBPMNProcesses: kpi.associatedBPMNProcesses || []
    });
  };

  // Function to update BPMN process with associated KPI
  const updateBPMNProcessWithKPI = async (kpiId: string, bpmnProcessIds: string[], isAdding: boolean) => {
    try {
      for (const bpmnProcessId of bpmnProcessIds) {
        // Fetch the current BPMN process data
        const response = await fetch(`/api/bpmn-nodes?nodeId=${bpmnProcessId}&userId=680526996c989b235b85be36`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.node) {
            const currentSelectedKPIs = data.node.selectedKPIs || [];
            let updatedSelectedKPIs;
            
            if (isAdding) {
              // Add KPI to the process if not already present
              updatedSelectedKPIs = currentSelectedKPIs.includes(kpiId) 
                ? currentSelectedKPIs 
                : [...currentSelectedKPIs, kpiId];
            } else {
              // Remove KPI from the process
              updatedSelectedKPIs = currentSelectedKPIs.filter((id: string) => id !== kpiId);
            }
            
            // Update the BPMN process with the new selectedKPIs
            const updateResponse = await fetch('/api/bpmn-nodes', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                nodeId: bpmnProcessId,
                userId: '680526996c989b235b85be36',
                selectedKPIs: updatedSelectedKPIs
              })
            });
            
            if (updateResponse.ok) {
              console.log(`Updated BPMN process ${bpmnProcessId} with KPI ${kpiId}`);
            } else {
              console.error(`Failed to update BPMN process ${bpmnProcessId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating BPMN process with KPI:', error);
    }
  };

  const handleFormSubmit = async () => {
    if (!formData.kpi || !formData.receiver || !formData.source || !formData.tag || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    if (isAddingKPI) {
      // Add new KPI via API
      try {
        const response = await fetch('/api/kpis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            parentId: null,
            level: 0,
            order: kpis.length + 1,
            createdBy: 'system' // You might want to get this from auth
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const newKPI = data.kpi;
          console.log('KPI created successfully');
          toast.success('KPI created successfully');
          
          // Update associated BPMN processes with this KPI
          if (formData.associatedBPMNProcesses && formData.associatedBPMNProcesses.length > 0) {
            await updateBPMNProcessWithKPI(newKPI._id || newKPI.id, formData.associatedBPMNProcesses, true);
          }
          
          setIsAddingKPI(false);
          // Refresh the KPIs from the server to ensure consistency
          await refreshKPIs();
        } else {
          const errorData = await response.json();
          console.error('Failed to create KPI:', errorData);
          toast.error(`Failed to create KPI: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error creating KPI:', error);
        toast.error('Error creating KPI');
      }
    } else if (editingKPI) {
      // Get the old associated BPMN processes to compare with new ones
      const oldAssociatedProcesses = editingKPI.associatedBPMNProcesses || [];
      const newAssociatedProcesses = formData.associatedBPMNProcesses || [];
      
      // Find processes that were removed
      const removedProcesses = oldAssociatedProcesses.filter((id: string) => !newAssociatedProcesses.includes(id));
      // Find processes that were added
      const addedProcesses = newAssociatedProcesses.filter((id: string) => !oldAssociatedProcesses.includes(id));
      
      // Update BPMN processes
      if (removedProcesses.length > 0) {
        await updateBPMNProcessWithKPI(editingKPI.id, removedProcesses, false);
      }
      if (addedProcesses.length > 0) {
        await updateBPMNProcessWithKPI(editingKPI.id, addedProcesses, true);
      }
      
      // Update existing KPI via API
      const success = await handleUpdateKPI({
        id: editingKPI.id,
        ...formData
      });
      
      if (success) {
        setEditingKPI(null);
      }
    }
    
    setFormData({
      typeOfKPI: 'Effectiveness KPI',
      kpi: '',
      formula: '',
      kpiDirection: 'down',
      targetValue: '',
      frequency: 'Monthly',
      receiver: '',
      source: '',
      active: false,
      mode: 'Manual',
      tag: '',
      category: 'IT Operations',
      associatedBPMNProcesses: []
    });
  };

  const handleFormCancel = () => {
    setIsAddingKPI(false);
    setEditingKPI(null);
    setFormData({
      typeOfKPI: 'Effectiveness KPI',
      kpi: '',
      formula: '',
      kpiDirection: 'down',
      targetValue: '',
      frequency: 'Monthly',
      receiver: '',
      source: '',
      active: false,
      mode: 'Manual',
      tag: '',
      category: 'IT Operations',
      associatedBPMNProcesses: []
    });
  };

  // Enhanced drag and drop hierarchy handlers
  const handleDragStart = (e: React.DragEvent, kpi: KPI) => {
    setDraggedKPI(kpi);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', kpi.id);
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
      e.currentTarget.style.transform = 'rotate(2deg)';
    }
  };

  const handleDragOver = (e: React.DragEvent, targetKPI: KPI) => {
    e.preventDefault();
    if (!draggedKPI || draggedKPI.id === targetKPI.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    const height = rect.height;
    const width = rect.width;
    
    // Determine drop position based on vertical and horizontal position
    let position: 'before' | 'after' | 'child' | 'blocked';
    
    // Check for circular references first
    const wouldCreateCircularRef = (pos: 'before' | 'after' | 'child') => {
      if (pos === 'child') {
        // Check if dragged item is a descendant of target
        if (isDescendant(draggedKPI.id, targetKPI.id, kpis)) {
          return true;
        }
        // Check if target is a descendant of dragged item
        if (isDescendant(targetKPI.id, draggedKPI.id, kpis)) {
          return true;
        }
      } else if (pos === 'before' || pos === 'after') {
        // Check for invalid hierarchy moves
        if (draggedKPI.level === 0 && targetKPI.level > 0) {
          return true; // Parent cannot be demoted to child level
        }
        if (draggedKPI.level === 0 && isDescendant(targetKPI.id, draggedKPI.id, kpis)) {
          return true; // Parent cannot be moved to same level as its descendant
        }
      }
      return false;
    };
    
    // More intuitive positioning with clear visual zones:
    // - Top 25% = above (same level)
    // - Bottom 25% = below (same level)  
    // - Middle 50% = child (with right drag preference)
    if (y < height * 0.25) {
      position = 'before'; // Drop above the target
    } else if (y > height * 0.75) {
      position = 'after'; // Drop below the target
    } else {
      // For middle area, check if dragging right to make it a child
      if (x > width * 0.5) {
        position = 'child'; // Dragging right = make child
      } else {
        position = 'before'; // Default to same level for middle-left area
      }
    }
    
    // Check if this operation would create a circular reference or invalid hierarchy
    if (wouldCreateCircularRef(position)) {
      position = 'blocked';
      console.log('🚫 DRAG BLOCKED: Invalid operation detected');
    }
    
    setDragTarget({ kpiId: targetKPI.id, position });
    setDragOverKPI(targetKPI.id);
  };

  const handleDrop = async (e: React.DragEvent, targetKPI: KPI) => {
    e.preventDefault();
    if (!draggedKPI || draggedKPI.id === targetKPI.id || !dragTarget) return;

    // If the operation is blocked, don't proceed
    if (dragTarget.position === 'blocked') {
      console.log('🚫 DROP BLOCKED: Invalid operation prevented');
      toast.error('❌ Invalid Operation: This action would create an invalid hierarchy!');
      return;
    }

    let newKpis = [...kpis];
    const draggedIndex = newKpis.findIndex(k => k.id === draggedKPI.id);
    const targetIndex = newKpis.findIndex(k => k.id === targetKPI.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const draggedItem = { ...newKpis[draggedIndex] };
    const targetItem = { ...newKpis[targetIndex] };

    console.log('🚀 DRAG OPERATION STARTED:', {
      draggedItem: { 
        id: draggedItem.id, 
        kpi: draggedItem.kpi, 
        parentId: draggedItem.parentId, 
        level: draggedItem.level,
        isParent: draggedItem.level === 0,
        isChild: draggedItem.level > 0
      },
      targetItem: { 
        id: targetItem.id, 
        kpi: targetItem.kpi, 
        parentId: targetItem.parentId, 
        level: targetItem.level,
        isParent: targetItem.level === 0,
        isChild: targetItem.level > 0
      },
      dragPosition: dragTarget.position,
      operation: `${draggedItem.level === 0 ? 'Parent' : 'Child'} -> ${targetItem.level === 0 ? 'Parent' : 'Child'} (${dragTarget.position})`
    });

    // Professional Hierarchy Validation - Best Practices
    console.log('Professional Hierarchy Check:', {
      draggedItem: { id: draggedItem.id, kpi: draggedItem.kpi, parentId: draggedItem.parentId, level: draggedItem.level },
      targetItem: { id: targetItem.id, kpi: targetItem.kpi, parentId: targetItem.parentId, level: targetItem.level },
      operation: dragTarget.position
    });

    // Rule 1: Prevent circular references (parent cannot become child of its descendant)
    if (dragTarget.position === 'child') {
      // Check if dragged item is a descendant of target (would create circular reference)
      if (isDescendant(draggedItem.id, targetItem.id, newKpis)) {
        console.log('❌ CIRCULAR REFERENCE BLOCKED: Dragged item is a descendant of target');
        toast.error('❌ Invalid Operation: A parent cannot become a child of its own descendant!');
      return;
    }

      // Additional check: if target is a descendant of dragged item
      if (isDescendant(targetItem.id, draggedItem.id, newKpis)) {
        console.log('❌ CIRCULAR REFERENCE BLOCKED: Target is a descendant of dragged item');
        toast.error('❌ Invalid Operation: A parent cannot become a child of its own descendant!');
        return;
      }
    }

    // Rule 2: Prevent invalid hierarchy moves (parent cannot be moved to same level as its child)
    if (dragTarget.position === 'before' || dragTarget.position === 'after') {
      // Allow child promotion (child -> parent level)
      if (draggedItem.level > 0 && targetItem.level === 0) {
        console.log('✅ CHILD PROMOTION ALLOWED: Child can be promoted to parent level');
        // This is allowed - child being promoted to parent level
      }
      // Block parent demotion (parent -> child level)
      else if (draggedItem.level === 0 && targetItem.level > 0) {
        console.log('❌ PARENT DEMOTION BLOCKED: Parent cannot be moved to child level');
        toast.error('❌ Invalid Operation: A parent cannot be moved to the same level as its child! Only children can be promoted to parent level.');
        return;
      }
      // Block other invalid moves (parent -> same level as its descendant)
      else if (draggedItem.level === 0 && isDescendant(targetItem.id, draggedItem.id, newKpis)) {
        console.log('❌ INVALID HIERARCHY BLOCKED: Parent cannot be moved to same level as its descendant');
        toast.error('❌ Invalid Operation: A parent cannot be moved to the same level as its descendant!');
        return;
      }
    }

    // Rule 3: Additional validation for edge cases
    if (dragTarget.position === 'before' || dragTarget.position === 'after') {
      // Additional check for same-level moves between parents
      if (draggedItem.level === 0 && targetItem.level === 0) {
        console.log('✅ PARENT-TO-PARENT ALLOWED: Both items are at parent level');
        // This is allowed - parent to parent movement
      }
      // Additional check for same-level moves between children
      else if (draggedItem.level > 0 && targetItem.level > 0) {
        console.log('✅ CHILD-TO-CHILD ALLOWED: Both items are at child level');
        // This is allowed - child to child movement
      }
    }

    try {
      if (dragTarget.position === 'child') {
        console.log('✅ Making child relationship:', {
          draggedItem: { id: draggedItem.id, kpi: draggedItem.kpi },
          targetItem: { id: targetItem.id, kpi: targetItem.kpi }
        });
        
        // Professional Child Creation
        await createChildRelationship(draggedItem, targetItem, newKpis);
        
        toast.success(`✅ ${draggedItem.kpi} is now a child of ${targetItem.kpi}`);
    } else if (dragTarget.position === 'before') {
        console.log('✅ Moving above target at same level:', {
          draggedItem: { id: draggedItem.id, kpi: draggedItem.kpi, parentId: draggedItem.parentId, level: draggedItem.level },
          targetItem: { id: targetItem.id, kpi: targetItem.kpi, parentId: targetItem.parentId, level: targetItem.level }
        });
        
        // Professional Same-Level Movement
        await moveToSameLevel(draggedItem, targetItem, 'before');
        toast.success(`✅ ${draggedItem.kpi} moved above ${targetItem.kpi}`);
    } else if (dragTarget.position === 'after') {
        console.log('✅ Moving below target at same level:', {
          draggedItem: { id: draggedItem.id, kpi: draggedItem.kpi, parentId: draggedItem.parentId, level: draggedItem.level },
          targetItem: { id: targetItem.id, kpi: targetItem.kpi, parentId: targetItem.parentId, level: targetItem.level }
        });
        
        // Professional Same-Level Movement
        await moveToSameLevel(draggedItem, targetItem, 'after');
        toast.success(`✅ ${draggedItem.kpi} moved below ${targetItem.kpi}`);
    }

    // Remove dragged item from current position
    newKpis.splice(draggedIndex, 1);
    
    // Insert at new position
    newKpis.splice(targetIndex, 0, draggedItem);
    
    // Sort by order and update levels
    newKpis.sort((a, b) => a.order - b.order);
    newKpis = updateHierarchyLevels(newKpis);
    
    setKpis(newKpis);
    } catch (error) {
      console.error('Error updating KPI hierarchy:', error);
      toast.error('Failed to update KPI hierarchy');
    } finally {
    setDraggedKPI(null);
    setDragOverKPI(null);
    setDragTarget(null);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '';
      e.currentTarget.style.transform = '';
    }
    
    setDraggedKPI(null);
    setDragOverKPI(null);
    setDragTarget(null);
  };

  // Professional Helper function to check if an item is a descendant of another
  const isDescendant = (itemId: string, potentialAncestorId: string, kpis: KPI[]): boolean => {
    console.log(`🔍 Checking if ${itemId} is descendant of ${potentialAncestorId}`);
    
    // Prevent infinite loops
    const visited = new Set<string>();
    
    const checkDescendant = (currentId: string): boolean => {
      // Prevent infinite loops
      if (visited.has(currentId)) {
        console.log(`⚠️ Circular reference detected in hierarchy: ${currentId}`);
        return false;
      }
      visited.add(currentId);
      
      const item = kpis.find(k => k.id === currentId);
      if (!item || !item.parentId) {
        console.log(`🔍 Item ${currentId} has no parent, not a descendant`);
        return false;
      }
      
      if (item.parentId === potentialAncestorId) {
        console.log(`✅ Item ${currentId} is direct child of ${potentialAncestorId}`);
        return true;
      }
      
      console.log(`🔍 Checking parent ${item.parentId} of ${currentId}`);
      return checkDescendant(item.parentId);
    };
    
    const result = checkDescendant(itemId);
    console.log(`🔍 Result: ${itemId} is ${result ? 'a descendant' : 'not a descendant'} of ${potentialAncestorId}`);
    return result;
  };

  // Professional Child Relationship Creation
  const createChildRelationship = async (childItem: KPI, parentItem: KPI, kpis: KPI[]) => {
    try {
      // Step 1: Update the child item
      childItem.parentId = parentItem.id;
      childItem.level = parentItem.level + 1;
      childItem.order = parentItem.order + 0.5;
      
      console.log('📝 Updating child item:', { 
        id: childItem.id, 
        parentId: childItem.parentId, 
        level: childItem.level, 
        order: childItem.order 
      });
      
      await updateKPIInDatabase(childItem);
      
      // Step 2: Update any existing children of the child item (grandchildren)
      const grandchildren = kpis.filter(kpi => kpi.parentId === childItem.id);
      if (grandchildren.length > 0) {
        console.log('📝 Updating grandchildren:', grandchildren.map(g => ({ id: g.id, kpi: g.kpi })));
        
        for (const grandchild of grandchildren) {
          grandchild.parentId = parentItem.id;
          grandchild.level = parentItem.level + 2;
          await updateKPIInDatabase(grandchild);
        }
      }
      
      console.log('✅ Child relationship created successfully');
    } catch (error) {
      console.error('❌ Error creating child relationship:', error);
      throw error;
    }
  };

  // Professional Same-Level Movement
  const moveToSameLevel = async (movedItem: KPI, targetItem: KPI, position: 'before' | 'after') => {
    try {
      console.log('🔄 Starting same-level movement:', {
        movedItem: { id: movedItem.id, kpi: movedItem.kpi, level: movedItem.level, parentId: movedItem.parentId },
        targetItem: { id: targetItem.id, kpi: targetItem.kpi, level: targetItem.level, parentId: targetItem.parentId },
        position: position
      });

      // Update the moved item to match target's level
      movedItem.parentId = targetItem.parentId;
      movedItem.level = targetItem.level;
      movedItem.order = position === 'before' 
        ? targetItem.order - 0.5 
        : targetItem.order + 0.5;
      
      // If target is top-level, ensure moved item is also top-level
      if (!targetItem.parentId) {
        movedItem.parentId = null;
        movedItem.level = 0;
        console.log('🎯 PROMOTION: Child promoted to top-level parent');
      }
      
      console.log('📝 Moving to same level:', { 
        id: movedItem.id, 
        parentId: movedItem.parentId, 
        level: movedItem.level, 
        order: movedItem.order 
      });
      
      await updateKPIInDatabase(movedItem);
      console.log('✅ Same-level movement completed successfully');
    } catch (error) {
      console.error('❌ Error in same-level movement:', error);
      throw error;
    }
  };

  // Helper function to update hierarchy levels
  const updateHierarchyLevels = (kpis: KPI[]): KPI[] => {
    return kpis.map(kpi => {
      if (kpi.parentId) {
        const parent = kpis.find(p => p.id === kpi.parentId);
        return { ...kpi, level: parent ? parent.level + 1 : 0 };
      }
      return { ...kpi, level: 0 };
    });
  };

  // Get sorted KPIs with proper hierarchy - only return top-level KPIs
  const getHierarchicalKPIs = (): KPI[] => {
    console.log('All KPIs:', kpis);
    // Only return top-level KPIs (level 0 or no parentId) - renderKPIRow will handle children
    const hierarchicalKPIs = kpis
      .filter(kpi => !kpi.parentId || kpi.level === 0)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    console.log('Top-level KPIs:', hierarchicalKPIs);
    return hierarchicalKPIs;
  };

  // Get children of a specific KPI
  const getChildren = (parentId: string): KPI[] => {
    const children = kpis
      .filter(kpi => kpi.parentId === parentId)
      .sort((a, b) => a.order - b.order);
    console.log(`Children of ${parentId}:`, children.map(c => ({ id: c.id, kpi: c.kpi, parentId: c.parentId, level: c.level })));
    return children;
  };

  // Toggle row collapse/expand
  const toggleRowCollapse = (kpiId: string) => {
    const newCollapsed = new Set(collapsedRows);
    if (newCollapsed.has(kpiId)) {
      newCollapsed.delete(kpiId);
    } else {
      newCollapsed.add(kpiId);
    }
    setCollapsedRows(newCollapsed);
  };

  // Helper functions for hierarchy management
  const promoteKPI = (kpiId: string) => {
    const kpi = kpis.find(k => k.id === kpiId);
    if (!kpi || !kpi.parentId) return;

    const parent = kpis.find(k => k.id === kpi.parentId);
    if (!parent) return;

    setKpis(kpis.map(k => {
      if (k.id === kpiId) {
        return {
          ...k,
          parentId: parent.parentId,
          level: parent.level,
          order: parent.order + 0.5
        };
      }
      return k;
    }));
  };

  const demoteKPI = (kpiId: string, targetParentId: string) => {
    const kpi = kpis.find(k => k.id === kpiId);
    const targetParent = kpis.find(k => k.id === targetParentId);
    if (!kpi || !targetParent) return;

    setKpis(kpis.map(k => {
      if (k.id === kpiId) {
        return {
          ...k,
          parentId: targetParentId,
          level: targetParent.level + 1,
          order: targetParent.order + 0.5
        };
      }
      return k;
    }));
  };

  // Render KPI row with enhanced drag and drop support and hierarchy visualization
  const renderKPIRow = (kpi: KPI, isChild: boolean = false): JSX.Element => {
    const children = getChildren(kpi.id);
    const indentLevel = kpi.level * 32; // Increased indentation for better hierarchy visibility
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedRows.has(kpi.id);

    return (
      <>
        <tr 
          key={kpi.id} 
          className={`hover:bg-gray-50 hover:shadow-lg transition-all duration-200 ${
            isChild ? 'bg-gray-25' : ''
          } ${
            draggedKPI?.id === kpi.id ? 'opacity-50' : ''
          } ${
            dragOverKPI === kpi.id ? (
              dragTarget?.position === 'child' ? 'bg-green-100 ring-2 ring-green-400' :
              dragTarget?.position === 'before' ? 'bg-blue-100 ring-2 ring-blue-400' :
              dragTarget?.position === 'after' ? 'bg-purple-100 ring-2 ring-purple-400' :
              'bg-blue-100 ring-2 ring-blue-300'
            ) : ''
          } ${
            kpi.level > 0 ? 'border-l-4 border-l-blue-200' : ''
          } ${
            kpi.level === 0 ? 'bg-white' : kpi.level === 1 ? 'bg-blue-25' : 'bg-blue-50'
          }`}
          style={{
            borderRadius: kpi.level === 0 ? '12px' : '8px',
            marginBottom: kpi.level === 0 ? '16px' : '8px',
            boxShadow: kpi.level === 0 ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
            position: 'relative'
          }}
          draggable
          onDragStart={(e) => handleDragStart(e, kpi)}
          onDragOver={(e) => handleDragOver(e, kpi)}
          onDrop={(e) => handleDrop(e, kpi)}
          onDragEnd={handleDragEnd}
        >
          {/* Type of KPI */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 relative">
            {/* Child drop zone indicator */}
            {dragOverKPI === kpi.id && dragTarget?.position === 'child' && (
              <div className="absolute inset-0 bg-green-100 bg-opacity-50 border-2 border-green-400 border-dashed rounded-lg flex items-center justify-center">
                <div className="text-green-700 font-semibold text-sm">
                  ➡️ Drop here to make child
                </div>
              </div>
            )}
            {/* Before drop zone indicator */}
            {dragOverKPI === kpi.id && dragTarget?.position === 'before' && (
              <div className="absolute top-0 left-0 right-0 h-1/4 bg-blue-100 bg-opacity-50 border-t-2 border-blue-400 border-dashed flex items-center justify-center">
                <div className="text-blue-700 font-semibold text-xs">
                  ⬆️ Drop above (same level)
                </div>
              </div>
            )}
            {/* After drop zone indicator */}
            {dragOverKPI === kpi.id && dragTarget?.position === 'after' && (
              <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-purple-100 bg-opacity-50 border-b-2 border-purple-400 border-dashed flex items-center justify-center">
                <div className="text-purple-700 font-semibold text-xs">
                  ⬇️ Drop below (same level)
                </div>
              </div>
            )}
            {/* Blocked drop zone indicator */}
            {dragOverKPI === kpi.id && dragTarget?.position === 'blocked' && (
              <div className="absolute inset-0 bg-red-100 bg-opacity-50 border-2 border-red-400 border-dashed rounded-lg flex items-center justify-center">
                <div className="text-red-700 font-semibold text-sm flex items-center">
                  🚫 Invalid Operation - Blocked
                </div>
              </div>
            )}
            <div className="flex items-center">
              <div style={{ marginLeft: `${indentLevel}px` }} className="flex items-center">
                {/* Hierarchy indicators */}
                {kpi.level > 0 && (
                  <div className="mr-2 flex items-center">
                    {/* Show connecting lines for hierarchy */}
                    <div className="flex items-center">
                      {Array.from({ length: kpi.level }, (_, i) => (
                        <div key={i} className="w-4 h-px bg-blue-300 mr-1"></div>
                      ))}
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                )}
                
                {/* Expand/Collapse button */}
                {hasChildren && (
                  <button
                    onClick={() => toggleRowCollapse(kpi.id)}
                    className="mr-2 text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-100"
                    title={isCollapsed ? "Expand children" : "Collapse children"}
                  >
                    {isCollapsed ? <HiChevronRight className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
                  </button>
                )}
                
                {/* Hierarchy level indicator */}
                {kpi.level > 0 && (
                  <div className="mr-2 flex items-center">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      L{kpi.level}
                    </span>
              </div>
                )}
                
                {/* Parent indicator */}
                {kpi.level === 0 && hasChildren && (
                  <div className="mr-2 flex items-center">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Parent
                    </span>
                  </div>
                )}
                
                {renderSelectableCell(
                  kpi, 
                  'typeOfKPI', 
                  kpi.typeOfKPI, 
                  ['Effectiveness KPI', 'Efficiency KPI', 'Productivity KPI', 'Quality KPI', 'Timeliness KPI', 'Financial KPI'],
                  editingCell?.kpiId === kpi.id && editingCell?.field === 'typeOfKPI'
                )}
              </div>
            </div>
          </td>
          
          {/* KPI Name */}
          <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 max-w-xs">
            {renderEditableCell(kpi, 'kpi', kpi.kpi, editingCell?.kpiId === kpi.id && editingCell?.field === 'kpi')}
          </td>
          
          {/* Formula */}
          <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 max-w-xs">
            {renderEditableCell(kpi, 'formula', kpi.formula || '', editingCell?.kpiId === kpi.id && editingCell?.field === 'formula')}
          </td>
          
          {/* KPI Direction */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {editingCell?.kpiId === kpi.id && editingCell?.field === 'kpiDirection' ? (
              renderSelectableCell(
                kpi, 
                'kpiDirection', 
                kpi.kpiDirection, 
                ['up', 'down', 'neutral'],
                true
              )
            ) : (
              <div
                className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center"
                onClick={() => handleCellClick(kpi.id, 'kpiDirection', kpi.kpiDirection)}
                title="Click to edit"
              >
                <span className="text-lg mr-2">{getDirectionIcon(kpi.kpiDirection)}</span>
                <span className="text-xs text-gray-500 capitalize">{kpi.kpiDirection}</span>
                </div>
              )}
          </td>
          
          {/* Target Value */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'targetValue', kpi.targetValue, editingCell?.kpiId === kpi.id && editingCell?.field === 'targetValue')}
          </td>
          
          {/* Frequency */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderSelectableCell(
              kpi, 
              'frequency', 
              kpi.frequency, 
              ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Real-time'],
              editingCell?.kpiId === kpi.id && editingCell?.field === 'frequency'
            )}
          </td>
          
          {/* Receiver */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'receiver', kpi.receiver, editingCell?.kpiId === kpi.id && editingCell?.field === 'receiver')}
          </td>
          
          {/* Source */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'source', kpi.source, editingCell?.kpiId === kpi.id && editingCell?.field === 'source')}
          </td>
          
          {/* Active Status */}
          <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-gray-200">
            {editingCell?.kpiId === kpi.id && editingCell?.field === 'active' ? (
              <div className="flex items-center space-x-1">
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCellSave();
                    if (e.key === 'Escape') handleCellCancel();
                  }}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                <button
                  onClick={handleCellSave}
                  className="p-1 text-green-600 hover:text-green-800"
                  title="Save"
                >
                  <HiCheck className="w-3 h-3" />
                </button>
                <button
                  onClick={handleCellCancel}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Cancel"
                >
                  <HiX className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                onClick={() => handleCellClick(kpi.id, 'active', kpi.active.toString())}
                title="Click to edit"
              >
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(kpi.active)}`}>
                  {kpi.active ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </td>
          
          {/* Mode */}
          <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-gray-200">
            {renderSelectableCell(
              kpi, 
              'mode', 
              kpi.mode, 
              ['Manual', 'Automatic', 'Semi-Automatic'],
              editingCell?.kpiId === kpi.id && editingCell?.field === 'mode'
            )}
          </td>
          
          {/* Tag */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'tag', kpi.tag, editingCell?.kpiId === kpi.id && editingCell?.field === 'tag')}
          </td>
          
          {/* Category */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
            {renderEditableCell(kpi, 'category', kpi.category, editingCell?.kpiId === kpi.id && editingCell?.field === 'category')}
          </td>
          
          {/* Associated BPMN Processes */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            <button
              onClick={() => openBPMNProcessesModal(kpi)}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
                <rect x="7" y="9" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
              </svg>
              {kpi.associatedBPMNProcesses?.length || 0} processes
            </button>
          </td>
          
          {/* Actions */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditKPI(kpi)}
                className="text-blue-600 hover:text-blue-900"
                title="Edit KPI"
              >
                <HiPencil className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  try {
                    const updatedKPI = { ...kpi, active: !kpi.active, updatedAt: new Date() };
                    
                    console.log('Toggling KPI active status:', {
                      kpiId: kpi.id,
                      kpiName: kpi.kpi,
                      oldStatus: kpi.active,
                      newStatus: !kpi.active
                    });
                    
                    await updateKPIInDatabase(updatedKPI);
                    
                    setKpis(kpis.map(k => 
                      k.id === kpi.id ? updatedKPI : k
                    ));
                    
                    toast.success(`KPI ${!kpi.active ? 'activated' : 'deactivated'} successfully`);
                  } catch (error) {
                    console.error('Error toggling KPI status:', error);
                    toast.error('Failed to update KPI status');
                  }
                }}
                className="text-gray-600 hover:text-gray-900"
                title={kpi.active ? "Deactivate KPI" : "Activate KPI"}
              >
                {kpi.active ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
              </button>
              {/* Hierarchy Controls */}
              {kpi.parentId && (
                <button
                  onClick={() => promoteKPI(kpi.id)}
                  className="text-green-600 hover:text-green-900"
                  title="Promote (move up one level)"
                >
                  ⬆️
                </button>
              )}
              {kpi.level === 0 && (
                <button
                  onClick={() => {
                    // Find a suitable parent (first KPI above this one)
                    const currentIndex = kpis.findIndex(k => k.id === kpi.id);
                    const potentialParent = kpis.slice(0, currentIndex).reverse().find(k => k.level === 0);
                    if (potentialParent) {
                      demoteKPI(kpi.id, potentialParent.id);
                    }
                  }}
                  className="text-purple-600 hover:text-purple-900"
                  title="Demote (make child of previous KPI)"
                >
                  ⬇️
                </button>
              )}
              <button
                onClick={() => handleDeleteKPI(kpi.id)}
                className="text-red-600 hover:text-red-900"
                title="Delete KPI"
              >
                <HiTrash className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
        
        {/* Render children recursively if not collapsed */}
        {!isCollapsed && children.map((child, childIndex) => (
          <React.Fragment key={child.id}>
            {/* Add spacing before child records */}
            <tr>
              <td colSpan={13} className="h-2"></td>
            </tr>
            {renderKPIRow(child, true)}
            {/* Add spacing after child records */}
            {childIndex < children.length - 1 && (
              <tr>
                <td colSpan={13} className="h-2"></td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  // Render editable cell
  const renderEditableCell = (kpi: KPI, field: string, value: string, isEditing: boolean) => {
    if (isEditing && editingCell?.kpiId === kpi.id && editingCell?.field === field) {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
          />
          <button
            onClick={handleCellSave}
            className="p-1 text-green-600 hover:text-green-800"
            title="Save"
          >
            <HiCheck className="w-3 h-3" />
          </button>
          <button
            onClick={handleCellCancel}
            className="p-1 text-red-600 hover:text-red-800"
            title="Cancel"
          >
            <HiX className="w-3 h-3" />
          </button>
            </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
        onClick={() => handleCellClick(kpi.id, field, value)}
        title="Click to edit"
      >
        {value}
            </div>
    );
  };

  // Render selectable cell for dropdown fields
  const renderSelectableCell = (kpi: KPI, field: string, value: string, options: string[], isEditing: boolean) => {
    if (isEditing && editingCell?.kpiId === kpi.id && editingCell?.field === field) {
      return (
        <div className="flex items-center space-x-1">
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
          >
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            onClick={handleCellSave}
            className="p-1 text-green-600 hover:text-green-800"
            title="Save"
          >
            <HiCheck className="w-3 h-3" />
          </button>
          <button
            onClick={handleCellCancel}
            className="p-1 text-red-600 hover:text-red-800"
            title="Cancel"
          >
            <HiX className="w-3 h-3" />
          </button>
            </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
        onClick={() => handleCellClick(kpi.id, field, value)}
        title="Click to edit"
      >
        {value}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
            <h2 className="text-xl font-semibold text-gray-900">KPI Dashboard</h2>
            <p className="text-sm text-gray-600">Manage and monitor your Key Performance Indicators</p>
            <p className="text-xs text-blue-600 mt-1">
              💡 Click any cell to edit | 🖱️ Drag rows to create hierarchy: 
              <span className="font-semibold text-blue-600"> Top 25%=Above</span> | 
              <span className="font-semibold text-green-600"> Middle-Right=Child</span> | 
              <span className="font-semibold text-purple-600"> Bottom 25%=Below</span>
            </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshKPIs}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiRefresh className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleAddKPI}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <HiPlus className="w-4 h-4 mr-2" />
                Add KPI
              </button>
            </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search KPIs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="IT Operations">IT Operations</option>
              <option value="Financial">Financial</option>
              <option value="Customer Service">Customer Service</option>
              <option value="Operations">Operations</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Effectiveness KPI">Effectiveness KPI</option>
              <option value="Efficiency KPI">Efficiency KPI</option>
              <option value="Productivity KPI">Productivity KPI</option>
              <option value="Quality KPI">Quality KPI</option>
              <option value="Timeliness KPI">Timeliness KPI</option>
              <option value="Financial KPI">Financial KPI</option>
            </select>
        </div>
      </div>


      {/* Drag Target Indicator */}
      {dragTarget && (
        <div className={`px-6 py-3 border-b ${
          dragTarget.position === 'child' ? 'bg-green-50 border-green-200' :
          dragTarget.position === 'before' ? 'bg-blue-50 border-blue-200' :
          dragTarget.position === 'after' ? 'bg-purple-50 border-purple-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <span className="font-medium text-gray-700">Drop Position:</span>
              {dragTarget.position === 'before' && (
                <div className="flex items-center space-x-2 text-blue-700">
                  <span className="text-lg">⬆️</span>
                  <span>Drop above target (same level)</span>
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded">Parent Level</span>
                </div>
              )}
              {dragTarget.position === 'after' && (
                <div className="flex items-center space-x-2 text-purple-700">
                  <span className="text-lg">⬇️</span>
                  <span>Drop below target (same level)</span>
                  <span className="text-xs bg-purple-100 px-2 py-1 rounded">Parent Level</span>
                </div>
              )}
              {dragTarget.position === 'child' && (
                <div className="flex items-center space-x-2 text-green-700">
                  <span className="text-lg">➡️</span>
                  <span>Drop as child of target</span>
                  <span className="text-xs bg-green-100 px-2 py-1 rounded">Child Level</span>
                </div>
              )}
              {dragTarget.position === 'blocked' && (
                <div className="flex items-center space-x-2 text-red-700">
                  <span className="text-lg">🚫</span>
                  <span>Invalid Operation - Blocked</span>
                  <span className="text-xs bg-red-100 px-2 py-1 rounded">Not Allowed</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {dragTarget.position === 'blocked' ? 
                '❌ This operation would create an invalid hierarchy' :
                '💡 Drag to middle-right area for child relationship'
              }
            </div>
                </div>
          </div>
      )}

      {/* KPI Grid Table */}
      <div className="overflow-x-auto bg-gray-50 p-4 rounded-lg">
        <table className="min-w-full">
          <thead className="bg-blue-50 rounded-t-lg shadow-sm border-b-2 border-blue-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Type of KPI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                KPI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Formula
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                KPI Direction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Target Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Receiver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Active
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Tag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-blue-200">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                Associated BPMN Processes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={13} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <HiRefresh className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-600">Loading KPIs...</span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Add top spacing for the first record */}
                <tr>
                  <td colSpan={13} className="h-6"></td>
                </tr>
                {getHierarchicalKPIs().map((kpi, index) => (
              <React.Fragment key={kpi.id}>
                {renderKPIRow(kpi)}
                {/* Add spacing between parent records */}
                {kpi.level === 0 && index < getHierarchicalKPIs().length - 1 && (
                  <tr>
                    <td colSpan={13} className="h-6"></td>
                  </tr>
                )}
              </React.Fragment>
                            ))}
              </>
            )}
          </tbody>
        </table>
                    </div>

        {/* Empty State */}
        {!isLoading && filteredKPIs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No KPIs found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm || filterCategory !== 'all' || filterType !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by creating your first KPI.'}
            </p>
            {!searchTerm && filterCategory === 'all' && filterType === 'all' && (
              <button
                onClick={handleAddKPI}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <HiPlus className="w-4 h-4 mr-2" />
                Add KPI
              </button>
            )}
          </div>
        )}

      {/* Comprehensive Add/Edit KPI Modal */}
      {(isAddingKPI || editingKPI) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isAddingKPI ? 'Add New KPI' : 'Edit KPI'}
              </h3>
              <p className="text-sm text-gray-600">
                {isAddingKPI 
                  ? 'Create a new Key Performance Indicator with all required details' 
                  : 'Update the existing KPI details'}
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Type of KPI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of KPI <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.typeOfKPI}
                  onChange={(e) => setFormData({...formData, typeOfKPI: e.target.value as 'Effectiveness KPI' | 'Efficiency KPI' | 'Productivity KPI' | 'Quality KPI' | 'Timeliness KPI' | 'Financial KPI'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Effectiveness KPI">Effectiveness KPI</option>
                  <option value="Efficiency KPI">Efficiency KPI</option>
                  <option value="Productivity KPI">Productivity KPI</option>
                  <option value="Quality KPI">Quality KPI</option>
                  <option value="Timeliness KPI">Timeliness KPI</option>
                  <option value="Financial KPI">Financial KPI</option>
                </select>
              </div>

              {/* KPI Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KPI Direction <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.kpiDirection}
                  onChange={(e) => setFormData({...formData, kpiDirection: e.target.value as 'up' | 'down' | 'neutral'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="up">Up ↗️</option>
                  <option value="down">Down ↘️</option>
                  <option value="neutral">Neutral →</option>
                </select>
              </div>

              {/* KPI Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KPI Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.kpi}
                  onChange={(e) => setFormData({...formData, kpi: e.target.value})}
                  placeholder="Enter KPI name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Formula */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formula
                </label>
                <input
                  type="text"
                  value={formData.formula}
                  onChange={(e) => setFormData({...formData, formula: e.target.value})}
                  placeholder="Enter KPI formula"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Target Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({...formData, targetValue: e.target.value})}
                  placeholder="e.g., <5, 10%, As Is"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value as 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Real-time'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Real-time">Real-time</option>
                </select>
              </div>

              {/* Receiver */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receiver <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.receiver}
                  onChange={(e) => setFormData({...formData, receiver: e.target.value})}
                  placeholder="e.g., Capacity Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  placeholder="e.g., ITSM Tool, Expenses Report"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active Status
                </label>
                <select
                  value={formData.active?.toString() || 'false'}
                  onChange={(e) => setFormData({...formData, active: e.target.value === 'true'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode
                </label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({...formData, mode: e.target.value as 'Manual' | 'Automatic' | 'Semi-Automatic'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                  <option value="Semi-Automatic">Semi-Automatic</option>
                </select>
              </div>

              {/* Tag */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tag <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({...formData, tag: e.target.value})}
                  placeholder="e.g., Capacity, Cost"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="IT Operations">IT Operations</option>
                  <option value="Financial">Financial</option>
                  <option value="Customer Service">Customer Service</option>
                  <option value="Operations">Operations</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Research & Development">Research & Development</option>
                </select>
              </div>
            </div>

            {/* Associated BPMN Processes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Associated BPMN Processes
                  </label>
                  <button
                    type="button"
                    onClick={fetchBPMNProcesses}
                    disabled={isLoadingBPMNProcesses}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <HiRefresh className={`w-3 h-3 mr-1 ${isLoadingBPMNProcesses ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="space-y-2">
                  {isLoadingBPMNProcesses ? (
                    <div className="text-sm text-gray-500">Loading BPMN processes...</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                      {bpmnProcesses.length > 0 ? (
                        bpmnProcesses.map((process) => (
                          <label key={process.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.associatedBPMNProcesses?.includes(process.id) || false}
                              onChange={(e) => {
                                const currentProcesses = formData.associatedBPMNProcesses || [];
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    associatedBPMNProcesses: [...currentProcesses, process.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    associatedBPMNProcesses: currentProcesses.filter(id => id !== process.id)
                                  });
                                }
                              }}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{process.title}</div>
                              <div className="text-xs text-gray-500">
                                Owner: {process.owner} • Created: {process.createdAt.toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
                                  <rect x="7" y="9" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                BPMN
                              </span>
                            </div>
                          </label>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-sm text-gray-500">No BPMN processes available</div>
                        </div>
                      )}
                    </div>
                  )}
                  {formData.associatedBPMNProcesses && formData.associatedBPMNProcesses.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-600 mb-1">Selected processes:</div>
                      <div className="flex flex-wrap gap-1">
                        {formData.associatedBPMNProcesses.map((processId) => {
                          const process = bpmnProcesses.find(p => p.id === processId);
                          return process ? (
                            <span key={processId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                              {process.title}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    associatedBPMNProcesses: formData.associatedBPMNProcesses?.filter(id => id !== processId) || []
                                  });
                                }}
                                className="ml-1 text-purple-500 hover:text-purple-700"
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleFormCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFormSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {isAddingKPI ? 'Create KPI' : 'Update KPI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BPMN Processes Modal */}
      {showBPMNProcessesModal && selectedKPIForBPMN && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-gray-900">
                  Associated BPMN Processes
                </h3>
                <button
                  onClick={fetchBPMNProcesses}
                  disabled={isLoadingBPMNProcesses}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiRefresh className={`w-4 h-4 mr-1 ${isLoadingBPMNProcesses ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <p className="text-sm text-gray-600">
                BPMN processes associated with &quot;{selectedKPIForBPMN.kpi}&quot;
              </p>
            </div>

            <div className="space-y-4">
              {isLoadingBPMNProcesses ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading BPMN processes...</div>
                </div>
              ) : (
                <>
                  {selectedKPIForBPMN.associatedBPMNProcesses && selectedKPIForBPMN.associatedBPMNProcesses.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-gray-800">
                        Associated Processes ({selectedKPIForBPMN.associatedBPMNProcesses.length})
                      </h4>
                      {bpmnProcesses
                        .filter(process => selectedKPIForBPMN.associatedBPMNProcesses?.includes(process.id))
                        .map((process) => (
                          <div key={process.id} className="bg-purple-50 border-l-4 border-purple-400 px-4 py-3 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-purple-900">{process.title}</h5>
                                <div className="text-sm text-purple-700">
                                  <span className="font-medium">Owner:</span> {process.owner}
                                </div>
                                <div className="text-xs text-purple-600">
                                  <span className="font-medium">Created:</span> {process.createdAt.toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
                                    <rect x="7" y="9" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                                  </svg>
                                  BPMN Process
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
                          <rect x="7" y="9" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">No BPMN Processes Associated</h4>
                      <p className="text-gray-500 text-sm">This KPI is not currently associated with any BPMN processes.</p>
                    </div>
                  )}

                  {bpmnProcesses.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">All Available BPMN Processes</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                        {bpmnProcesses.map((process) => (
                          <div key={process.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-sm text-gray-900">{process.title}</div>
                              <div className="text-xs text-gray-500">
                                Owner: {process.owner} • Created: {process.createdAt.toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {selectedKPIForBPMN.associatedBPMNProcesses?.includes(process.id) ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Associated
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                  Not Associated
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={closeBPMNProcessesModal}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIDashboard;
