const fs = require('fs');
let lines = fs.readFileSync('components/Sidebar.tsx', 'utf8').split('\n');

// Find the transaction_tag display line (around line 762)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('嫄곕옒 援щ텇:') && lines[i+1]?.includes('selectedContract.transaction_tag')) {
    console.log(`Found transaction_tag display at line ${i+2}`);
    
    // Replace the line to show Korean name
    lines[i+1] = "                      <span className={styles.transactionBadge}>";
    lines[i+2] = "                        {selectedContract.transaction_tag === 'SALE' ? '留ㅻℓ' :";
    lines.splice(i+3, 0, "                         selectedContract.transaction_tag === 'LEASE' ? '?꾨?李? :");
    lines.splice(i+4, 0, "                         selectedContract.transaction_tag === 'RENT' ? '?붿꽭' :");
    lines.splice(i+5, 0, "                         selectedContract.transaction_tag === 'JEONSE' ? '?꾩꽭' :");
    lines.splice(i+6, 0, "                         selectedContract.transaction_tag}");
    lines.splice(i+7, 0, "                      </span>");
    
    console.log('Replaced transaction_tag display with Korean conversion');
    break;
  }
}

fs.writeFileSync('components/Sidebar.tsx', lines.join('\n'), 'utf8');
console.log('Transaction tag display updated');
