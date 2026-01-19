import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import BpmnNode from '@/models/BpmnNode';

interface DecodedToken {
  role?: string;
  id?: string;
  email?: string;
}

function isAdmin(): boolean {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;
    return decoded?.role === 'admin';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // AuthZ: only admins can access
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // Tree format: return hierarchical structure across all users
    if (format === 'tree') {
      const nodes = await BpmnNode.find({}).sort({ createdAt: 1 }).lean();

      const idToNode: Record<string, any> = {};
      nodes.forEach((n: any) => {
        idToNode[n.id] = {
          id: n.id,
          name: n.name,
          type: n.type,
          parentId: n.parentId,
          userId: n.userId,
          archived: !!n.archived,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          children: [] as any[],
        };
      });

      // Build tree per user root
      const roots: any[] = [];
      nodes.forEach((n: any) => {
        const wrapped = idToNode[n.id];
        if (n.parentId && idToNode[n.parentId]) {
          idToNode[n.parentId].children.push(wrapped);
        } else {
          roots.push(wrapped);
        }
      });

      return NextResponse.json({ success: true, tree: roots });
    }

    // Flat with path: include computed folder path for each file
    const allNodes = await BpmnNode.find({}).select({ id: 1, name: 1, type: 1, parentId: 1 }).lean();
    const parentMap = new Map<string, string | null>();
    const nameMap = new Map<string, string>();
    allNodes.forEach((n: any) => {
      parentMap.set(n.id, n.parentId);
      nameMap.set(n.id, n.name);
    });

    const buildPath = (nodeId: string): string => {
      const parts: string[] = [];
      let cur: string | null | undefined = nodeId;
      while (cur) {
        const name = nameMap.get(cur);
        if (name) parts.unshift(name);
        cur = parentMap.get(cur) ?? null;
      }
      return parts.join('/');
    };

    const files = await BpmnNode.find({ type: 'file' })
      .select({
        id: 1,
        name: 1,
        userId: 1,
        ownerUserId: 1,
        archived: 1,
        'advancedDetails.createdBy': 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = files.map((f: any) => ({
      id: f.id,
      name: f.name,
      userId: f.userId || '',
      ownerUserId: f.ownerUserId || '',
      archived: !!f.archived,
      createdBy: f?.advancedDetails?.createdBy || '',
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      path: buildPath(f.id),
    }));

    return NextResponse.json({ success: true, files: data });
  } catch (error) {
    console.error('Error fetching admin BPMN files:', error);
    return NextResponse.json({ error: 'Failed to fetch BPMN files' }, { status: 500 });
  }
}


