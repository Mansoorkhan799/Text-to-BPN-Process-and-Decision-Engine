import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// Ensure this route is always dynamic and never statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper function to check if ID is a temporary ID
function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-');
}

// Helper function to check if ID is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  try {
    new ObjectId(id);
    return id.length === 24;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(params.id)) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    
    const record = await db.collection('records').findOne({
      _id: new ObjectId(params.id)
    });
    
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error fetching record:', error);
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(params.id)) {
      return NextResponse.json({ 
        error: 'Cannot update unsaved record. Please wait for record to be saved.' 
      }, { status: 400 });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    const { db } = await connectToDatabase();
    
    const result = await db.collection('records').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          ...body,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(params.id)) {
      return NextResponse.json({ 
        success: true,
        message: 'Temporary record not saved, no deletion needed'
      });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    
    const result = await db.collection('records').deleteOne({
      _id: new ObjectId(params.id)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
