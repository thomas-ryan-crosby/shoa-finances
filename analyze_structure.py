import pandas as pd

file = 'Report_from_Sanctuary_Home_Owners_Association,_Inc..xlsxDetailed_2025.xlsx'
df = pd.read_excel(file, sheet_name='Sheet1')

print("Finding Legal Fees and following transactions...")
legal_idx = None
for idx, row in df.iterrows():
    if pd.notna(row.get('Unnamed: 2')) and 'Legal' in str(row.get('Unnamed: 2', '')):
        legal_idx = idx
        print(f"\nLegal Fees header at row {idx}:")
        print(f"  Col A: {row.get('Unnamed: 0')}")
        print(f"  Col B: {row.get('Unnamed: 1')}")
        print(f"  Col C: {row.get('Unnamed: 2')}")
        print(f"  Col D: {row.get('Unnamed: 3')}")
        break

if legal_idx is not None:
    print(f"\nTransactions under Legal Fees (rows {legal_idx+1} to {legal_idx+20}):")
    for idx in range(legal_idx + 1, min(legal_idx + 20, len(df))):
        row = df.iloc[idx]
        if pd.notna(row.get('Paid Amount')) and pd.notna(row.get('Date')):
            print(f"\n  Row {idx}:")
            print(f"    Col A: {row.get('Unnamed: 0')}")
            print(f"    Col B: {row.get('Unnamed: 1')}")
            print(f"    Col C: {row.get('Unnamed: 2')}")
            print(f"    Col D: {row.get('Unnamed: 3')}")
            print(f"    Date: {row.get('Date')}")
            print(f"    Name: {row.get('Name')}")
            print(f"    Memo: {row.get('Memo')}")
            print(f"    Paid Amount: {row.get('Paid Amount')}")
        elif pd.notna(row.get('Unnamed: 2')) and 'Total' in str(row.get('Unnamed: 2', '')):
            print(f"\n  Row {idx}: Total row - {row.get('Unnamed: 2')}")
            break
