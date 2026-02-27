const fs = require('fs');
let lines = fs.readFileSync('components/Sidebar.tsx', 'utf8').split('\n');

// Find fetchTransactionTags function
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const fetchTransactionTags = async () => {')) {
    console.log(`Found fetchTransactionTags at line ${i+1}`);
    
    // Find the end of this function
    let endIdx = i;
    let braceCount = 0;
    for (let j = i; j < i + 30; j++) {
      if (lines[j].includes('{')) braceCount++;
      if (lines[j].includes('}')) {
        braceCount--;
        if (braceCount === 0) {
          endIdx = j;
          break;
        }
      }
    }
    
    console.log(`Function ends at line ${endIdx+1}`);
    
    // Replace with improved version
    const improvedFunction = [
      '    const fetchTransactionTags = async () => {',
      '      console.log(\'[Sidebar] Loading transaction tags...\')',
      '      const { data, error } = await supabase',
      '        .from(\'common_code_detail\')',
      '        .select(\'code_value, code_name\')',
      '        .eq(\'code_group\', \'TRANSACTION_TAG\')',
      '        .eq(\'use_yn\', \'Y\')',
      '        .order(\'sort_order\', { ascending: true })',
      '',
      '      if (error) {',
      '        console.error(\'[Sidebar] Error loading transaction tags:\', error)',
      '      } else if (data) {',
      '        console.log(\'[Sidebar] Loaded transaction tags:\', data)',
      '        setTransactionTagOptions(data)',
      '      } else {',
      '        console.warn(\'[Sidebar] No transaction tags found\')',
      '      }',
      '    }'
    ];
    
    lines.splice(i, endIdx - i + 1, ...improvedFunction);
    console.log('Updated fetchTransactionTags with logging');
    break;
  }
}

fs.writeFileSync('components/Sidebar.tsx', lines.join('\n'), 'utf8');
console.log('Added logging to transaction tag loader');
