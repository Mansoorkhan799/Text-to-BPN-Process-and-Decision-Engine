import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BpmnFile from '@/models/BpmnFile';
import LatexFile from '@/models/LatexFile';
import LatexFileTree from '@/models/LatexFileTree';
import KPI from '@/models/KPI';
import Record from '@/models/Record';
import { verifyToken } from '@/app/utils/jwt';
import mongoose from 'mongoose';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper function to count files in a tree structure
function countFilesInTree(nodes: any[]): number {
  let count = 0;
  nodes.forEach(node => {
    if (node.type === 'file') {
      count++;
    }
    if (node.children && node.children.length > 0) {
      count += countFilesInTree(node.children);
    }
  });
  return count;
}

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = request.cookies.get('token')?.value;
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

    // Get user information
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

    // Get counts for different resources
    // BPMN files count from BPMN nodes tree (fallback to direct count)
    let bpmnCount = 0;
    try {
      const responseBpmn = await fetch(`${request.nextUrl.origin}/api/bpmn-nodes?userId=${user._id.toString()}`);
      if (responseBpmn.ok) {
        const data = await responseBpmn.json();
        if (data.tree) {
          bpmnCount = countFilesInTree(data.tree);
        }
      }
    } catch (error) {
      console.error('Error counting BPMN files from tree:', error);
      // Fallback to direct count from collection
      bpmnCount = await BpmnFile.countDocuments({ userId: user._id.toString() });
    }
    
    // LaTeX files count from the nodes API (same as LatexFilesList)
    let latexCount = 0;
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/latex-nodes?userId=${user._id.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.tree) {
          latexCount = countFilesInTree(data.tree);
        }
      }
    } catch (error) {
      console.error('Error counting LaTeX files from tree:', error);
      // Fallback to direct count
      latexCount = await LatexFile.countDocuments({ userId: user._id.toString() });
    }

    const userId = user._id.toString();

    // Get recent activity count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [kpiCount, recentActivityCount] = await Promise.all([
      // KPI count - filter by user who created them
      KPI.countDocuments({ createdBy: userId }),
      // Recent activity count - filter by user
      Promise.all([
      BpmnFile.countDocuments({ 
          userId: userId,
        updatedAt: { $gte: sevenDaysAgo }
      }),
      LatexFile.countDocuments({ 
          userId: userId,
        updatedAt: { $gte: sevenDaysAgo }
      }),
      Record.countDocuments({ 
          owner: userId,
        createdAt: { $gte: sevenDaysAgo }
      })
      ]).then(counts => counts.reduce((sum, count) => sum + count, 0))
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        bpmnDiagrams: bpmnCount,
        latexDocuments: latexCount,
        kpiTracked: kpiCount,
        recentActivity: recentActivityCount
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
