const fs = require('fs');
let lines = fs.readFileSync('components/Sidebar.tsx', 'utf8').split('\n');

// Find the transaction tag useEffect
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (isOpen) fetchTransactionTags()')) {
    console.log(`Found fetchTransactionTags call at line ${i+1}`);
    
    // Find the closing of this useEffect
    for (let j = i; j < i + 5; j++) {
      if (lines[j].includes('}, [isOpen])')) {
        console.log(`Found useEffect end at line ${j+1}`);
        
        // Add new useEffect after this one
        const newUseEffect = [
          '',
          '  // Debug: Log transaction tag options',
          '  useEffect(() => {',
          '    console.log(\'[Sidebar] transactionTagOptions updated:\', transactionTagOptions)',
          '  }, [transactionTagOptions])',
          ''
        ];
        
        lines.splice(j + 1, 0, ...newUseEffect);
        console.log('Added debug useEffect');
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('components/Sidebar.tsx', lines.join('\n'), 'utf8');
console.log('Added debug logging for transactionTagOptions');
