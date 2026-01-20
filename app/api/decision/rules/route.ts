import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DecisionRule from '@/models/DecisionRule';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/app/utils/jwt';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch all decision rules for the current user
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      console.log('[Decision Rules] No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    console.log('[Decision Rules] Token verified, user email:', user?.email);
    console.log('[Decision Rules] Full user object:', JSON.stringify(user, null, 2));
    
    if (!user || !user.email) {
      console.log('[Decision Rules] Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Check all rules in the database
    const allRules = await DecisionRule.find({}).lean();
    console.log('[Decision Rules] Total rules in DB:', allRules.length);
    console.log('[Decision Rules] All createdBy values:', allRules.map(r => r.createdBy));
    console.log('[Decision Rules] Searching for createdBy:', user.email);
    
    const rules = await DecisionRule.find({ createdBy: user.email })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log('[Decision Rules] Rules found:', rules.length);
    if (rules.length > 0) {
      console.log('[Decision Rules] First rule:', JSON.stringify(rules[0], null, 2));
    }
    
    return NextResponse.json({ rules }, { status: 200 });
  } catch (error) {
    console.error('Error fetching decision rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

// POST - Create a new decision rule
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const body = await req.json();
    
    // Generate IDs for conditions and actions if not provided
    const processedBody = {
      ...body,
      rules: body.rules.map((rule: any) => ({
        ...rule,
        conditions: rule.conditions.map((cond: any) => ({
          ...cond,
          id: cond.id || uuidv4()
        })),
        actions: rule.actions.map((action: any) => ({
          ...action,
          id: action.id || uuidv4()
        }))
      }))
    };
    
    const newRule = new DecisionRule({
      ...processedBody,
      createdBy: user.email,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedRule = await newRule.save();
    
    return NextResponse.json({ rule: savedRule }, { status: 201 });
  } catch (error) {
    console.error('Error creating decision rule:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}

// PUT - Update an existing decision rule
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const body = await req.json();
    const { _id, ...updateData } = body;
    
    // Check ownership
    const existingRule = await DecisionRule.findById(_id);
    if (!existingRule || existingRule.createdBy !== user.email) {
      return NextResponse.json({ error: 'Rule not found or access denied' }, { status: 403 });
    }
    
    // Increment version
    updateData.version = (existingRule.version || 1) + 1;
    updateData.updatedAt = new Date();
    
    const updatedRule = await DecisionRule.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );
    
    return NextResponse.json({ rule: updatedRule }, { status: 200 });
  } catch (error) {
    console.error('Error updating decision rule:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}

// DELETE - Delete a decision rule
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const _id = searchParams.get('id');
    
    if (!_id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }
    
    // Check ownership
    const existingRule = await DecisionRule.findById(_id);
    if (!existingRule || existingRule.createdBy !== user.email) {
      return NextResponse.json({ error: 'Rule not found or access denied' }, { status: 403 });
    }
    
    await DecisionRule.findByIdAndDelete(_id);
    
    return NextResponse.json({ message: 'Rule deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting decision rule:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}

