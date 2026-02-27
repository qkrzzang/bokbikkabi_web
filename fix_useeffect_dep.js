const fs = require('fs');
let lines = fs.readFileSync('components/Sidebar.tsx', 'utf8').split('\n');

// Find the useEffect with fetchTransactionTags
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Load transaction tag options from common_code_detail')) {
    console.log(`Found transaction tag useEffect comment at line ${i+1}`);
    
    // Find the end of useEffect
    for (let j = i; j < i + 25; j++) {
      if (lines[j].includes('fetchTransactionTags()')) {
        // Find the closing of useEffect
        for (let k = j; k < j + 5; k++) {
          if (lines[k].includes('}, [])')) {
            console.log(`Found useEffect dependency at line ${k+1}`);
            lines[k] = '  }, [isOpen])';
            console.log('Changed dependency to [isOpen]');
            break;
          }
        }
        break;
      }
    }
    break;
  }
}

// Also add condition to fetch only when sidebar is open
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const fetchTransactionTags = async () => {')) {
    // Add if (isOpen) check before the function call
    for (let j = i; j < i + 25; j++) {
      if (lines[j].trim() === 'fetchTransactionTags()') {
        console.log(`Found fetchTransactionTags call at line ${j+1}`);
        lines[j] = '    if (isOpen) fetchTransactionTags()';
        console.log('Added isOpen check');
        break;
      }
    }
    break;
  }
}

fs.writeFileSync('components/Sidebar.tsx', lines.join('\n'), 'utf8');
console.log('Updated useEffect to load on sidebar open');
