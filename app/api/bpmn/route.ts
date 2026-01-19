import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import BpmnFile from '../../../models/BpmnFile';
import User from '../../../models/User';
import mongoose from 'mongoose';
import { verifyToken } from '../../../app/utils/jwt';

// Ensure this route is always dynamic and never statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Temporary mock data for testing when MongoDB is not available
const mockFiles = new Map<string, any>([
  ['test-file-1', {
    _id: 'test-file-1',
    userId: 'user123',
    name: 'Test Process',
    type: 'xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="Sample Process" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1" name="Actor">
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Activity_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="600" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true">
        <dc:Bounds x="150" y="60" width="570" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="200" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="200" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="300" y="100" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="450" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="450" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="236" y="138" />
        <di:waypoint x="300" y="138" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="400" y="138" />
        <di:waypoint x="450" y="138" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
    processMetadata: {
      processName: 'Sample Process',
      description: 'This is a test process for demonstration',
      processOwner: 'John Doe',
      processManager: 'Jane Smith'
    },
    advancedDetails: {
      versionNo: '1.0.0',
      processStatus: 'draft',
      classification: 'internal',
      dateOfCreation: new Date(),
      dateOfReview: null,
      effectiveDate: null,
      modificationDate: new Date(),
      modifiedBy: 'John Doe',
      changeDescription: 'Initial creation',
      createdBy: 'user123',
    },
    signOffData: {
      responsibility: 'Process Owner',
      date: '2024-01-15',
      name: 'John Doe',
      designation: 'Manager',
      signature: 'JD'
    },
    historyData: {
      versionNo: '1.0.0',
      date: '2024-01-15',
      statusRemarks: 'Initial draft',
      author: 'John Doe'
    },
    triggerData: {
      triggers: 'Manual trigger',
      inputs: 'User input',
      outputs: 'Process completion'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }],
  ['test-file-2', {
    _id: 'test-file-2',
    userId: 'user123',
    name: 'Another Process',
    type: 'xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="Another Sample Process" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1" name="Actor">
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Activity_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="600" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true">
        <dc:Bounds x="150" y="60" width="570" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="200" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="200" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="300" y="100" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="450" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="450" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="236" y="138" />
        <di:waypoint x="300" y="138" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="400" y="138" />
        <di:waypoint x="450" y="138" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
    processMetadata: {
      processName: 'Another Sample Process',
      description: 'This is another test process',
      processOwner: 'Alice Johnson',
      processManager: 'Bob Wilson'
    },
    advancedDetails: {
      versionNo: '1.0.0',
      processStatus: 'review',
      classification: 'public',
      dateOfCreation: new Date(),
      dateOfReview: null,
      effectiveDate: null,
      modificationDate: new Date(),
      modifiedBy: 'Alice Johnson',
      changeDescription: 'Initial creation',
      createdBy: 'user123',
    },
    signOffData: {
      responsibility: 'Process Manager',
      date: '2024-01-20',
      name: 'Alice Johnson',
      designation: 'Senior Manager',
      signature: 'AJ'
    },
    historyData: {
      versionNo: '1.0.0',
      date: '2024-01-20',
      statusRemarks: 'Under review',
      author: 'Alice Johnson'
    },
    triggerData: {
      triggers: 'System trigger',
      inputs: 'Data input',
      outputs: 'Process result'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }],
  ['test-file-3', {
    _id: 'test-file-3',
    userId: 'user123',
    name: 'Project in Folder',
    type: 'xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="Project in Folder" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1" name="Actor">
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Activity_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="600" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true">
        <dc:Bounds x="150" y="60" width="570" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="200" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="200" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="300" y="100" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="450" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="450" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="236" y="138" />
        <di:waypoint x="300" y="138" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="400" y="138" />
        <di:waypoint x="450" y="138" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
    processMetadata: {
      processName: 'Project in Folder',
      description: 'This is a project stored in a folder',
      processOwner: 'Charlie Brown',
      processManager: 'Diana Prince'
    },
    advancedDetails: {
      versionNo: '1.0.0',
      processStatus: 'approved',
      classification: 'confidential',
      dateOfCreation: new Date(),
      dateOfReview: new Date(),
      effectiveDate: new Date().toISOString().split('T')[0], // Date only
      modificationDate: new Date(),
      modifiedBy: 'Charlie Brown',
      changeDescription: 'Initial creation and approval',
      createdBy: 'user123',
    },
    signOffData: {
      responsibility: 'Project Owner',
      date: '2024-01-25',
      name: 'Charlie Brown',
      designation: 'Project Manager',
      signature: 'CB'
    },
    historyData: {
      versionNo: '1.0.0',
      date: '2024-01-25',
      statusRemarks: 'Approved',
      author: 'Charlie Brown'
    },
    triggerData: {
      triggers: 'Project trigger',
      inputs: 'Project requirements',
      outputs: 'Project deliverables'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }]
]);

export async function GET(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user information to get user ID
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const listAll = searchParams.get('listAll');
    
    // If listAll is requested, return only files for this user
    if (listAll === 'true') {
      try {
        const files = await BpmnFile.find({ userId });
        console.log(`Found ${files.length} files for user ${userId} in MongoDB Atlas`);
        return NextResponse.json({ 
          files: files.map(f => ({ 
            id: f.fileId || f._id, 
            name: f.name, 
            processMetadata: f.processMetadata || {
              processName: '',
              description: '',
              processOwner: '',
              processManager: '',
            },
            advancedDetails: f.advancedDetails || {
              versionNo: '1.0.0',
              processStatus: '',
              classification: '',
              dateOfCreation: new Date(),
              dateOfReview: null,
              effectiveDate: null,
              modificationDate: new Date(),
              modifiedBy: '',
              changeDescription: '',
              createdBy: f.userId,
            },
            signOffData: f.signOffData || {
              responsibility: '',
              date: '',
              name: '',
              designation: '',
              signature: '',
            },
            historyData: f.historyData || {
              versionNo: '',
              date: '',
              statusRemarks: '',
              author: '',
            },
            triggerData: f.triggerData || {
              triggers: '',
              inputs: '',
              outputs: '',
            }
          })) 
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
      }
    }
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    // Try to find by fileId first, then by _id (only if it's a valid ObjectId)
    let file = await BpmnFile.findOne({ fileId: fileId, userId });
      if (!file && mongoose.Types.ObjectId.isValid(fileId)) {
      file = await BpmnFile.findOne({ _id: fileId, userId });
      }
      
      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      
      console.log('Retrieved file from MongoDB Atlas:', file.fileId || file._id, file.name);
      return NextResponse.json(file);
  } catch (error) {
    console.error('Error in GET /api/bpmn:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user information to get user ID
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    const body = await req.json();
    const { name, type, content, fileId, processMetadata, advancedDetails, signOffData, historyData, triggerData } = body;
    
    console.log('POST request received:', { userId, name, type, fileId });
    
    if (!name || !type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get user information for createdBy field and creation date
    let createdByValue = userId; // Default to userId
    let creationDate = ''; // Will be set only if provided
    
    if (advancedDetails?.createdBy) {
      // Use the createdBy value from the request if provided
      createdByValue = advancedDetails.createdBy;
    } else {
      // Fetch user's name from database
      try {
        const userDoc = await User.findById(userId);
        if (userDoc) {
          createdByValue = userDoc.name || userDoc.email || userId;
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Fallback to userId if user fetch fails
      }
    }
    
    // Use the creation date from the request if provided
    if (advancedDetails?.dateOfCreation) {
      creationDate = advancedDetails.dateOfCreation;
    }
    
    // Create new file with generated fileId
    const newFileId = fileId || `file-${Date.now()}`;
    const file = await BpmnFile.create({ 
      fileId: newFileId,
      userId, 
      name, 
      type, 
      content,
      processMetadata: processMetadata || {
        processName: '',
        description: '',
        processOwner: '',
        processManager: '',
      },
                   advancedDetails: advancedDetails || {
               versionNo: '1.0.0',
               processStatus: '',
               classification: '',
               dateOfCreation: creationDate || '',
               dateOfReview: '',
               effectiveDate: '',
               modificationDate: '',
               modifiedBy: '',
               changeDescription: '',
               createdBy: createdByValue || '',
             },
      signOffData: signOffData || {
        responsibility: '',
        date: '',
        name: '',
        designation: '',
        signature: '',
      },
      historyData: historyData || {
        versionNo: '',
        date: '',
        statusRemarks: '',
        author: '',
      },
      triggerData: triggerData || {
        triggers: '',
        inputs: '',
        outputs: '',
      }
    });
    
    console.log('Created new file in MongoDB Atlas:', file.fileId);
    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in POST /api/bpmn:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user information to get user ID
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    const body = await req.json();
    const { fileId, processMetadata, advancedDetails, signOffData, historyData, triggerData } = body;
    
    console.log('PUT /api/bpmn received:', { fileId });
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    // Try to find by fileId first, then by _id (only if it's a valid ObjectId)
    let file = await BpmnFile.findOne({ fileId: fileId, userId });
      if (!file && mongoose.Types.ObjectId.isValid(fileId)) {
      file = await BpmnFile.findOne({ _id: fileId, userId });
      }
      
      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

    // Verify ownership
    if (file.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only update your own files.' },
        { status: 403 }
      );
    }
      
      // Update the file with new metadata
      const updateData: any = { updatedAt: new Date() };
      
      if (processMetadata) {
        updateData.processMetadata = processMetadata;
      }
      
      if (advancedDetails) {
        // Increment version number when advanced details are updated
        const currentVersion = file.advancedDetails?.versionNo || '1.0.0';
        const versionParts = currentVersion.split('.');
        const major = parseInt(versionParts[0]) || 1;
        const minor = parseInt(versionParts[1]) || 0;
        const patch = parseInt(versionParts[2]) || 0;
        
        updateData.advancedDetails = {
          ...advancedDetails,
          versionNo: `${major}.${minor}.${patch + 1}`,
          modificationDate: new Date(),
        };
      }
      
      // Update table data
      if (signOffData) {
        updateData.signOffData = signOffData;
      }
      
      if (historyData) {
        updateData.historyData = historyData;
      }
      
      if (triggerData) {
        updateData.triggerData = triggerData;
      }
      
      const updatedFile = await BpmnFile.findByIdAndUpdate(
        file._id,
        updateData,
        { new: true }
      );
      
      console.log('Updated file in MongoDB Atlas:', updatedFile.fileId);
      return NextResponse.json(updatedFile);
  } catch (error) {
    console.error('Error in PUT /api/bpmn:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user information to get user ID
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const user = await mongoDb.collection('users').findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    // Try to find by fileId first, then by _id
    let file = await BpmnFile.findOne({ fileId: fileId, userId });
    if (!file && mongoose.Types.ObjectId.isValid(fileId)) {
      file = await BpmnFile.findOne({ _id: fileId, userId });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify ownership
    if (file.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own files.' },
        { status: 403 }
      );
    }
    
    // Delete the file
    await BpmnFile.findByIdAndDelete(file._id);
    console.log('Deleted file from MongoDB Atlas:', file.fileId || file._id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/bpmn:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 