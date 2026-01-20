import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import DecisionRule from '@/models/DecisionRule';

// POST - Execute decision rules against data
export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    const { data, ruleIds } = await req.json();
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }
    
    // Fetch rules
    let query: any = { status: 'active' };
    if (ruleIds && ruleIds.length > 0) {
      query._id = { $in: ruleIds };
    }
    
    const rules = await DecisionRule.find(query).lean();
    
    if (!rules || rules.length === 0) {
      return NextResponse.json({ error: 'No active rules found' }, { status: 404 });
    }
    
    // Execute rules on each data row
    const results = [];
    
    for (const item of data) {
      const itemResults = [];
      
      for (const rule of rules) {
        for (const ruleConfig of rule.rules) {
          let matchResult = evaluateConditions(item, ruleConfig);
          
          if (matchResult) {
            itemResults.push({
              ruleId: rule._id,
              ruleName: rule.name,
              ruleItemName: ruleConfig.name,
              conditions: ruleConfig.conditions,
              actions: ruleConfig.actions,
              priority: ruleConfig.priority,
              logicOperator: ruleConfig.logicOperator
            });
          }
        }
      }
      
      // Sort by priority (higher priority first)
      itemResults.sort((a, b) => b.priority - a.priority);
      
      // Determine final action from highest priority match
      const finalAction = itemResults.length > 0 
        ? itemResults[0].actions[0]?.value 
        : 'No match';
      
      results.push({
        data: item,
        matchedRules: itemResults,
        finalAction,
        success: itemResults.length > 0
      });
    }
    
    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Error executing decision rules:', error);
    return NextResponse.json({ error: 'Failed to execute rules' }, { status: 500 });
  }
}

function evaluateConditions(item: any, ruleConfig: any): boolean {
  const conditions = ruleConfig.conditions || [];
  const logicOperator = ruleConfig.logicOperator || 'AND';
  
  if (conditions.length === 0) return true;
  
  if (logicOperator === 'AND') {
    return conditions.every((condition: any) => evaluateCondition(item, condition));
  } else {
    return conditions.some((condition: any) => evaluateCondition(item, condition));
  }
}

function evaluateCondition(item: any, condition: any): boolean {
  const fieldValue = item[condition.field];
  const operator = condition.operator;
  const expectedValue = condition.value;
  
  try {
    switch (operator) {
      case '==':
        return fieldValue == expectedValue;
      case '!=':
        return fieldValue != expectedValue;
      case '>':
        return Number(fieldValue) > Number(expectedValue);
      case '<':
        return Number(fieldValue) < Number(expectedValue);
      case '>=':
        return Number(fieldValue) >= Number(expectedValue);
      case '<=':
        return Number(fieldValue) <= Number(expectedValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'startsWith':
        return String(fieldValue).toLowerCase().startsWith(String(expectedValue).toLowerCase());
      case 'endsWith':
        return String(fieldValue).toLowerCase().endsWith(String(expectedValue).toLowerCase());
      case 'in':
        const inArray = Array.isArray(expectedValue) ? expectedValue : [expectedValue];
        return inArray.some(v => fieldValue == v);
      case 'notIn':
        const notInArray = Array.isArray(expectedValue) ? expectedValue : [expectedValue];
        return !notInArray.some(v => fieldValue == v);
      default:
        return false;
    }
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

