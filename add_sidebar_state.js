const fs = require('fs');
let lines = fs.readFileSync('components/Sidebar.tsx', 'utf8').split('\n');

// Find line with isGradeTooltipVisible
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('isGradeTooltipVisible') && lines[i].includes('useState')) {
    console.log(`Found isGradeTooltipVisible at line ${i+1}`);
    
    // Add transactionTagOptions state after this line
    const newState = [
      '  const [transactionTagOptions, setTransactionTagOptions] = useState<Array<{',
      '    code_value: string',
      '    code_name: string',
      '  }>>([]) // Transaction tag options from common_code_detail'
    ];
    
    lines.splice(i + 1, 0, ...newState);
    console.log('Added transactionTagOptions state');
    break;
  }
}

fs.writeFileSync('components/Sidebar.tsx', lines.join('\n'), 'utf8');
console.log('Added transaction tag options state');
