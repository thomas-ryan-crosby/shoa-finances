import pandas as pd
import json
from datetime import datetime
import os

def parse_detailed_file(filepath, year):
    """Parse detailed expense report Excel file
    
    Structure:
    - Column A (Unnamed: 0): Top level category (e.g., "Generator", "Operating Expenses")
    - Column B (Unnamed: 1): Second level category
    - Column C (Unnamed: 2): P&L line item category (e.g., "Legal Fees", "Guard Service")
    - Column D (Unnamed: 3): Further subcategory (if any)
    
    Transactions follow the category header until a "Total" row is encountered.
    """
    df = pd.read_excel(filepath, sheet_name='Sheet1')
    
    transactions = []
    current_pnl_category = None  # This is the P&L line item from Column C
    
    for idx, row in df.iterrows():
        # Check Column C (Unnamed: 2) for P&L category headers
        col_c = row.get('Unnamed: 2')
        if pd.notna(col_c):
            col_c_str = str(col_c).strip()
            # If it's a "Total" row, stop using this category
            if 'Total' in col_c_str:
                # Check if this is the end of the current category
                if current_pnl_category and col_c_str.lower().replace('total', '').strip() == current_pnl_category.lower():
                    current_pnl_category = None
                continue
            # Otherwise, set it as the current category
            elif col_c_str and col_c_str != 'nan':
                current_pnl_category = col_c_str
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
                
                # Use the current P&L category from Column C
                category = current_pnl_category if current_pnl_category else 'Uncategorized'
                
                transactions.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'year': year,
                    'month': date.month,
                    'amount': amount,
                    'vendor': vendor if vendor and vendor != 'nan' else 'Unknown',
                    'memo': memo if memo and memo != 'nan' else '',
                    'type': trans_type if trans_type and trans_type != 'nan' else '',
                    'category': category
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

