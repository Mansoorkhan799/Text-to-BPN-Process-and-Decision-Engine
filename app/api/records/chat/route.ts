import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Record from '@/models/Record';
import mongoose from 'mongoose';

// Helper function to check if ID is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
}

// Helper function to check if ID is a temporary ID
function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-');
}

// GET chat messages for a specific record
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    
    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(recordId)) {
      return NextResponse.json({ 
        success: true, 
        messages: [] 
      });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(recordId)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }
    
    const record = await Record.findById(recordId).select('chatMessages');
    
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      messages: record.chatMessages || [] 
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
  }
}

// POST new chat message to a record
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { recordId, message } = body;
    
    if (!recordId || !message) {
      return NextResponse.json({ error: 'Record ID and message are required' }, { status: 400 });
    }
    
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(recordId)) {
      return NextResponse.json({ 
        error: 'Cannot add message to unsaved record. Please wait for record to be saved.' 
      }, { status: 400 });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(recordId)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }
    
    const record = await Record.findById(recordId);
    
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    // Add the new message to the chatMessages array
    record.chatMessages.push(message);
    record.updatedAt = new Date();
    
    await record.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Chat message added successfully',
      updatedRecord: record
    });
  } catch (error) {
    console.error('Error adding chat message:', error);
    return NextResponse.json({ error: 'Failed to add chat message' }, { status: 500 });
  }
}

// PUT to update chat messages (replace entire array)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { recordId, messages } = body;
    
    if (!recordId || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Record ID and messages array are required' }, { status: 400 });
    }
    
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(recordId)) {
      return NextResponse.json({ 
        error: 'Cannot update messages for unsaved record. Please wait for record to be saved.' 
      }, { status: 400 });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(recordId)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }
    
    const record = await Record.findById(recordId);
    
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    // Replace the entire chatMessages array
    record.chatMessages = messages;
    record.updatedAt = new Date();
    
    await record.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Chat messages updated successfully',
      updatedRecord: record
    });
  } catch (error) {
    console.error('Error updating chat messages:', error);
    return NextResponse.json({ error: 'Failed to update chat messages' }, { status: 500 });
  }
}

// DELETE all chat messages for a record
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    
    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    
    // Handle temporary IDs (from optimistic updates)
    if (isTemporaryId(recordId)) {
      return NextResponse.json({ 
        success: true, 
        message: 'Chat messages deleted successfully' 
      });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(recordId)) {
      return NextResponse.json({ error: 'Invalid record ID format' }, { status: 400 });
    }
    
    const record = await Record.findById(recordId);
    
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    // Clear all chat messages
    record.chatMessages = [];
    record.updatedAt = new Date();
    
    await record.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Chat messages deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting chat messages:', error);
    return NextResponse.json({ error: 'Failed to delete chat messages' }, { status: 500 });
  }
}
