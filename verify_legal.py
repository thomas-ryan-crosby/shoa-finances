import json

with open('data.json', 'r') as f:
    data = json.load(f)

legal_2025 = [t for t in data['transactions'] if t['year'] == 2025 and 'Legal' in t['category']]
print(f'Legal Fees transactions in 2025: {len(legal_2025)}')
for t in legal_2025:
    print(f"  {t['date']} - {t['vendor']} - ${t['amount']} - Category: {t['category']}")

# Also check all categories for 2025
categories_2025 = {}
for t in data['transactions']:
    if t['year'] == 2025:
        cat = t['category']
        if cat not in categories_2025:
            categories_2025[cat] = []
        categories_2025[cat].append(t)

print(f"\nAll categories in 2025: {len(categories_2025)}")
for cat, trans in sorted(categories_2025.items(), key=lambda x: len(x[1]), reverse=True)[:10]:
    print(f"  {cat}: {len(trans)} transactions")

