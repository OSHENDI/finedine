-- Rename the untouched demo branch to the venue's name. A branch the owner already renamed is left alone.
UPDATE branches SET name = 'Families Ice', name_ar = 'فاميليز آيس' WHERE slug = 'demo-cafe' AND name_ar = 'الفرع الرئيسي';
