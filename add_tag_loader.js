const fs = require('fs');
let lines = fs.readFileSync('components/Sidebar.tsx', 'utf8').split('\n');

// Find first useEffect
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('useEffect(() => {') && lines[i+1]?.includes('if (!isOpen)')) {
    console.log(`Found first useEffect at line ${i+1}`);
    
    // Find the closing of this useEffect
    let braceCount = 0;
    let endIdx = i;
    for (let j = i; j < i + 20; j++) {
      if (lines[j].includes('{')) braceCount++;
      if (lines[j].includes('}')) braceCount--;
      if (braceCount === 0 && j > i) {
        endIdx = j;
        break;
      }
    }
    
    console.log(`useEffect ends at line ${endIdx+1}`);
    
    // Add new useEffect after this one
    const newUseEffect = [
      '',
      '  // Load transaction tag options from common_code_detail',
      '  useEffect(() => {',
      '    const fetchTransactionTags = async () => {',
      '      const { data, error } = await supabase',
      '        .from(\'common_code_detail\')',
      '        .select(\'code_value, code_name\')',
      '        .eq(\'code_group\', \'TRANSACTION_TAG\')',
      '        .eq(\'use_yn\', \'Y\')',
      '        .order(\'sort_order\', { ascending: true })',
      '',
      '      if (!error && data) {',
      '        setTransactionTagOptions(data)',
      '      }',
      '    }',
      '',
      '    fetchTransactionTags()',
      '  }, [])',
      ''
    ];
    
    lines.splice(endIdx + 1, 0, ...newUseEffect);
    console.log('Added transaction tag loading useEffect');
    break;
  }
}

fs.writeFileSync('components/Sidebar.tsx', lines.join('\n'), 'utf8');
console.log('Successfully added transaction tag loader');
