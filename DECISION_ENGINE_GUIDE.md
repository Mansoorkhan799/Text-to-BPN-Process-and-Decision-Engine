# Decision Engine - Complete User Guide

## 📋 Table of Contents
1. [Creating Sample Data in Excel](#creating-sample-data-in-excel)
2. [Opening the Decision Engine](#opening-the-decision-engine)
3. [Importing Data](#importing-data)
4. [Creating Your First Rule](#creating-your-first-rule)
5. [Executing Rules](#executing-rules)
6. [Viewing Results](#viewing-results)
7. [Exporting Results](#exporting-results)
8. [Example Scenarios](#example-scenarios)

---

## 1. Creating Sample Data in Excel

### Step 1: Open Microsoft Excel (or Google Sheets)

### Step 2: Create a sample dataset (Copy this table)

Create a file called `loan_applications.xlsx` with these headers and data:

| name | age | credit_score | income | loan_amount | employment_status | existing_loans | status |
|------|-----|--------------|--------|-------------|-------------------|---------------|--------|
| John Smith | 28 | 720 | 50000 | 100000 | Employed | 1 | Pending |
| Sarah Johnson | 32 | 680 | 75000 | 150000 | Employed | 0 | Pending |
| Michael Brown | 24 | 650 | 35000 | 80000 | Self-Employed | 2 | Pending |
| Emily Davis | 29 | 750 | 60000 | 120000 | Employed | 1 | Pending |
| David Wilson | 35 | 800 | 90000 | 200000 | Employed | 0 | Pending |
| Lisa Anderson | 22 | 580 | 30000 | 50000 | Student | 1 | Pending |
| Robert Martinez | 40 | 850 | 110000 | 250000 | Employed | 0 | Pending |
| Jennifer Lee | 27 | 720 | 55000 | 100000 | Employed | 3 | Pending |
| William Taylor | 31 | 600 | 45000 | 90000 | Employed | 2 | Pending |
| Amanda White | 26 | 760 | 70000 | 130000 | Employed | 1 | Pending |

### Step 3: Save the file
- Save as `loan_applications.xlsx` in an easy-to-find location

---

## 2. Opening the Decision Engine

### Step 1: Start your application
```bash
npm run dev
```

### Step 2: Login to your account
- Open http://localhost:3000
- Sign in with your credentials

### Step 3: Navigate to Decision Engine
- Look at the left sidebar menu
- Click on **"Decision Engine"** (it has a green gradient and cube icon)
- It appears right after "AI Process Generator"

---

## 3. Importing Data

### Step 1: Click the Import button
- In the Decision Engine header, click the **"Import"** button (gray button with upload icon)

### Step 2: Select your Excel file
- Navigate to your saved `loan_applications.xlsx` file
- Click **Open**

### Step 3: Verify data loaded
- You should see a success message: "Imported X rows successfully"
- Your data grid will now display all 10 rows with columns: name, age, credit_score, income, loan_amount, employment_status, existing_loans, status

---

## 4. Creating Your First Rule

### Example: Auto-Approval Rule for Good Credit Applicants

#### Step 1: Click "New Rule" button
- Click the green **"New Rule"** button in the header

#### Step 2: Enter Rule Information
- **Rule Name:** `Auto-Approve High Credit Score`
- **Description:** `Automatically approve loans for applicants with credit score above 750`

#### Step 3: Configure Conditions
- In the Conditions section, you'll see a row with dropdowns
- Click the first dropdown (Select Field), choose: `credit_score`
- Click the operator dropdown, choose: `>` (greater than)
- In the value field, type: `750`
- To add another condition, click the **"+"** button (next to AND/OR dropdown)
  - Select Field: `employment_status`
  - Operator: `==`
  - Value: `Employed`
- You can switch between AND/OR logic at the top

#### Step 4: Configure Actions
- In the Actions section
- Click the action type dropdown, choose: `Assign`
- In the action value field, type: `Approved`

#### Step 5: Set Priority
- Drag the Priority slider to: `70`
- (Higher priority = rules checked first)

#### Step 6: Save the Rule
- Click **"Save Rule"** button (green button at bottom)

---

## 5. Creating Additional Rules

### Example 2: Rejection Rule for Poor Credit

Create another rule for rejecting applications with low credit scores:

#### Step 1: Click "New Rule" again

#### Step 2: Enter Rule Information
- **Rule Name:** `Reject Low Credit Score`
- **Description:** `Reject applications with credit score below 600`

#### Step 3: Configure Conditions
- Select Field: `credit_score`
- Operator: `<`
- Value: `600`

#### Step 4: Configure Actions
- Action Type: `Reject`
- Action Value: `Application Rejected - Low Credit Score`

#### Step 5: Set Priority
- Priority: `90` (Higher than auto-approve, so it checks rejections first)

#### Step 6: Save the Rule

---

### Example 3: Conditional Approval (Medium Credit)

Create a third rule for applicants with medium credit:

#### Step 1: Click "New Rule"

#### Step 2: Enter Rule Information
- **Rule Name:** `Conditional Approval - Medium Credit`
- **Description:** `Approve loans for applicants with credit 600-750, employed, and income > 40000`

#### Step 3: Configure Conditions (Add 3 conditions with AND logic)
- Condition 1:
  - Field: `credit_score`
  - Operator: `>=`
  - Value: `600`
- Click **"+"** button to add condition 2:
  - Field: `credit_score`
  - Operator: `<=`
  - Value: `750`
- Click **"+"** button to add condition 3:
  - Field: `employment_status`
  - Operator: `==`
  - Value: `Employed`
- Click **"+"** button to add condition 4:
  - Field: `income`
  - Operator: `>`
  - Value: `40000`

#### Step 4: Configure Actions
- Action Type: `Assign`
- Action Value: `Conditionally Approved`

#### Step 5: Set Priority
- Priority: `50`

#### Step 6: Save the Rule

---

## 6. Executing Rules

### Step 1: Click "Execute Rules"
- Click the green **"Execute Rules"** button (play icon with "Execute Rules" text)
- The button will show a spinning icon while processing

### Step 2: Wait for execution
- A success message will appear: "Rules executed successfully"
- Processing time depends on data size

---

## 7. Viewing Results

### Step 1: Check the Results column
- A new **"Results"** column appears in your data grid
- Each row shows the final action (e.g., "Approved", "Application Rejected")

### Step 2: Open the Results Panel (Right Side)
- The results panel opens automatically on the right
- For each row, you can see:
  - Match status (Matched/No Match)
  - Which rules matched
  - Priority of matched rules
  - Final action determined

### Step 3: Analyze the results
- Look at Row 1 (John Smith): Should show "Approved" or "Conditionally Approved"
- Look at Row 3 (Michael Brown): Should show "Application Rejected - Low Credit Score"
- Look at Row 6 (Lisa Anderson): Should show "Application Rejected - Low Credit Score"

---

## 8. Exporting Results

### Step 1: Click "Export" button
- Click the **"Export"** button in the header
- Your browser will download a file

### Step 2: Open the exported file
- The file is named: `decision-results.xlsx`
- Open it in Excel to see:
  - All original columns
  - Plus: `_matchedRules` column (shows which rules matched)
  - Plus: `_finalAction` column (shows the decision)

---

## 📊 Expected Results Based on Sample Data

Based on the rules we created, here's what should happen:

| Name | Age | Credit Score | Expected Result | Reason |
|------|-----|--------------|----------------|--------|
| John Smith | 28 | 720 | Conditionally Approved | Credit 720, Employed |
| Sarah Johnson | 32 | 680 | Conditionally Approved | Credit 680, Employed |
| Michael Brown | 24 | 650 | Conditionally Approved | Credit 650, Self-Employed (but passes) |
| Emily Davis | 29 | 750 | Auto-Approved | Credit exactly 750 |
| David Wilson | 35 | 800 | Auto-Approved | Credit > 750, Employed |
| Lisa Anderson | 22 | 580 | Rejected | Credit < 600 |
| Robert Martinez | 40 | 850 | Auto-Approved | Credit > 750, Employed |
| Jennifer Lee | 27 | 720 | Conditionally Approved | Credit 720, Employed |
| William Taylor | 31 | 600 | Conditionally Approved | Credit exactly 600 |
| Amanda White | 26 | 760 | Auto-Approved | Credit > 750, Employed |

---

## 💡 Tips & Best Practices

### Tips:
1. **Import data first** before creating rules - this gives you field names in the rule builder
2. **Start with simple rules** - test with one condition before adding complexity
3. **Priority matters** - Higher priority rules execute first
4. **Use descriptive names** - Makes it easier to understand results
5. **Test incrementally** - Create one rule, test it, then add more

### Best Practices:
1. **Rejection rules first** - Set high priority on rejection rules (90-100)
2. **Approval rules after** - Set medium priority on approval rules (50-80)
3. **Logical order** - Most specific rules should have higher priority
4. **Clear actions** - Use descriptive action values for audit trails

---

## 🎯 Real-World Use Cases

### Use Case 1: Loan Approval System
- Check credit score, income, employment
- Assign status: Approved/Rejected/Conditional

### Use Case 2: Customer Segmentation
- Check purchase history, loyalty points
- Assign tier: Gold/Silver/Bronze

### Use Case 3: Quality Control
- Check product specifications
- Assign status: Pass/Fail/Needs Review

### Use Case 4: Employee Performance
- Check KPIs, attendance, projects completed
- Assign rating: Excellent/Good/Fair/Poor

---

## 🐛 Troubleshooting

### Problem: Can't see "Decision Engine" in menu
**Solution:** Hard refresh browser (Ctrl+F5) or restart dev server

### Problem: Rules not showing after creation
**Solution:** Click the rules refresh or close/reopen the page

### Problem: Import fails
**Solution:** Make sure Excel file has headers in first row

### Problem: No results after execution
**Solution:** Check that you have active rules and data in the grid

---

## ✅ Quick Start Checklist

- [ ] Created sample Excel file with data
- [ ] Opened Decision Engine from side menu
- [ ] Imported Excel file successfully
- [ ] Created "Auto-Approve High Credit Score" rule
- [ ] Created "Reject Low Credit Score" rule
- [ ] Created "Conditional Approval" rule
- [ ] Executed rules
- [ ] Viewed results in right panel
- [ ] Exported results to Excel

---

## 📚 Need More Examples?

Want more sample datasets? Here are ideas:

1. **Customer Service Tickets** - Priority, category, assign agents
2. **Inventory Management** - Stock levels, reorder points, supplier selection
3. **Hiring Process** - Experience, education, skills, rejection/approval
4. **Marketing Campaigns** - Age, interests, location, segment assignment

---

**Happy decision-making! 🚀**

