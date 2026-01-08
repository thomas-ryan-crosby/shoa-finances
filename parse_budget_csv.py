import pandas as pd
import json
import re

def parse_budget_csv(filepath):
    """Parse the 2026 budget CSV file"""
    df = pd.read_csv(filepath, header=None)
    
    budget = {
        'income': {},
        'expenses': {
            'Operating Expenses': {},
            'Amenities Maintenance': {},
            'Clubhouse Maintenance': {},
            'Common Area Maintenance': {},
            'Grounds & Landscape Maintenance': {},
            'Security': {},
            'Streets & Drainage': {},
            'Taxes': {},
            'Utilities': {},
            'Special Projects': {}
        }
    }
    
    current_section = None
    current_category = None
    
    for idx, row in df.iterrows():
        # Check for Income section
        if pd.notna(row.iloc[1]) and 'Income' in str(row.iloc[1]) and 'Total' not in str(row.iloc[1]):
            current_section = 'income'
            continue
        
        # Check for Expense section
        if pd.notna(row.iloc[1]) and 'Expense' in str(row.iloc[1]) and 'Total' not in str(row.iloc[1]):
            current_section = 'expense'
            continue
        
        # Get 2026 Expectations column (column index 10)
        if len(row) > 10:
            budget_value = row.iloc[10]
            
            # Try to extract dollar amount
            if pd.notna(budget_value):
                budget_str = str(budget_value).strip()
                # Remove $ and commas, handle negative
                budget_str = budget_str.replace('$', '').replace(',', '').replace(' ', '').replace('-', '')
                if budget_str and budget_str != 'nan' and budget_str != '-':
                    try:
                        amount = float(budget_str)
                        
                        # Check if it's an income item
                        if current_section == 'income' and pd.notna(row.iloc[2]):
                            item_name = str(row.iloc[2]).strip()
                            if item_name and item_name != 'nan' and 'Total' not in item_name:
                                budget['income'][item_name] = amount
                        
                        # Check if it's an expense item
                        elif current_section == 'expense' and pd.notna(row.iloc[3]):
                            item_name = str(row.iloc[3]).strip()
                            if item_name and item_name != 'nan' and 'Total' not in item_name:
                                # Determine category from row.iloc[2]
                                cat_name = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
                                
                                # Map to category
                                if 'Operating' in cat_name or not cat_name or cat_name == 'nan':
                                    if any(x in item_name for x in ['Guard Service', 'Insurance', 'Legal', 'Management', 'Social', 'Accounting', 'Bank', 'Decorations', 'Lifeguards', 'Office', 'Police', 'Website']):
                                        current_category = 'Operating Expenses'
                                    else:
                                        current_category = 'Operating Expenses'
                                elif 'Amenities' in cat_name or any(x in item_name for x in ['Crystal Lake', 'Nature Trail']):
                                    current_category = 'Amenities Maintenance'
                                elif 'Clubhouse' in cat_name or any(x in item_name for x in ['Pool', 'Tennis', 'Exercise', 'Furniture', 'Janitorial', 'Ballfield', 'Playground', 'Repairs & Maintenance', 'Party Cleaning', 'Parking']):
                                    current_category = 'Clubhouse Maintenance'
                                elif 'Common Area' in cat_name or any(x in item_name for x in ['Fence', 'Fountain', 'Lighting', 'Sign', 'Wildlife', 'Mailbox']):
                                    current_category = 'Common Area Maintenance'
                                elif 'Grounds' in cat_name or 'Landscape' in cat_name or any(x in item_name for x in ['Grass Cutting', 'Landscape Upgrades', 'Tree Removal', 'Storm Cleanup', 'Powerline', 'Undeveloped Lot']):
                                    current_category = 'Grounds & Landscape Maintenance'
                                elif 'Security' in cat_name or any(x in item_name for x in ['Guard House', 'Camera', 'Entry Cards', 'Gate Maintenance', 'Guardhouse', 'Parade Security', 'Security Software']):
                                    current_category = 'Security'
                                elif 'Streets' in cat_name or 'Drainage' in cat_name or any(x in item_name for x in ['Street Maintenance', 'Drainage Repairs', 'Brick Headwalls']):
                                    current_category = 'Streets & Drainage'
                                elif 'Tax' in cat_name or 'Property' in item_name:
                                    current_category = 'Taxes'
                                elif 'Utilities' in cat_name or any(x in item_name for x in ['Electric', 'Water', 'Gas', 'Telephone', 'Charter Communications']):
                                    current_category = 'Utilities'
                                elif 'Special Projects' in cat_name or 'Traffic Study' in item_name:
                                    current_category = 'Special Projects'
                                else:
                                    current_category = 'Operating Expenses'
                                
                                if current_category in budget['expenses']:
                                    budget['expenses'][current_category][item_name] = amount
                    except (ValueError, TypeError):
                        continue
    
    return budget

# Parse the CSV
try:
    budget_2026 = parse_budget_csv(r'c:\Users\thoma\Downloads\SHOA_PNL_12_30_2025_reviewed.csv')
    
    # Save to JSON
    with open('budget-2026-data.json', 'w') as f:
        json.dump(budget_2026, f, indent=2)
    
    print("Budget data parsed and saved to budget-2026-data.json")
    print("\nIncome items:", len(budget_2026['income']))
    for cat, items in budget_2026['expenses'].items():
        print(f"{cat}: {len(items)} items")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
