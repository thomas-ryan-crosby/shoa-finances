import pandas as pd
import json
from datetime import datetime
import os

def parse_detailed_file(filepath, year):
    """Parse detailed expense report Excel file"""
    df = pd.read_excel(filepath, sheet_name='Sheet1')
    
    transactions = []
    current_category = None
    current_subcategory = None
    
    for idx, row in df.iterrows():
        # Check for category headers
        if pd.notna(row['Unnamed: 1']) and 'Operating Expenses' in str(row['Unnamed: 1']):
            current_category = 'Operating Expenses'
            continue
        elif pd.notna(row['Unnamed: 1']) and 'Total' not in str(row['Unnamed: 1']):
            current_category = str(row['Unnamed: 1']).strip()
            continue
        
        # Check for subcategory
        if pd.notna(row['Unnamed: 2']) and 'Total' not in str(row['Unnamed: 2']):
            subcat = str(row['Unnamed: 2']).strip()
            if subcat and subcat != 'nan':
                current_subcategory = subcat
            continue
        
        # Extract transaction data
        if pd.notna(row.get('Date')) and pd.notna(row.get('Paid Amount')):
            try:
                date = pd.to_datetime(row['Date'])
                if pd.isna(date):
                    continue
                    
                amount = float(row['Paid Amount'])
                if amount == 0:
                    continue
                
                vendor = str(row.get('Name', '')).strip() if pd.notna(row.get('Name')) else 'Unknown'
                memo = str(row.get('Memo', '')).strip() if pd.notna(row.get('Memo')) else ''
                trans_type = str(row.get('Type', '')).strip() if pd.notna(row.get('Type')) else ''
                split = str(row.get('Split', '')).strip() if pd.notna(row.get('Split')) else ''
                
                # Use split as category if available, otherwise use subcategory
                category = split if split and split != 'nan' else current_subcategory
                if not category or category == 'nan':
                    category = current_category or 'Uncategorized'
                
                transactions.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'year': year,
                    'month': date.month,
                    'amount': amount,
                    'vendor': vendor if vendor and vendor != 'nan' else 'Unknown',
                    'memo': memo if memo and memo != 'nan' else '',
                    'type': trans_type if trans_type and trans_type != 'nan' else '',
                    'category': category if category and category != 'nan' else 'Uncategorized'
                })
            except (ValueError, TypeError) as e:
                continue
    
    return transactions

def parse_pnl_file(filepath, year):
    """Parse P&L Excel file"""
    df = pd.read_excel(filepath, sheet_name='Sheet1')
    
    income = {}
    expenses = {}
    current_section = None
    
    # Find the year column (format: "Jan - Dec YY" or contains the year)
    year_col = None
    year_short = str(year)[-2:]  # Last 2 digits
    for col in df.columns:
        col_str = str(col)
        if str(year) in col_str or year_short in col_str or 'Jan - Dec' in col_str:
            year_col = col
            break
    
    if year_col is None:
        return income, expenses
    
    for idx, row in df.iterrows():
        # Check for section headers FIRST (in Unnamed: 1)
        col1 = row.get('Unnamed: 1')
        if pd.notna(col1):
            section = str(col1).strip()
            if 'Income' in section and 'Total' not in section:
                current_section = 'income'
            elif 'Expense' in section and 'Total' not in section:
                current_section = 'expense'
        
        # Also check Unnamed: 0 for "Net Income"
        col0 = row.get('Unnamed: 0')
        if pd.notna(col0):
            section = str(col0).strip()
            if 'Net Income' in section:
                break
        
        # Get amount from year column
        amount_val = row.get(year_col)
        if pd.notna(amount_val):
            try:
                amount = float(amount_val)
                if amount == 0:
                    continue
                
                col2 = row.get('Unnamed: 2')
                col3 = row.get('Unnamed: 3')
                
                # Income items: have value in Unnamed: 2, no value in Unnamed: 3
                if current_section == 'income' and pd.notna(col2) and pd.isna(col3):
                    cat = str(col2).strip()
                    if cat and cat != 'nan' and 'Total' not in cat:
                        income[cat] = amount
                
                # Expense subcategories: have value in Unnamed: 3
                if current_section == 'expense' and pd.notna(col3):
                    subcat = str(col3).strip()
                    if subcat and subcat != 'nan' and 'Total' not in subcat:
                        expenses[subcat] = amount
                
                # Standalone expense categories (like "Clubhouse upgrades", "Generator")
                # These appear in Unnamed: 2 when Unnamed: 3 is empty, but only for top-level categories
                if current_section == 'expense' and pd.notna(col2) and pd.isna(col3):
                    cat = str(col2).strip()
                    # Check if it's not a category header (those usually have no amount or are totals)
                    if cat and cat != 'nan' and 'Total' not in cat and 'Operating' not in cat and 'Maintenance' not in cat and 'Expenses' not in cat:
                        expenses[cat] = amount
                        
            except (ValueError, TypeError) as e:
                continue
    
    return income, expenses

def process_all_files():
    """Process all Excel files and generate JSON data"""
    
    all_transactions = []
    all_pnl_data = {}
    
    # Process detailed files
    for year in [2023, 2024, 2025]:
        detailed_file = f'Report_from_Sanctuary_Home_Owners_Association,_Inc..xlsxDetailed_{year}.xlsx'
        if os.path.exists(detailed_file):
            print(f"Processing detailed file for {year}...")
            transactions = parse_detailed_file(detailed_file, year)
            all_transactions.extend(transactions)
            print(f"  Found {len(transactions)} transactions")
    
    # Process P&L files
    for year in [2023, 2024, 2025]:
        pnl_file = f'Report_from_Sanctuary_Home_Owners_Association,_Inc..xlsxPNL{year}.xlsx'
        if os.path.exists(pnl_file):
            print(f"Processing P&L file for {year}...")
            income, expenses = parse_pnl_file(pnl_file, year)
            all_pnl_data[year] = {
                'income': income,
                'expenses': expenses
            }
            print(f"  Found {len(income)} income items, {len(expenses)} expense items")
    
    # Generate summary statistics
    summary = {
        'transactions': all_transactions,
        'pnl_data': all_pnl_data,
        'years': [2023, 2024, 2025]
    }
    
    # Save to JSON
    with open('data.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nTotal transactions: {len(all_transactions)}")
    print("Data saved to data.json")
    
    return summary

if __name__ == '__main__':
    process_all_files()

