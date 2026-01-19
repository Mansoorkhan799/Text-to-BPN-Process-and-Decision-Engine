import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KPI from '@/models/KPI';

// Sample KPI data
const sampleKPIs = [
  {
    typeOfKPI: 'Effectiveness KPI',
    kpi: 'Number of Incidents Caused by Inadequate Capacity',
    formula: 'Number of Incidents Caused by Inadequate Capacity',
    kpiDirection: 'down',
    targetValue: '<5',
    frequency: 'Monthly',
    receiver: 'Capacity Manager',
    source: 'ITSM Tool',
    active: false,
    mode: 'Manual',
    tag: 'Capacity',
    category: 'IT Operations',
    parentId: null,
    level: 0,
    order: 1,
    associatedBPMNProcesses: ['bpmn-1', 'bpmn-2'],
    createdBy: 'system'
  },
  {
    typeOfKPI: 'Efficiency KPI',
    kpi: 'Response Time for Capacity Issues',
    formula: 'Average time to resolve capacity incidents',
    kpiDirection: 'down',
    targetValue: '<2 hours',
    frequency: 'Daily',
    receiver: 'Capacity Manager',
    source: 'ITSM Tool',
    active: true,
    mode: 'Automatic',
    tag: 'Capacity',
    category: 'IT Operations',
    parentId: null, // Will be updated after first KPI is created
    level: 1,
    order: 1.1,
    associatedBPMNProcesses: ['bpmn-1'],
    createdBy: 'system'
  },
  {
    typeOfKPI: 'Quality KPI',
    kpi: 'Capacity Planning Accuracy',
    formula: 'Planned vs Actual capacity usage',
    kpiDirection: 'up',
    targetValue: '>90%',
    frequency: 'Monthly',
    receiver: 'Capacity Manager',
    source: 'Capacity Planning Tool',
    active: true,
    mode: 'Semi-Automatic',
    tag: 'Capacity',
    category: 'IT Operations',
    parentId: null, // Will be updated after first KPI is created
    level: 1,
    order: 1.2,
    associatedBPMNProcesses: ['bpmn-2'],
    createdBy: 'system'
  },
  {
    typeOfKPI: 'Efficiency KPI',
    kpi: 'Total Expenses for Unplanned Capacity',
    formula: 'Total Expenses for Unplanned Capacity',
    kpiDirection: 'down',
    targetValue: 'As Is',
    frequency: 'Monthly',
    receiver: 'Capacity Manager',
    source: 'Expenses Report',
    active: false,
    mode: 'Manual',
    tag: 'Cost',
    category: 'Financial',
    parentId: null,
    level: 0,
    order: 2,
    associatedBPMNProcesses: [],
    createdBy: 'system'
  },
  {
    typeOfKPI: 'Financial KPI',
    kpi: 'Cost per Capacity Unit',
    formula: 'Total cost / Total capacity units',
    kpiDirection: 'down',
    targetValue: '<$100/unit',
    frequency: 'Monthly',
    receiver: 'Financial Manager',
    source: 'Financial System',
    active: true,
    mode: 'Automatic',
    tag: 'Cost',
    category: 'Financial',
    parentId: null, // Will be updated after fourth KPI is created
    level: 1,
    order: 2.1,
    associatedBPMNProcesses: ['bpmn-3'],
    createdBy: 'system'
  }
];

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Clear existing KPIs
    await KPI.deleteMany({});
    console.log('Cleared existing KPIs');

    // Create KPIs
    const createdKPIs = [];
    for (const kpiData of sampleKPIs) {
      const kpi = new KPI(kpiData);
      const savedKPI = await kpi.save();
      createdKPIs.push(savedKPI);
      console.log(`Created KPI: ${savedKPI.kpi}`);
    }

    // Update parent IDs for hierarchical KPIs
    if (createdKPIs.length >= 5) {
      // Update KPI 1.1 (index 1) to have parent KPI 1 (index 0)
      await KPI.findByIdAndUpdate(createdKPIs[1]._id, { parentId: createdKPIs[0]._id.toString() });
      
      // Update KPI 1.2 (index 2) to have parent KPI 1 (index 0)
      await KPI.findByIdAndUpdate(createdKPIs[2]._id, { parentId: createdKPIs[0]._id.toString() });
      
      // Update KPI 2.1 (index 4) to have parent KPI 2 (index 3)
      await KPI.findByIdAndUpdate(createdKPIs[4]._id, { parentId: createdKPIs[3]._id.toString() });
      
      console.log('Updated parent IDs for hierarchical KPIs');
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${createdKPIs.length} KPIs`,
      count: createdKPIs.length
    });
  } catch (error) {
    console.error('Error seeding KPIs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed KPIs' },
      { status: 500 }
    );
  }
}
